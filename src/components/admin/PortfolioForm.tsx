"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Actions,
  Check,
  CheckGrid,
  FilePick,
  Inline,
  Input,
  Radios,
  Row,
  Sep,
} from "@/components/admin/form";
import { Note } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import {
  PORTFOLIO_CATEGORY,
  PORTFOLIO_STATUS,
  USE_YN,
} from "@/data/adminOptions";
import { describeError } from "@/lib/pgError";
import { refreshProjectCount } from "@/lib/projectCountActions";
import {
  EMPTY_DRAFT,
  MAX_MAIN,
  type PortfolioDraft,
  toRow,
  validate,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "../button/Button";

export default function PortfolioForm({
  mode,
  portfolioId,
  initial,
}: {
  mode: "create" | "edit";
  /** edit 일 때 portfolios.id */
  portfolioId?: string;
  initial?: PortfolioDraft;
}) {
  const router = useRouter();
  const [v, setV] = useState<PortfolioDraft>(initial ?? EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PortfolioDraft>(k: K, val: PortfolioDraft[K]) =>
    setV((cur) => ({ ...cur, [k]: val }));

  const isOngoing = v.status === "ongoing";
  const isDone = v.status === "done";

  /* ---- 메인 등록 상한 -----------------------------------------------------
     홈 슬라이드는 MAX_MAIN(3)장이다. 4건째를 걸어 두고 "왜 안 나오지" 하는 것보다
     아예 못 걸게 막는 편이 낫다(사용자 결정) — 체크박스를 비활성으로 둔다.

     ⚠️ 지금 편집 중인 행은 빼고 센다. 안 그러면 이미 메인인 행을 수정하러
     들어왔을 때 자기 자신 때문에 상한에 걸려 체크를 풀 수도 없게 된다.
     null = 아직 못 셌음 — 그때는 막지 않는다(조회 실패로 화면을 잠그지 않는다). */
  const [otherMains, setOtherMains] = useState<number | null>(null);

  const countOtherMains = useCallback(async (): Promise<number | null> => {
    let q = supabase
      .from("portfolios")
      .select("id", { count: "exact", head: true })
      .eq("is_main", true);
    if (portfolioId) q = q.neq("id", portfolioId);
    const { count, error: err } = await q;
    if (err) {
      console.error("[portfolio] 메인 건수 조회 실패:", err.message, err.code);
      return null;
    }
    return count ?? 0;
  }, [portfolioId]);

  useEffect(() => {
    let alive = true;
    countOtherMains().then((n) => {
      if (alive) setOtherMains(n);
    });
    return () => {
      alive = false;
    };
  }, [countOtherMains]);

  /* 이미 메인인 행은 언제나 체크를 풀 수 있어야 하므로 v.is_main 이면 안 막는다 */
  const mainFull =
    !v.is_main && otherMains !== null && otherMains >= MAX_MAIN;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const invalid = validate(v);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError(null);

    /* 폼을 연 뒤 다른 창에서 메인을 채웠을 수 있다 — 저장 직전에 다시 센다.
       완전한 방어는 아니다(이 확인과 저장 사이에도 틈이 있다). 진짜 상한은
       015 의 DB 트리거가 잡는다 — 그때는 아래 insert/update 가 에러를 낸다. */
    if (v.is_main) {
      const n = await countOtherMains();
      if (n !== null && n >= MAX_MAIN) {
        setOtherMains(n);
        setSaving(false);
        setError(
          `메인은 최대 ${MAX_MAIN}건까지입니다. 이미 ${n}건이 등록돼 있어 저장하지 않았습니다.`,
        );
        return;
      }
    }

    const row = toRow(v);

    const { error: err } =
      mode === "create"
        ? await supabase.from("portfolios").insert(row)
        : await supabase.from("portfolios").update(row).eq("id", portfolioId!);

    setSaving(false);
    if (err) {
      setError(describeError(err));
      return;
    }
    /* 전체메뉴 Projects 배지의 캐시를 턴다 — 안 털면 최대 5분간 옛 숫자가 남는다.
       실패해도 저장은 이미 끝났으므로 화면 흐름을 막지 않는다(최대 5분 뒤 자연 갱신). */
    await refreshProjectCount().catch((e) =>
      console.error("[portfolio] 메뉴 배지 캐시 무효화 실패:", e),
    );
    router.push("/admin/portfolio");
    router.refresh();
  };

  return (
    <>
      {error ? <Note warn>{error}</Note> : null}

      <form className={kit.card} onSubmit={onSubmit}>
        <Row
          label="프로젝트명"
          required
          hint="줄을 나누려면 \n 을 넣으세요. 없으면 자동으로 줄바꿈됩니다."
        >
          <Input
            value={v.title}
            onChange={(x) => set("title", x)}
            placeholder="신한 SoL증권\n모바일 웹 리뉴얼"
          />
        </Row>

        <Row
          label="사용여부"
          required
          hint="N 선택 시 프로젝트 목록 화면에 출력하지 않습니다."
        >
          <Radios
            name="use"
            value={v.use_yn}
            onChange={(x) => set("use_yn", x as "Y" | "N")}
            options={USE_YN}
          />
        </Row>

        {/* 여러 개 고를 수 있다(022). 하나만 고르던 드롭다운을 체크박스로 바꿨다 —
            "웹이면서 앱" 인 프로젝트가 /projects 의 Web 칩에서도 Mobile 칩에서도
            나와야 하기 때문이다(사용자 결정, 2026-09-02). */}
        <Row
          label="분류"
          required
          hint="여러 개 선택할 수 있습니다. 선택한 분류의 필터에 모두 노출됩니다."
        >
          <CheckGrid
            options={PORTFOLIO_CATEGORY}
            selected={v.categories}
            allLabel="전체"
            onToggle={(val) =>
              set(
                "categories",
                v.categories.includes(val)
                  ? v.categories.filter((c) => c !== val)
                  : [...v.categories, val],
              )
            }
            onToggleAll={(next) =>
              set("categories", next ? PORTFOLIO_CATEGORY.map((o) => o.value) : [])
            }
          />
        </Row>

        <Row
          label="진행 상태"
          required
          hint="진행 선택 시 고객사 CI · 프로젝트 기간이, 종료 선택 시 썸네일 · HTML 파일명이 필수입니다."
        >
          <Radios
            name="status"
            value={v.status}
            onChange={(x) => set("status", x)}
            options={PORTFOLIO_STATUS}
          />
        </Row>

        <Row label="수상" hint="체크하면 카드에 수상 심볼이 표시됩니다.">
          <Check
            label="수상작"
            checked={v.award}
            onChange={(x) => set("award", x)}
          />
        </Row>

        <Row
          label="메인"
          hint={
            mainFull
              ? `메인은 최대 ${MAX_MAIN}건까지입니다. 다른 포트폴리오의 메인 체크를 먼저 풀어 주세요.`
              : "체크하면 메인 화면에 노출됩니다. 전용 썸네일이 필요합니다."
          }
        >
          <Check
            label="메인 노출"
            checked={v.is_main}
            disabled={mainFull}
            onChange={(x) => set("is_main", x)}
          />
        </Row>

        {/* 메인을 체크했을 때만 나타난다 — 첨부해야 저장된다.

            ⚠️ 체크를 풀어도 이미 올린 URL 은 지우지 않는다. 다시 체크하면 그대로
            돌아오고, 저장할 때 is_main=false 와 함께 남는다. 다른 필드도 같은
            방침이다(진행/종료를 오가며 올려 둔 이미지가 사라지지 않게 — 12번). */}
        {v.is_main ? (
          <Row
            label="썸네일 - 메인"
            required
            hint="메인 화면에 노출됩니다. 카드용 PC 썸네일과 비율이 달라 따로 올립니다."
          >
            <FilePick
              value={v.thumb_main}
              onChange={(url) => set("thumb_main", url)}
              folder="thumb-main"
            />
          </Row>
        ) : null}

        {/* 메인 슬라이드에 걸 제목. 비우면 위의 프로젝트명을 그대로 쓴다.

            ⚠️ 줄바꿈 규칙을 프로젝트명과 **똑같이** 뒀다(역슬래시+n 두 글자). 한 줄
            <input> 은 진짜 개행을 담을 수 없어서 생긴 규칙인데, 여기만 '|' 같은 다른
            구분자를 쓰면 규칙이 둘이 된다. */}
        {v.is_main ? (
          <Row
            label="메인 - title"
            hint="메인 슬라이드에 걸 제목입니다. 비우면 위의 프로젝트명을 씁니다. 줄을 나누려면 \n 을 넣으세요."
          >
            <Input
              value={v.mainTitle}
              onChange={(x) => set("mainTitle", x)}
              placeholder="신한 SoL증권\n모바일 웹 리뉴얼"
            />
          </Row>
        ) : null}

        {/* 메인 슬라이드의 Client / Launch 칸.

            고객사는 client_ci 이미지가 아니라 **텍스트**다 — 진행중 표의 CI 칸과
            다른 자리다(011). Launch 도 프로젝트 기간에서 만들지 않는다:
            진행 프로젝트는 종료일이 없고 표기가 'Jan, 2024' 한 덩어리다. */}
        {v.is_main ? (
          <Row
            label="메인 - Client"
            hint="메인 슬라이드의 Client 칸. 비우면 그 줄이 나오지 않습니다."
          >
            <Input
              value={v.client}
              onChange={(x) => set("client", x)}
              placeholder="신한투자증권"
            />
          </Row>
        ) : null}

        {v.is_main ? (
          <Row
            label="메인 - Launch"
            hint="메인 슬라이드의 Launch 칸. 비우면 그 줄이 나오지 않습니다."
          >
            <Input
              value={v.launch}
              onChange={(x) => set("launch", x)}
              placeholder="Jan, 2024"
            />
          </Row>
        ) : null}

        <Row
          label="썸네일 - PC"
          required={isDone}
          hint="종료 프로젝트의 카드에 노출됩니다. 지금 올려 두고 나중에 종료로 바꿔도 됩니다."
        >
          <FilePick
            value={v.thumb_pc}
            onChange={(url) => set("thumb_pc", url)}
            folder="thumb-pc"
          />
        </Row>

        <Row
          label="썸네일 - 모바일"
          required={isDone}
          hint="종료 프로젝트의 모바일 화면에 노출됩니다."
        >
          <FilePick
            value={v.thumb_mobile}
            onChange={(url) => set("thumb_mobile", url)}
            folder="thumb-mobile"
          />
        </Row>

        <Row
          label="고객사 CI 이미지"
          required={isOngoing}
          hint="진행 프로젝트 표의 고객사 칸에 노출됩니다."
        >
          <FilePick
            value={v.client_ci}
            onChange={(url) => set("client_ci", url)}
            folder="client-ci"
          />
        </Row>

        <Row
          label="프로젝트 기간"
          required={isOngoing}
          hint="YYYYMMDD 형식. 진행 프로젝트 표에 노출됩니다."
        >
          <Inline>
            <Input
              value={v.startedAt}
              onChange={(x) => set("startedAt", x)}
              placeholder="YYYYMMDD"
              size="short"
              maxLength={8}
            />
            <Sep />
            <Input
              value={v.endedAt}
              onChange={(x) => set("endedAt", x)}
              placeholder="YYYYMMDD"
              size="short"
              maxLength={8}
            />
          </Inline>
        </Row>

        <Row
          label="상세화면 폴더명"
          required={isDone}
          hint={
            <>
              퍼블리셔 산출물 폴더를 <code>public/portfolio/</code> 에 넣고{" "}
              <b>폴더 이름만</b> 적습니다 — <code>index.html</code> 은 규칙으로
              붙습니다. 카드를 누르면 이 화면으로 이동합니다.
            </>
          }
        >
          <Input
            value={v.html_file}
            onChange={(x) => set("html_file", x)}
            placeholder="kb-app"
          />
        </Row>

        <Actions>
          <Button
            type="submit"
            label={saving ? "저장 중…" : mode === "create" ? "등록" : "저장"}
            variant="solid"
            color="BLUE"
            size="2"
            radius="medium"
            disabled={saving}
          />
          <Button
            label="취소"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
            onClick={() => router.push("/admin/portfolio")}
          />
        </Actions>
      </form>
    </>
  );
}

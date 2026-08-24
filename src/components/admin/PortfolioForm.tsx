"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Actions,
  Check,
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
  type PortfolioDraft,
  toRow,
  validate,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "../button/Button";
import Dropdown from "../dropdown/Dropdown";
import DropdownTrigger from "../dropdown/DropdownTrigger";
import DropdownContent from "../dropdown/DropdownContent";
import DropdownMenuItem from "../dropdown/DropdownMenuItem";

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

        <Row label="분류" required>
          <Dropdown
            trigger={
              <DropdownTrigger
                width="320px"
                value={v.category || "선택"}
                readOnly
              />
            }
          >
            {(close) => {
              const options = [
                { value: "", label: "선택" },
                ...PORTFOLIO_CATEGORY,
              ];
              return (
                <DropdownContent width="320px">
                  {options.map((o) => (
                    <DropdownMenuItem
                      onClick={() => {
                        set("category", o.value);
                        close();
                      }}
                      key={o.value || "__placeholder"}
                      value={o.value}
                      selected={v.category === o.value}
                    >
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownContent>
              );
            }}
          </Dropdown>
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

        <Row label="메인" hint="체크하면 메인 화면에 노출됩니다. 전용 썸네일이 필요합니다.">
          <Check
            label="메인 노출"
            checked={v.is_main}
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
          label="상세화면 HTML"
          required={isDone}
          hint={
            <>
              퍼블리셔 산출물 폴더를 <code>public/portfolio/</code> 에 넣고 그
              경로를 적습니다. 카드를 누르면 이 화면으로 이동합니다.
            </>
          }
        >
          <Input
            value={v.html_file}
            onChange={(x) => set("html_file", x)}
            placeholder="/heyyoung-1024/index.html"
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

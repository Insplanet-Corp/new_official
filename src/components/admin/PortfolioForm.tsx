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
  SelectBox,
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
import {
  DETAIL_PATH,
  EMPTY_DRAFT,
  type PortfolioDraft,
  toRow,
  validate,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "../button/Button";

/* 포트폴리오 등록 / 수정 폼 (기획서 24~25p, 28p).

   기획서의 핵심 규칙 — 진행 상태에 따라 필수/비활성이 갈린다:
     진행 선택 → 고객사 CI 이미지 + 프로젝트 기간이 필수, 썸네일·HTML 은 미사용
     종료 선택 → 썸네일 PC/모바일 + HTML 파일명이 필수, CI·기간은 미사용
   비활성인 쪽은 저장 시 NULL 로 눕힌다 (toRow) — 상태를 바꿨을 때 반대쪽 값이
   유령처럼 남지 않게 하기 위함이다.

   ⚠️ 이미지는 아직 업로드가 아니라 "경로 입력" 이다. Supabase Storage 를 붙이기
   전까지는 public/assets/... 경로를 그대로 적는다. DB 에는 <img src> 에 들어갈
   문자열만 저장하므로, Storage 로 옮겨도 이 값만 URL 로 바뀌고 화면은 그대로다. */

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
    router.push("/admin/portfolio");
    router.refresh();
  };

  return (
    <>
      {error ? <Note warn>{error}</Note> : null}

      <form className={kit.card} onSubmit={onSubmit}>
        <Row label="프로젝트명" required hint="줄을 나누려면 \n 을 넣으세요. 없으면 자동으로 줄바꿈됩니다.">
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
          <SelectBox
            ariaLabel="분류"
            value={v.category}
            onChange={(x) => set("category", x)}
            options={[{ value: "", label: "선택" }, ...PORTFOLIO_CATEGORY]}
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
          label="썸네일 – PC"
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
          label="썸네일 – 모바일"
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
          label="상세화면 HTML 파일명"
          required={isDone}
          hint={
            <>
              업로드 경로: <code>{DETAIL_PATH}</code>
            </>
          }
        >
          <Inline>
            <Sep>{DETAIL_PATH}</Sep>
            <Input
              value={v.html_file}
              onChange={(x) => set("html_file", x)}
              placeholder="shinhansol_2026.html"
              size="medium"
            />
          </Inline>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Actions,
  FilePick,
  Inline,
  Input,
  Radios,
  Row,
  SelectBox,
  Sep,
} from "@/components/admin/form";
import kit from "@/components/admin/kit.module.css";
import {
  PORTFOLIO_CATEGORY,
  PORTFOLIO_STATUS,
  USE_YN,
} from "@/data/adminOptions";
import Button from "../button/Button";

/* 포트폴리오 등록 / 수정 폼 (기획서 24~25p, 28p).

   기획서의 핵심 규칙 — 진행 상태에 따라 필수/비활성이 갈린다:
     진행 선택 → 고객사 CI 이미지 + 프로젝트 기간이 필수, 썸네일·HTML 파일명은 미사용
     종료 선택 → 썸네일 PC/모바일 + HTML 파일명이 필수, CI·기간은 미사용
   지금은 화면 틀 단계라 활성/비활성만 반영하고, 저장과 얼랏은 다음 단계에서 붙인다. */

/** 상세화면 업로드 경로 — 실제 경로 확정되면 교체 (기획서 25p 9번) */
const DETAIL_PATH = "/com/resource/content/portfolio/detail/";

export type PortfolioValues = {
  name: string;
  use: string;
  category: string;
  status: string;
  thumbPc?: string;
  thumbMobile?: string;
  clientCi?: string;
  startedAt: string;
  endedAt: string;
  htmlFile: string;
};

const EMPTY: PortfolioValues = {
  name: "",
  use: "",
  category: "",
  status: "",
  startedAt: "",
  endedAt: "",
  htmlFile: "",
};

export default function PortfolioForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: PortfolioValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<PortfolioValues>(initial ?? EMPTY);
  const set = <K extends keyof PortfolioValues>(
    k: K,
    val: PortfolioValues[K],
  ) => setV((cur) => ({ ...cur, [k]: val }));

  const isOngoing = v.status === "ongoing";
  const isDone = v.status === "done";

  return (
    <form
      className={kit.card}
      onSubmit={(e) => {
        e.preventDefault();
        // 저장 + 필수값 검증은 다음 단계
      }}
    >
      <Row label="프로젝트명" required>
        <Input
          value={v.name}
          onChange={(x) => set("name", x)}
          placeholder="포트폴리오명"
        />
      </Row>

      <Row
        label="사용여부"
        required
        hint="N 선택 시 프로젝트 목록 화면에 출력하지 않습니다."
      >
        <Radios
          name="use"
          value={v.use}
          onChange={(x) => set("use", x)}
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

      <Row
        label="썸네일 – PC"
        required={isDone}
        hint={isDone ? undefined : "진행 상태를 종료로 선택하면 활성화됩니다."}
      >
        <FilePick preview={v.thumbPc} disabled={!isDone} />
      </Row>

      <Row
        label="썸네일 – 모바일"
        required={isDone}
        hint={isDone ? undefined : "진행 상태를 종료로 선택하면 활성화됩니다."}
      >
        <FilePick preview={v.thumbMobile} disabled={!isDone} />
      </Row>

      <Row
        label="고객사 CI 이미지"
        required={isOngoing}
        hint={
          isOngoing
            ? "PC · 모바일 공통으로 진행중 프로젝트 화면에 출력됩니다."
            : "진행 상태를 진행으로 선택하면 활성화됩니다."
        }
      >
        <FilePick preview={v.clientCi} disabled={!isOngoing} />
      </Row>

      <Row
        label="프로젝트 기간"
        required={isOngoing}
        hint={
          isOngoing
            ? "YYYYMMDD 형식으로 입력합니다."
            : "진행 상태를 진행으로 선택하면 활성화됩니다."
        }
      >
        <Inline>
          <Input
            value={v.startedAt}
            onChange={(x) => set("startedAt", x)}
            placeholder="YYYYMMDD"
            size="short"
            disabled={!isOngoing}
            maxLength={8}
          />
          <Sep />
          <Input
            value={v.endedAt}
            onChange={(x) => set("endedAt", x)}
            placeholder="YYYYMMDD"
            size="short"
            disabled={!isOngoing}
            maxLength={8}
          />
        </Inline>
      </Row>

      <Row
        label="상세화면 HTML 파일명"
        required={isDone}
        hint={
          isDone ? (
            <>
              업로드 경로: <code>{DETAIL_PATH}</code>
            </>
          ) : (
            "진행 상태를 종료로 선택하면 활성화됩니다."
          )
        }
      >
        <Inline>
          <Sep>{DETAIL_PATH}</Sep>
          <Input
            value={v.htmlFile}
            onChange={(x) => set("htmlFile", x)}
            placeholder="shinhansol_2026.html"
            size="medium"
            disabled={!isDone}
          />
        </Inline>
      </Row>

      <Actions>
        <Button
          type="submit"
          label="저장"
          variant="solid"
          color="BLUE"
          size="2"
          radius="medium"
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
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Actions, FilePick, Input, Radios, Row } from "@/components/admin/form";
import kit from "@/components/admin/kit.module.css";
import { USE_YN } from "@/data/adminOptions";
import Button from "../button/Button";

/* 메인관리 등록 / 수정 폼 (기획서 11p · 14p — 두 화면의 항목이 동일해 하나로 쓴다).
   ※ 화면 틀 단계: 저장은 아직 붙지 않았고 필수값 얼랏도 다음 단계에서 연결한다. */

export type MainValues = {
  name: string;
  use: string;
  headline: string;
  subline: string;
  client: string;
  launch: string;
  thumbPc?: string;
  thumbMobile?: string;
};

const EMPTY: MainValues = {
  name: "",
  use: "",
  headline: "",
  subline: "",
  client: "",
  launch: "",
};

export default function MainForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: MainValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<MainValues>(initial ?? EMPTY);
  const set = <K extends keyof MainValues>(k: K, val: MainValues[K]) =>
    setV((cur) => ({ ...cur, [k]: val }));

  return (
    <form
      className={kit.card}
      onSubmit={(e) => {
        e.preventDefault();
        // 저장 + 필수값 검증은 다음 단계
      }}
    >
      <Row label="포트폴리오명" required>
        <Input
          value={v.name}
          onChange={(x) => set("name", x)}
          placeholder="메인에 출력할 포트폴리오명"
        />
      </Row>

      <Row
        label="사용여부"
        required
        hint="Y 선택 시 홈페이지 메인에 출력합니다. Y가 여러 건이면 가장 최근 등록 건이 노출됩니다."
      >
        <Radios
          name="use"
          value={v.use}
          onChange={(x) => set("use", x)}
          options={USE_YN}
        />
      </Row>

      <Row label="상단 문구" required>
        <Input
          value={v.headline}
          onChange={(x) => set("headline", x)}
          placeholder="메인 상단 문구"
        />
      </Row>

      <Row label="하단 문구" required>
        <Input
          value={v.subline}
          onChange={(x) => set("subline", x)}
          placeholder="메인 하단 문구"
        />
      </Row>

      <Row label="클라이언트" required>
        <Input
          value={v.client}
          onChange={(x) => set("client", x)}
          placeholder="메인에 출력할 클라이언트"
          size="medium"
        />
      </Row>

      <Row label="오픈일" required hint="예: Jan,2026">
        <Input
          value={v.launch}
          onChange={(x) => set("launch", x)}
          placeholder="Jan,2026"
          size="short"
        />
      </Row>

      <Row label="썸네일 – PC" required>
        <FilePick preview={v.thumbPc} />
      </Row>

      <Row label="썸네일 – 모바일" required>
        <FilePick preview={v.thumbMobile} />
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
          onClick={() => router.push("/admin/main")}
        />
      </Actions>
    </form>
  );
}

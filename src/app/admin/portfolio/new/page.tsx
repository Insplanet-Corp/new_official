"use client";

import PortfolioForm from "@/components/admin/PortfolioForm";
import { Note, SubHead } from "@/components/admin/ui";
import Button from "@/components/button/Button";

/* 포트폴리오관리 - 등록 (기획서 24~25p) */
export default function PortfolioNewPage() {
  return (
    <>
      <SubHead
        eyebrow="Portfolio"
        title="포트폴리오관리 – 등록"
        desc="진행 또는 종료 프로젝트를 등록합니다."
        actions={
          <Button
            href="/admin/portfolio"
            label="목록"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
          />
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 저장과 필수항목 얼랏은 다음 단계에서 붙입니다. 진행
          상태에 따른 활성/비활성 규칙은 기획서대로 반영해 두었습니다.
        </span>
      </Note>

      <PortfolioForm mode="create" />
    </>
  );
}

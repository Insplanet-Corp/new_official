"use client";

import PortfolioForm from "@/components/admin/PortfolioForm";
import { SubHead } from "@/components/admin/ui";
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

      <PortfolioForm mode="create" />
    </>
  );
}

'use client';

import Link from 'next/link';
import PortfolioForm from '@/components/admin/PortfolioForm';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';

/* 포트폴리오관리 - 등록 (기획서 24~25p) */
export default function PortfolioNewPage() {
  return (
    <>
      <SubHead
        eyebrow="Portfolio"
        title="포트폴리오관리 – 등록"
        desc="진행 또는 종료 프로젝트를 등록합니다."
        actions={
          <Link href="/admin/portfolio" className={kit.btn}>
            목록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 저장과 필수항목 얼랏은 다음 단계에서 붙입니다. 진행 상태에 따른 활성/비활성
          규칙은 기획서대로 반영해 두었습니다.
        </span>
      </Note>

      <PortfolioForm mode="create" />
    </>
  );
}

'use client';

import { use } from 'react';
import Link from 'next/link';
import PortfolioForm from '@/components/admin/PortfolioForm';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';

/* 포트폴리오관리 - 수정 (기획서 28p) — 항목은 등록 화면과 동일 */
export default function PortfolioEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Portfolio"
        title="포트폴리오관리 – 수정"
        desc="등록된 프로젝트 정보를 수정합니다."
        actions={
          <>
            <Link href={`/admin/portfolio/${id}`} className={kit.btn}>
              조회
            </Link>
            <Link href="/admin/portfolio" className={kit.btn}>
              목록
            </Link>
          </>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 기존 데이터 로드와 저장은 다음 단계입니다 (요청 ID: <code>{id}</code>).
        </span>
      </Note>

      <PortfolioForm mode="edit" />
    </>
  );
}

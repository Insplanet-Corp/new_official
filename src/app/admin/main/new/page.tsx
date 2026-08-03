'use client';

import Link from 'next/link';
import MainForm from '@/components/admin/MainForm';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';

/* 메인관리 - 등록 (기획서 11p) */
export default function MainNewPage() {
  return (
    <>
      <SubHead
        eyebrow="Main"
        title="메인관리 – 등록"
        desc="홈페이지 메인에 출력할 항목을 등록합니다."
        actions={
          <Link href="/admin/main" className={kit.btn}>
            목록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 저장과 필수항목 얼랏은 다음 단계에서 붙입니다.
        </span>
      </Note>

      <MainForm mode="create" />
    </>
  );
}

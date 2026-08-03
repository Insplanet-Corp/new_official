'use client';

import { use } from 'react';
import Link from 'next/link';
import UserForm from '@/components/admin/UserForm';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';

/* 사용자관리 - 수정 (기획서 43p) — ID는 수정 불가 */
export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 수정"
        desc="등록된 계정 정보를 수정합니다. ID는 변경할 수 없습니다."
        actions={
          <>
            <Link href={`/admin/users/${id}`} className={kit.btn}>
              조회
            </Link>
            <Link href="/admin/users" className={kit.btn}>
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

      <UserForm mode="edit" />
    </>
  );
}

'use client';

import Link from 'next/link';
import UserForm from '@/components/admin/UserForm';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';

/* 사용자관리 - 등록 (기획서 40p) */
export default function UserNewPage() {
  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 등록"
        desc="어드민에 접근할 계정을 등록합니다."
        actions={
          <Link href="/admin/users" className={kit.btn}>
            목록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — ID 중복확인, 비밀번호 규칙 검증(문자+숫자 6자리 이상), 저장은 다음 단계에서
          붙입니다.
        </span>
      </Note>

      <UserForm mode="create" />
    </>
  );
}

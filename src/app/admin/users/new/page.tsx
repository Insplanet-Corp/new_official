'use client';

import Link from 'next/link';
import UserForm from '@/components/admin/UserForm';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';

/* 사용자관리 - 등록 (기획서 40p)

   ⚠️ 신규 계정 생성은 이 화면에서 끝낼 수 없다.
   계정 자체는 Supabase Auth 에 만들어야 하는데, 브라우저의 anon 키로는
     - auth.admin.createUser  → service_role 키 필요 (403)
     - auth.signUp            → 성공하면 현재 관리자 세션이 새 계정으로 바뀌어 버린다
   둘 다 못 쓴다. 그래서 지금은 순서를 안내하고, 프로필 편집은 수정 화면에서 한다.
   서버 라우트(+ service_role 키)를 두면 이 화면에서 한 번에 처리할 수 있다. */
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

      <Note warn>
        <span>
          <b>신규 계정은 이 화면에서 만들 수 없습니다.</b> 브라우저에 실린 anon 키로는 Auth 계정을
          생성할 수 없기 때문입니다(<code>service_role</code> 키 필요). 지금은 아래 순서로 등록해
          주세요.
          <br />
          <br />
          <b>1.</b> Supabase 대시보드 → Authentication → Users → <b>Add user</b> 로 이메일·비밀번호
          계정 생성
          <br />
          <b>2.</b> SQL Editor 에서 프로필 행 추가 —{' '}
          <code>
            insert into admin_users (id, name, login_id, email, use_yn, permissions) select id,
            &apos;이름&apos;, &apos;아이디&apos;, email, &apos;Y&apos;, &apos;&#123;&#125;&apos; from
            auth.users where email = &apos;...&apos;
          </code>
          <br />
          <b>3.</b> 목록에서 그 계정을 열어 <b>수정</b> 화면에서 전화번호·메뉴권한을 채우면 됩니다.
          <br />
          <br />
          이 화면에서 한 번에 처리하려면 <code>service_role</code> 키를 쓰는 서버 라우트가
          필요합니다. 붙여드릴까요?
        </span>
      </Note>

      {/* 항목 확인용 — 저장 버튼은 비활성 상태다 */}
      <UserForm mode="create" />
    </>
  );
}

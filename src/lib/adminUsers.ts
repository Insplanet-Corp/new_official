/* 사용자관리(admin_users) 도메인 — 목록/조회/수정이 공유하는 타입과 헬퍼.

   로그인은 Supabase Auth 가 처리하고, 이 테이블은 기획서가 요구하지만 Auth 가
   저장하지 않는 항목(사용자명·전화번호·사용여부·메뉴권한)을 담는 1:1 프로필이다.
   스키마: supabase/migrations/001_admin_users.sql */

import type { PostgrestError } from '@supabase/supabase-js';

export type AdminUser = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  login_id: string;
  email: string;
  phone: string | null;
  use_yn: 'Y' | 'N';
  permissions: string[];
};

/** 등록/수정 화면이 다루는 필드 (비밀번호는 Auth 소관이라 여기 없다) */
export type AdminUserProfile = Pick<
  AdminUser,
  'name' | 'login_id' | 'email' | 'phone' | 'use_yn' | 'permissions'
>;

/* 오류 판정은 src/lib/pgError.ts 로 옮겼다 (포트폴리오 등 다른 화면도 쓴다).
   기존 import 경로를 깨지 않으려고 여기서 다시 내보낸다. */
export { describeError, isMissingTable, isPolicyRecursion } from './pgError';

export const MISSING_TABLE_NOTICE =
  'admin_users 테이블이 아직 없습니다. supabase/migrations/001_admin_users.sql 을 Supabase SQL Editor 에서 실행해 주세요.';

/** 메뉴권한 href 목록 -> 화면에 보여줄 라벨 */
export const permissionLabels = (
  permissions: string[],
  tabs: { href: string; label: string }[],
): string =>
  tabs
    .filter((t) => permissions.includes(t.href))
    .map((t) => t.label)
    .join(', ');

/* 계정 삭제 — Auth 계정을 지워야 하므로 service_role 라우트가 대신 한다
   (브라우저의 anon 키로는 auth.admin.deleteUser 가 403).

   ⚠️ 지우는 것은 auth.users 이고 admin_users 프로필은 cascade 로 따라 사라진다.
   ⚠️ 라우트가 두 가지를 막는다 — 본인 계정, 그리고 마지막 사용자관리 권한 계정.
      둘 다 지우면 아무도 어드민에 못 들어가기 때문이다.

   성공하면 null, 실패하면 화면에 그대로 띄울 메시지를 돌려준다. */
export const deleteAdminUser = async (
  supabase: {
    auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> };
  },
  id: string,
): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return '세션이 만료되었습니다. 다시 로그인해 주세요.';

  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.ok) return null;
  const body = await res.json().catch(() => null);
  return body?.error ?? `삭제에 실패했습니다. (HTTP ${res.status})`;
};

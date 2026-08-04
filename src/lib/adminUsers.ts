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

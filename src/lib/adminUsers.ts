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

/* ---------------------------------------------------------------------------
   오류 판정 — 반드시 에러 "코드"로 가른다.

   ⚠️ 메시지 문자열로 매칭하지 말 것. 예전엔
        /does not exist|schema cache|42P01|PGRST205/
      로 잡았는데, 테이블이 생긴 뒤로는 컬럼이 하나만 어긋나도 나는 PGRST204
        "Could not find the 'x' column of 'admin_users' in the schema cache"
      까지 걸려서, 멀쩡한 테이블에 대고 "마이그레이션을 실행하세요" 라는
      엉뚱한 안내를 띄웠다. "column ... does not exist"(42703) 도 마찬가지.
--------------------------------------------------------------------------- */

/** 테이블 자체가 없다 (마이그레이션 미실행) */
export const isMissingTable = (e: PostgrestError | null): boolean =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01');

/** RLS 정책이 자기 테이블을 참조해 무한 재귀한다 (003 마이그레이션 미실행) */
export const isPolicyRecursion = (e: PostgrestError | null): boolean =>
  !!e && e.code === '42P17';

export const MISSING_TABLE_NOTICE =
  'admin_users 테이블이 아직 없습니다. supabase/migrations/001_admin_users.sql 을 Supabase SQL Editor 에서 실행해 주세요.';

export const POLICY_RECURSION_NOTICE =
  'admin_users 의 RLS 정책이 무한 재귀하고 있습니다(42P17). ' +
  'supabase/migrations/003_fix_admin_users_rls_recursion.sql 을 Supabase SQL Editor 에서 실행해 주세요. ' +
  '이미 실행했다면 pg_policies 에 admin_users_write 가 남아 있는지 확인해 주세요.';

/** 화면에 띄울 메시지 — 아는 오류는 해결법까지, 나머지는 원문 그대로 */
export const describeError = (e: PostgrestError): string => {
  if (isPolicyRecursion(e)) return POLICY_RECURSION_NOTICE;
  // 코드가 있으면 같이 보여준다 (없는 채로는 원인 추적이 어렵다)
  return e.code ? `${e.message} (${e.code})` : e.message;
};

/** 메뉴권한 href 목록 -> 화면에 보여줄 라벨 */
export const permissionLabels = (
  permissions: string[],
  tabs: { href: string; label: string }[],
): string =>
  tabs
    .filter((t) => permissions.includes(t.href))
    .map((t) => t.label)
    .join(', ');

/* 사용자관리 API 라우트가 공유하는 서버 전용 헬퍼.

   ⚠️ service_role 키를 쓰는 코드다 — 클라이언트 컴포넌트에서 import 하지 말 것.

   등록(POST /api/admin/users)과 삭제(DELETE /api/admin/users/[id])가 **같은 권한
   검사**를 써야 해서 route.ts 밖으로 뺐다. route.ts 에 두고 export 하면 Next 가
   라우트 파일의 허용되지 않은 export 로 보고 빌드에서 걸린다. */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/** 사용자관리 탭의 href — 이 권한을 가진 계정만 계정을 만들고 지울 수 있다 */
export const USERS_TAB = '/admin/users';

/** Supabase Auth 기본 최소 길이 */
export const MIN_PASSWORD = 6;

export const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** 호출자 본인의 uid. 권한 검사를 통과한 뒤 "자기 자신인가" 판정에 쓴다. */
export type Caller = { id: string };

/* 호출자가 사용자관리 권한을 가진 로그인 계정인지 확인한다.
   실패하면 NextResponse 를, 통과하면 호출자 정보를 돌려준다. */
export async function authorizeCaller(
  admin: SupabaseClient,
  req: Request,
): Promise<NextResponse | Caller> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  if (!token) return fail(401, '로그인이 필요합니다.');

  // 토큰 서명·만료 검증 (service_role 클라이언트로 호출해도 토큰 주인을 돌려준다)
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return fail(401, '세션이 만료되었습니다. 다시 로그인해 주세요.');

  const { data: me, error: meErr } = await admin
    .from('admin_users')
    .select('use_yn, permissions')
    .eq('id', data.user.id)
    .maybeSingle();
  if (meErr) return fail(500, meErr.message);

  if (me) {
    if (me.use_yn !== 'Y') return fail(403, '사용 중지된 계정입니다.');
    if (!(me.permissions as string[]).includes(USERS_TAB)) {
      return fail(403, '사용자관리 권한이 없습니다.');
    }
    return { id: data.user.id };
  }

  /* 부트스트랩 — admin_users 가 완전히 비어 있으면 최초 1명은 만들 수 있어야 한다.
     (쓰기 권한이 '/admin/users' 보유자를 전제하므로 그대로 두면 아무도 못 만든다)
     프로필이 없더라도 Auth 로그인은 통과한 상태이므로 아무나 부를 수는 없다.
     한 명이라도 등록되는 순간 이 경로는 닫힌다. */
  const { count, error: cntErr } = await admin
    .from('admin_users')
    .select('id', { count: 'exact', head: true });
  if (cntErr) return fail(500, cntErr.message);
  if ((count ?? 0) === 0) return { id: data.user.id };

  return fail(403, '등록된 관리자 프로필이 없습니다. 기존 관리자에게 문의해 주세요.');
}

/** authorizeCaller 의 반환이 거절(NextResponse)인지 가른다 */
export const isDenied = (r: NextResponse | Caller): r is NextResponse =>
  r instanceof NextResponse;

/* 사용자관리 — 신규 계정 등록 (기획서 40p)

   브라우저의 anon 키로는 Auth 계정을 만들 수 없다.
     - auth.admin.createUser → service_role 필요 (anon 은 403)
     - auth.signUp           → 성공하면 현재 관리자 세션이 새 계정으로 바뀐다
   그래서 service_role 키를 쥔 이 라우트가 대신 만든다.

   ⚠️ service_role 은 RLS 를 전부 우회한다. 001_admin_users.sql 의 쓰기 정책
   (= '/admin/users' 권한 보유자만)이 여기서는 적용되지 않으므로,
   호출자 권한 검사를 이 파일이 직접 해야 한다 (authorizeCaller). */

import { NextResponse } from 'next/server';
import { ADMIN_TABS } from '@/components/admin/tabs';
import {
  SERVICE_KEY_MISSING,
  createAdminClient,
  hasServiceKey,
} from '@/lib/supabaseAdmin';
import type { SupabaseClient } from '@supabase/supabase-js';

// service_role 키를 쓰므로 Edge 가 아닌 Node 런타임에서, 캐시 없이 돈다.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USERS_TAB = '/admin/users';
const VALID_PERMISSIONS = new Set(ADMIN_TABS.map((t) => t.href));
/** Supabase Auth 기본 최소 길이 */
const MIN_PASSWORD = 6;

type CreateBody = {
  name?: unknown;
  login_id?: unknown;
  email?: unknown;
  phone?: unknown;
  use_yn?: unknown;
  permissions?: unknown;
  password?: unknown;
};

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/* 호출자가 사용자관리 권한을 가진 로그인 계정인지 확인한다.
   실패하면 NextResponse 를, 통과하면 null 을 돌려준다. */
async function authorizeCaller(
  admin: SupabaseClient,
  req: Request,
): Promise<NextResponse | null> {
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
    return null;
  }

  /* 부트스트랩 — admin_users 가 완전히 비어 있으면 최초 1명은 만들 수 있어야 한다.
     (쓰기 권한이 '/admin/users' 보유자를 전제하므로 그대로 두면 아무도 못 만든다)
     프로필이 없더라도 Auth 로그인은 통과한 상태이므로 아무나 부를 수는 없다.
     한 명이라도 등록되는 순간 이 경로는 닫힌다. */
  const { count, error: cntErr } = await admin
    .from('admin_users')
    .select('id', { count: 'exact', head: true });
  if (cntErr) return fail(500, cntErr.message);
  if ((count ?? 0) === 0) return null;

  return fail(403, '등록된 관리자 프로필이 없습니다. 기존 관리자에게 문의해 주세요.');
}

export async function POST(req: Request) {
  if (!hasServiceKey) return fail(503, SERVICE_KEY_MISSING);

  const admin = createAdminClient();

  const denied = await authorizeCaller(admin, req);
  if (denied) return denied;

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return fail(400, '요청 본문을 읽을 수 없습니다.');
  }

  const name = str(body.name);
  const login_id = str(body.login_id);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const password = typeof body.password === 'string' ? body.password : '';
  const use_yn = body.use_yn === 'N' ? 'N' : 'Y';

  if (!name) return fail(400, '사용자명을 입력해 주세요.');
  if (!login_id) return fail(400, '사용자 ID를 입력해 주세요.');
  if (!email) return fail(400, '이메일을 입력해 주세요.');
  if (password.length < MIN_PASSWORD) {
    return fail(400, `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`);
  }

  // 메뉴권한은 ADMIN_TABS 에 있는 href 만 허용한다 (임의 문자열 저장 방지)
  const permissions = Array.isArray(body.permissions)
    ? [...new Set(body.permissions.filter((p): p is string => typeof p === 'string' && VALID_PERMISSIONS.has(p)))]
    : [];

  /* login_id 는 DB 에 unique 제약이 있지만, 먼저 확인해서 Auth 계정만 만들어지고
     프로필 insert 가 깨지는 왕복을 줄인다 (경합은 아래 insert 실패로 잡힌다) */
  const { data: dup, error: dupErr } = await admin
    .from('admin_users')
    .select('id')
    .eq('login_id', login_id)
    .maybeSingle();
  if (dupErr) return fail(500, dupErr.message);
  if (dup) return fail(409, '이미 사용 중인 ID 입니다.');

  // 1) Auth 계정 생성 — 관리자가 만들어 주는 계정이라 이메일 확인은 건너뛴다
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? '계정 생성에 실패했습니다.';
    const dupEmail = /already|exists|registered/i.test(msg);
    return fail(dupEmail ? 409 : 500, dupEmail ? '이미 등록된 이메일입니다.' : msg);
  }

  // 2) 프로필 행 생성
  const { data: profile, error: profileErr } = await admin
    .from('admin_users')
    .insert({
      id: created.user.id,
      name,
      login_id,
      email,
      phone: phone || null,
      use_yn,
      permissions,
    })
    .select()
    .single();

  if (profileErr) {
    /* 롤백 — 프로필 없이 Auth 계정만 남으면 로그인은 되는데 권한이 없는
       유령 계정이 된다. 목록에도 안 보여서 나중에 찾기 어렵다. */
    await admin.auth.admin.deleteUser(created.user.id);
    const dupId = profileErr.code === '23505';
    return fail(dupId ? 409 : 500, dupId ? '이미 사용 중인 ID 입니다.' : profileErr.message);
  }

  return NextResponse.json({ user: profile }, { status: 201 });
}

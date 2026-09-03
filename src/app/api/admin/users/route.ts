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
import {
  MIN_PASSWORD,
  authorizeCaller,
  fail,
  isDenied,
  str,
} from '@/lib/adminUsersApi';

// service_role 키를 쓰므로 Edge 가 아닌 Node 런타임에서, 캐시 없이 돈다.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PERMISSIONS = new Set(ADMIN_TABS.map((t) => t.href));

type CreateBody = {
  name?: unknown;
  login_id?: unknown;
  email?: unknown;
  phone?: unknown;
  use_yn?: unknown;
  permissions?: unknown;
  password?: unknown;
};

export async function POST(req: Request) {
  if (!hasServiceKey) return fail(503, SERVICE_KEY_MISSING);

  const admin = createAdminClient();

  const caller = await authorizeCaller(admin, req);
  if (isDenied(caller)) return caller;

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

  /* 2) 프로필 행 생성 — ⚠️ insert 가 아니라 **upsert** 여야 한다.

     위 createUser 가 auth.users 에 행을 넣는 순간 `on_auth_user_created` 트리거
     (002 / 019 의 handle_new_auth_user)가 admin_users 에 프로필을 **먼저** 만든다
     (login_id 는 이메일 앞부분, permissions 는 빈 배열). 그래서 여기서 insert 를 하면
     같은 id 로 PK 중복(23505 · admin_users_pkey)이 나고, 롤백이 Auth 계정을 지우면서
     그 프로필도 cascade 로 같이 사라져 **아무 흔적도 안 남는다.**

     즉 겹치는 ID 가 하나도 없는데도 등록이 매번 409 로 튕기고, 목록에는 아무 변화가
     없어 원인을 짐작하기 어렵다. 2026-09-03 에 실제로 이 증상으로 신규 계정 등록이
     막혀 있었다(019 로 트리거가 되살아난 뒤부터 — 그 전에는 트리거가 없어 동작했다).

     ⚠️ 트리거를 지워서 풀지 말 것 — 대시보드에서 Auth 계정만 만들었을 때 프로필을
     자동으로 만들어 주는 장치이고, 없으면 "계정 프로필이 없습니다" 화면이 된다
     (019 가 되살린 이유가 그것이다). 트리거가 만든 자리표시 행을 우리 값으로 덮는다. */
  const { data: profile, error: profileErr } = await admin
    .from('admin_users')
    .upsert(
      {
        id: created.user.id,
        name,
        login_id,
        email,
        phone: phone || null,
        use_yn,
        permissions,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (profileErr) {
    /* 롤백 — 프로필 없이 Auth 계정만 남으면 로그인은 되는데 권한이 없는
       유령 계정이 된다. 목록에도 안 보여서 나중에 찾기 어렵다. */
    await admin.auth.admin.deleteUser(created.user.id);
    /* ⚠️ 23505 를 뭉뚱그려 "ID 중복" 으로 옮기지 말 것 — 위 사고가 정확히 그것이었다.
       PK(admin_users_pkey)와 login_id(admin_users_login_id_key)는 원인이 전혀 다르다.
       실제로 겹친 것이 login_id 일 때만 그렇게 안내한다. */
    const detail = `${profileErr.message} ${profileErr.details ?? ''}`;
    const dupId = profileErr.code === '23505' && /login_id/.test(detail);
    return fail(dupId ? 409 : 500, dupId ? '이미 사용 중인 ID 입니다.' : profileErr.message);
  }

  return NextResponse.json({ user: profile }, { status: 201 });
}

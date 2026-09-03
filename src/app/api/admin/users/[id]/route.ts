/* 사용자관리 — 계정 삭제 (기획서 42p)

   브라우저의 anon 키로는 Auth 계정을 지울 수 없어서(auth.admin.deleteUser 는
   service_role 필요) 이 라우트가 대신 지운다. 등록(POST /api/admin/users)과
   같은 권한 검사를 쓴다.

   ⚠️ 지우는 대상은 **auth.users** 다. admin_users.id 가 auth.users(id) 를
   `on delete cascade` 로 참조하므로 프로필은 따라서 사라진다. 프로필만 지우면
   로그인은 되는데 프로필이 없는 유령 계정이 남는다 — 순서를 뒤집지 말 것.

   ⚠️ service_role 은 RLS 를 전부 우회한다. 001 의 쓰기 정책이 여기서는 적용되지
   않으므로 호출자 권한 검사를 이 파일이 직접 해야 한다 (authorizeCaller). */

import { NextResponse } from 'next/server';
import {
  SERVICE_KEY_MISSING,
  createAdminClient,
  hasServiceKey,
} from '@/lib/supabaseAdmin';
import { USERS_TAB, authorizeCaller, fail, isDenied } from '@/lib/adminUsersApi';

// service_role 키를 쓰므로 Edge 가 아닌 Node 런타임에서, 캐시 없이 돈다.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasServiceKey) return fail(503, SERVICE_KEY_MISSING);

  const admin = createAdminClient();

  const caller = await authorizeCaller(admin, req);
  if (isDenied(caller)) return caller;

  const { id } = await params;
  if (!id) return fail(400, '대상 계정이 지정되지 않았습니다.');

  /* ⚠️ 자기 자신은 못 지운다. 지우는 순간 자기 세션이 무효가 되어 화면이 튕기고,
     그 계정이 마지막 관리자였다면 아무도 못 들어가는 상태가 된다. */
  if (id === caller.id) {
    return fail(400, '본인 계정은 삭제할 수 없습니다. 다른 관리자 계정으로 로그인해 주세요.');
  }

  const { data: target, error: targetErr } = await admin
    .from('admin_users')
    .select('id, name, login_id, use_yn, permissions')
    .eq('id', id)
    .maybeSingle();
  if (targetErr) return fail(500, targetErr.message);

  /* ⚠️ 마지막 관리자를 지우지 못하게 막는다.

     사용자관리 화면에 들어올 수 있는 계정은 `use_yn='Y'` 이면서 permissions 에
     '/admin/users' 가 있는 계정뿐이다. 그게 0 이 되면 어드민에서 계정을 만들
     방법이 영영 사라지고, 복구하려면 Supabase 대시보드에서 계정을 새로 만든 뒤
     권한 배열을 SQL 로 직접 넣어야 한다.

     ℹ️ 이 검사는 대상이 실제로 그 자격을 가졌을 때만 의미가 있다 — 권한 없는
        계정을 지우는 것은 남은 관리자 수를 줄이지 않는다. */
  const targetIsAdmin =
    !!target &&
    target.use_yn === 'Y' &&
    (target.permissions as string[]).includes(USERS_TAB);

  if (targetIsAdmin) {
    const { data: admins, error: cntErr } = await admin
      .from('admin_users')
      .select('id, permissions')
      .eq('use_yn', 'Y');
    if (cntErr) return fail(500, cntErr.message);
    const remaining = (admins ?? []).filter(
      (a) =>
        a.id !== id && (a.permissions as string[]).includes(USERS_TAB),
    ).length;
    if (remaining === 0) {
      return fail(
        409,
        '마지막 사용자관리 권한 계정입니다. 이 계정을 지우면 아무도 어드민에 계정을 만들 수 없게 되므로 삭제할 수 없습니다.',
      );
    }
  }

  /* 1) Auth 계정 삭제 — cascade 로 admin_users 프로필도 함께 사라진다.
     이미 없는 계정(404)은 실패로 보지 않는다. 목적은 "그 계정이 없는 상태" 이고,
     프로필만 남은 경우를 아래 2)가 마저 치운다. */
  const { error: authErr } = await admin.auth.admin.deleteUser(id);
  if (authErr && !/not\s*found|does not exist/i.test(authErr.message)) {
    return fail(500, `계정 삭제에 실패했습니다: ${authErr.message}`);
  }

  /* 2) 프로필 정리 — 보통은 1)의 cascade 로 이미 사라졌으므로 아무 일도 하지 않는다.
     ⚠️ 그래도 지우는 이유: FK 가 유실된 환경이 실제로 있었다(2026-09-01 지역 이전 때
     admin_users_id_fkey 가 통째로 없었고 019 가 복원했다). FK 가 없으면 cascade 가
     안 돌아 프로필만 남고, 목록에는 계속 보이는데 로그인은 안 되는 상태가 된다.
     ⚠️ RLS 로 막힌 DELETE 는 조용히 0행을 지운다 — 여기는 service_role 이라
     해당되지 않지만, 실제로 사라졌는지 count 로 확인한다. */
  const { error: profileErr } = await admin
    .from('admin_users')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (profileErr) {
    return fail(
      500,
      `Auth 계정은 지웠지만 프로필 정리에 실패했습니다: ${profileErr.message}`,
    );
  }

  return NextResponse.json({ ok: true, deleted: id }, { status: 200 });
}

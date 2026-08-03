-- ============================================================================
-- auth.users → admin_users 자동 동기화
--
-- 001 에서 admin_users.id 가 auth.users(id) 를 참조하므로 한쪽 방향은 이미 안전하다:
--   · Auth 에 없는 계정은 admin_users 에 넣을 수 없다 (FK)
--   · Auth 계정을 지우면 프로필도 같이 지워진다 (on delete cascade)
--
-- 반대 방향이 비어 있었다. 대시보드에서 Auth 계정만 만들고 프로필 행을 안 넣으면
-- "로그인은 되는데 프로필이 없어 아무 메뉴도 못 보는" 계정이 생긴다.
-- 아래 트리거가 그 구멍을 막는다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 신규 Auth 계정이 생기면 프로필 행을 자동 생성
--
--    login_id 는 이메일 아이디 부분을 쓰되, 이미 있으면 uuid 앞 8자를 붙여 피한다
--    (unique 제약에 걸려 계정 생성 자체가 실패하는 것을 막기 위함).
--    permissions 는 빈 배열 — 새 계정은 기본적으로 아무 메뉴도 볼 수 없고,
--    사용자관리 화면에서 권한을 부여해야 한다 (안전한 기본값).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer            -- admin_users 의 RLS 를 우회해서 써야 한다
set search_path = public
as $$
declare
  base_id text := split_part(new.email, '@', 1);
  final_id text;
begin
  final_id := base_id;
  if exists (select 1 from public.admin_users where login_id = final_id) then
    final_id := base_id || '_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.admin_users (id, name, login_id, email, use_yn, permissions)
  values (new.id, base_id, final_id, new.email, 'Y', '{}')
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2) 이미 있는 Auth 계정 중 프로필이 없는 것 채우기 (backfill)
--    트리거는 앞으로 생길 계정만 처리하므로, 지금 있는 계정은 여기서 메운다.
-- ---------------------------------------------------------------------------
insert into public.admin_users (id, name, login_id, email, use_yn, permissions)
select
  u.id,
  split_part(u.email, '@', 1),
  split_part(u.email, '@', 1) || '_' || substr(u.id::text, 1, 8),
  u.email,
  'Y',
  '{}'
from auth.users u
where not exists (select 1 from public.admin_users a where a.id = u.id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3) 부트스트랩 — 가장 먼저 만들어진 계정에 전체 메뉴 권한 부여
--
--    001 의 쓰기 RLS 정책이 '/admin/users' 권한 보유자만 허용하므로,
--    아무도 권한이 없으면 어드민에서 권한을 줄 수도 없다(닭-달걀).
--    최초 1명만 여기서 SQL 로 풀어 준다. 나머지는 어드민 화면에서 부여하면 된다.
-- ---------------------------------------------------------------------------
update public.admin_users
   set permissions = array[
         '/admin/main', '/admin/portfolio', '/admin/quotes',
         '/admin/recruit', '/admin/users'
       ]
 where id = (select id from public.admin_users order by created_at asc limit 1)
   and not exists (
     select 1 from public.admin_users where '/admin/users' = any (permissions)
   );

-- ---------------------------------------------------------------------------
-- 4) 확인용 — 실행 후 아래를 돌려서 결과를 눈으로 볼 것
--    Auth 계정 수와 프로필 수가 같아야 하고, 권한 보유자가 최소 1명이어야 한다.
-- ---------------------------------------------------------------------------
-- select
--   (select count(*) from auth.users)                                        as auth_계정,
--   (select count(*) from public.admin_users)                                as 프로필,
--   (select count(*) from public.admin_users
--     where '/admin/users' = any (permissions))                              as 사용자관리_권한자;
--
-- select login_id, email, use_yn, permissions from public.admin_users order by created_at;

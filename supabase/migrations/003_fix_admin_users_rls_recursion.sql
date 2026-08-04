-- ============================================================================
-- admin_users RLS 무한 재귀 수정
--
-- 증상: admin_users 를 읽거나 쓰는 모든 요청이 실패한다.
--   ERROR 42P17: infinite recursion detected in policy for relation "admin_users"
--
-- 원인: 001 의 쓰기 정책이 자기 테이블을 조회하는데 FOR ALL 로 걸려 있었다.
--
--   create policy admin_users_write on public.admin_users
--     for all to authenticated                                  -- SELECT 포함!
--     using (exists (select 1 from public.admin_users me ...))   -- 자기 참조
--
--   FOR ALL 은 SELECT 에도 적용된다. 따라서
--     admin_users 를 select
--       → admin_users_write 의 USING 평가
--         → 그 안의 select 가 다시 admin_users 를 읽음
--           → admin_users_write 재평가 → …
--   로 재귀한다. 중복확인·목록·상세·수정은 물론 AdminShell 의 프로필 조회까지
--   전부 같은 에러를 낸다.
--
-- 해결: 권한 판정을 security definer 함수로 옮긴다. 이 함수는 소유자 권한으로
--       실행되어 admin_users 의 RLS 를 타지 않으므로 재귀가 끊긴다.
--       (Supabase 가 자기 참조 정책에 권장하는 패턴)
--       + 쓰기 정책을 INSERT / UPDATE / DELETE 로 좁혀 SELECT 와 분리한다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 권한 판정 함수
--
--    security definer 라 호출자가 아니라 함수 소유자 권한으로 돈다.
--    소유자가 admin_users 의 owner 이므로 RLS 를 우회한다 → 정책 재진입 없음.
--    search_path 를 고정하는 것은 security definer 함수의 필수 방어다
--    (안 하면 호출자가 search_path 를 바꿔 다른 admin_users 를 보게 할 수 있다).
-- ---------------------------------------------------------------------------
create or replace function public.has_admin_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.admin_users
     where id = auth.uid()
       and use_yn = 'Y'              -- 001 에는 없던 조건: 정지된 계정은 쓰기 불가
       and perm = any (permissions)
  );
$$;

-- 로그인한 사용자만 호출할 수 있으면 된다
revoke execute on function public.has_admin_permission(text) from public, anon;
grant  execute on function public.has_admin_permission(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) 문제의 정책을 걷어내고 동작별로 다시 건다
--
--    SELECT 는 001 의 admin_users_select (using true) 가 그대로 담당한다.
--    어드민 계정끼리 서로 보이는 것은 정상이므로 그대로 둔다.
-- ---------------------------------------------------------------------------
drop policy if exists admin_users_write on public.admin_users;

create policy admin_users_insert on public.admin_users
  for insert to authenticated
  with check (public.has_admin_permission('/admin/users'));

create policy admin_users_update on public.admin_users
  for update to authenticated
  using      (public.has_admin_permission('/admin/users'))
  with check (public.has_admin_permission('/admin/users'));

create policy admin_users_delete on public.admin_users
  for delete to authenticated
  using (public.has_admin_permission('/admin/users'));

-- ---------------------------------------------------------------------------
-- 3) 확인 — 실행 후 아래를 돌려 볼 것
-- ---------------------------------------------------------------------------
-- 정책이 4개(select/insert/update/delete)이고 admin_users_write 가 없어야 한다
-- select policyname, cmd, qual is not null as has_using
--   from pg_policies
--  where schemaname = 'public' and tablename = 'admin_users'
--  order by cmd;
--
-- 재귀 없이 읽히는지 (에러 없이 숫자가 나오면 성공)
-- select count(*) from public.admin_users;
--
-- 사용자관리 권한자가 최소 1명 있어야 등록/수정이 가능하다
-- select login_id, email, use_yn, permissions from public.admin_users
--  order by created_at;

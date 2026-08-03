-- ============================================================================
-- 사용자관리 프로필 테이블 (기획서 39~43p)
--
-- 로그인 자체는 Supabase Auth 가 처리한다. 하지만 기획서가 요구하는
--   사용자명 · 전화번호 · 사용여부 · 메뉴권한
-- 은 auth.users 가 저장하지 않으므로, 1:1 로 붙는 프로필 테이블을 둔다.
-- id 가 auth.users(id) 를 그대로 참조하므로 계정이 지워지면 프로필도 지워진다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- ============================================================================

create table if not exists public.admin_users (
  -- auth.users 와 같은 id 를 쓴다 (별도 PK 를 두면 매핑이 어긋날 수 있다)
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  name        text        not null,                    -- 사용자명
  login_id    text        not null unique,             -- 기획서의 "사용자 ID" (중복확인 대상)
  email       text        not null,                    -- Auth 로그인 credential
  phone       text,                                    -- 전화번호
  use_yn      text        not null default 'Y'
                          check (use_yn in ('Y', 'N')), -- 사용여부 (N 이면 로그인 차단)

  -- 메뉴권한: ADMIN_TABS 의 href 를 담는다
  -- 예) '{/admin/main,/admin/portfolio}'
  permissions text[]      not null default '{}'
);

comment on table  public.admin_users            is '어드민 계정 프로필 (auth.users 1:1)';
comment on column public.admin_users.login_id   is '기획서의 사용자 ID. Auth 는 email 로 로그인하므로 표시/검색/중복확인용';
comment on column public.admin_users.permissions is 'src/components/admin/tabs.ts 의 ADMIN_TABS href 목록';

-- updated_at 자동 갱신 -------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists admin_users_touch on public.admin_users;
create trigger admin_users_touch
  before update on public.admin_users
  for each row execute function public.touch_updated_at();

-- 조회 성능 ------------------------------------------------------------------
create index if not exists admin_users_name_idx     on public.admin_users (name);
create index if not exists admin_users_login_id_idx on public.admin_users (login_id);

-- RLS ------------------------------------------------------------------------
-- 어드민에 로그인한 계정만 접근 가능. 쓰기는 '사용자관리' 메뉴권한이 있는 계정만.
alter table public.admin_users enable row level security;

-- 로그인한 사용자는 전체 목록을 볼 수 있다 (어드민 계정끼리는 서로 보이는 게 정상)
drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select to authenticated
  using (true);

-- 쓰기: 본인이 '/admin/users' 권한을 가진 경우만
-- (자기 자신의 권한을 스스로 빼앗는 것도 막지 않으므로, 최소 1명은 항상
--  권한을 유지하도록 운영에서 주의할 것)
drop policy if exists admin_users_write on public.admin_users;
create policy admin_users_write on public.admin_users
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users me
      where me.id = auth.uid() and '/admin/users' = any (me.permissions)
    )
  )
  with check (
    exists (
      select 1 from public.admin_users me
      where me.id = auth.uid() and '/admin/users' = any (me.permissions)
    )
  );

-- ============================================================================
-- 최초 1명 등록 (부트스트랩)
--
-- 위 쓰기 정책은 '/admin/users' 권한을 가진 사람이 최소 1명 있어야 동작한다.
-- 지금 로그인해서 쓰는 계정을 아래처럼 먼저 넣어 둘 것.
-- <이메일> 을 실제 계정 이메일로 바꾸고 실행한다.
-- ============================================================================
-- insert into public.admin_users (id, name, login_id, email, phone, use_yn, permissions)
-- select id, '관리자', 'insplanet01', email, null, 'Y',
--        array['/admin/main','/admin/portfolio','/admin/quotes','/admin/recruit','/admin/users']
--   from auth.users
--  where email = '<이메일>'
-- on conflict (id) do nothing;

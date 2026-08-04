-- ============================================================================
-- 포트폴리오관리 스키마 (기획서 22~25p) + 공개 읽기 RLS
--
-- 기존 public.portfolios 는 id/created_at/title/client/description 만 있는
-- 스텁이었다. 지우지 않고 컬럼을 덧붙인다 — anon 으로는 RLS 때문에 행이
-- 정말 0건인지 확인할 수 없어서, drop 은 위험하다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- 선행: 003 (has_admin_permission 함수를 여기서 재사용한다)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 컬럼 추가
--
--    id 는 uuid 라 기획서 목록의 "No"(129, 128 …)를 표현할 수 없다.
--    → seq 를 따로 둔다. PK 는 uuid 그대로 (공개 URL 에 쓰기 안전하다).
--
--    이미지 컬럼에는 "<img src> 에 그대로 넣을 문자열" 을 저장한다.
--    지금은 /assets/projects/proj-01.png 같은 public/ 경로고, 나중에 Storage 로
--    옮기면 https://…/storage/v1/… 전체 URL 이 들어간다. 화면 코드는 안 바뀐다.
-- ---------------------------------------------------------------------------
alter table public.portfolios
  add column if not exists seq          bigint generated always as identity,
  add column if not exists updated_at   timestamptz not null default now(),
  add column if not exists category     text,       -- Web · Mobile · Consulting
  add column if not exists status       text,       -- ongoing(진행) · done(종료)
  add column if not exists use_yn       text not null default 'N',
  add column if not exists award        boolean not null default false,
  add column if not exists thumb_pc     text,
  add column if not exists thumb_mobile text,
  add column if not exists client_ci    text,
  add column if not exists started_on   date,
  add column if not exists ended_on     date,
  add column if not exists html_file    text;       -- 파일명만. 경로 prefix 는 화면이 붙인다

create unique index if not exists portfolios_seq_idx on public.portfolios (seq);

-- 값 제약. not valid 로 걸어 기존 행(있다면)은 건드리지 않고 신규/수정만 검사한다.
-- ⚠️ check 는 NULL 을 통과시킨다 — 필수 여부는 화면과 라우트에서 막는다.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portfolios_category_chk') then
    alter table public.portfolios add constraint portfolios_category_chk
      check (category in ('Web', 'Mobile', 'Consulting')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'portfolios_status_chk') then
    alter table public.portfolios add constraint portfolios_status_chk
      check (status in ('ongoing', 'done')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'portfolios_use_yn_chk') then
    alter table public.portfolios add constraint portfolios_use_yn_chk
      check (use_yn in ('Y', 'N')) not valid;
  end if;
end $$;

comment on column public.portfolios.title     is '프로젝트명. \n 으로 줄바꿈을 직접 지정할 수 있다(기본은 자동 줄바꿈)';
comment on column public.portfolios.seq       is '기획서 목록의 "No". uuid PK 로는 표현할 수 없어 따로 둔다';
comment on column public.portfolios.html_file is '상세화면 HTML 파일명만. prefix /com/resource/content/portfolio/detail/ 는 화면이 붙인다';
comment on column public.portfolios.client    is '⚠️ 미사용. 진행중 테이블의 고객사 칸은 client_ci 이미지로 그린다';
comment on column public.portfolios.description is '⚠️ 미사용. 스텁 시절 컬럼';

-- updated_at 자동 갱신 (001 이 만든 touch_updated_at 을 재사용)
drop trigger if exists portfolios_touch on public.portfolios;
create trigger portfolios_touch
  before update on public.portfolios
  for each row execute function public.touch_updated_at();

-- 목록/공개 페이지가 쓰는 정렬·필터
create index if not exists portfolios_public_idx
  on public.portfolios (use_yn, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) RLS
--
--    ⚠️ admin_users 와 다르다. 홈페이지(/projects)가 anon 키로 읽어야 하므로
--    authenticated 전용으로 걸면 안 된다 — 걸면 공개 페이지가 빈 화면이 된다.
--    대신 공개되는 것은 사용여부 Y 인 행으로 한정한다.
-- ---------------------------------------------------------------------------
alter table public.portfolios enable row level security;

-- 공개 읽기 — 사용여부 Y 만. 로그인 여부와 무관하다.
drop policy if exists portfolios_public_read on public.portfolios;
create policy portfolios_public_read on public.portfolios
  for select to anon, authenticated
  using (use_yn = 'Y');

-- 어드민 읽기 — 사용여부 N 인 것까지 목록에 보여야 한다
drop policy if exists portfolios_admin_read on public.portfolios;
create policy portfolios_admin_read on public.portfolios
  for select to authenticated
  using (public.has_admin_permission('/admin/portfolio'));

-- 어드민 쓰기 — 003 과 같은 패턴. 정책이 자기 테이블을 참조하지 않으므로
-- 재귀 위험은 없지만, 함수를 쓰는 편이 판정 규칙을 한 곳에 모아 둘 수 있다.
drop policy if exists portfolios_admin_insert on public.portfolios;
create policy portfolios_admin_insert on public.portfolios
  for insert to authenticated
  with check (public.has_admin_permission('/admin/portfolio'));

drop policy if exists portfolios_admin_update on public.portfolios;
create policy portfolios_admin_update on public.portfolios
  for update to authenticated
  using      (public.has_admin_permission('/admin/portfolio'))
  with check (public.has_admin_permission('/admin/portfolio'));

drop policy if exists portfolios_admin_delete on public.portfolios;
create policy portfolios_admin_delete on public.portfolios
  for delete to authenticated
  using (public.has_admin_permission('/admin/portfolio'));

-- ---------------------------------------------------------------------------
-- 3) 확인
-- ---------------------------------------------------------------------------
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'portfolios'
--  order by ordinal_position;
--
-- select policyname, cmd, roles::text from pg_policies
--  where schemaname = 'public' and tablename = 'portfolios' order by cmd;

-- ============================================================================
-- 지역 이전(2026-09-01)으로 새 Supabase 프로젝트로 옮기면서 유실된 것 복원
--
-- 배경 — public 스키마의 **테이블과 데이터**는 잘 넘어왔지만, 다음이 안 넘어왔다:
--   · auth 스키마 (계정 · admin_users 의 FK · 002 동기화 트리거)
--   · storage 버킷과 storage.objects 정책
--   · **마이그레이션 파일이 없는 테이블의 RLS 정책**
--     (quotes · pageviews · downloads · internal_ips — 옛 사이트가 대시보드에서
--      직접 만든 테이블이라 이 저장소에 정의가 없었다. 데이터 임포트가 테이블만
--      만들고 정책은 재현하지 않아 정책이 0개인 채로 RLS 만 켜져 있었다.)
--
-- ⚠️ 그래서 이 파일이 그 테이블들의 **정본 정의**가 된다. 다음에 또 프로젝트를
--    옮길 때 같은 일을 겪지 않으려면 이 파일을 반드시 같이 실행할 것.
--
-- 이미 끝난 것(이 파일에 없음) — 코드에서 API 로 처리했다:
--   · 버킷 3개 생성 (portfolio 50MB공개 / brief 50MB공개 PDF전용 / recruit 50MB비공개)
--     ⚠️ 016 은 brief 를 60MB 로 만들려 했으나 프로젝트 전역 업로드 한도(50MB)에
--        걸려 413 이 난다. 50MB 로 낮췄다 — 실제 파일은 18.7MB 라 여유가 있다.
--   · portfolio 이미지 89개 + 회사소개서 PDF 를 옛 프로젝트에서 복사
--   · portfolios 의 Storage URL 89개를 새 프로젝트 ref 로 치환 (updated_at 보존)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run.
--       ⚠️ 드래그로 일부만 선택된 상태면 그것만 실행된다 — 선택 해제하고 Run.
-- 선행: 003 (has_admin_permission)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) quotes — 견적문의
--
--    ⚠️ 이게 유실돼서 **Contact 문의하기 버튼이 전부 실패하고 있었다.**
--       ContactForm.tsx / MobileContactForm.tsx 가 anon 키로 직접 insert 한다.
--
--    읽기/수정을 메뉴권한으로 좁힌다. 옛 프로젝트에서는 로그인만 하면 누구나
--    읽을 수 있었지만(포트폴리오·리크루트와 달리 권한 검사가 없었다), 견적문의는
--    회사명·담당자·연락처가 들어 있어 같은 기준을 적용하는 편이 맞다.
--    ⚠️ '/admin/quotes' 권한이 없는 계정은 목록이 **빈 채로** 뜬다(에러 아님).
-- ---------------------------------------------------------------------------
alter table public.quotes enable row level security;

-- 접수 — 누구나 (로그인하지 않은 방문자가 문의를 넣는다)
drop policy if exists quotes_public_insert on public.quotes;
create policy quotes_public_insert on public.quotes
  for insert to anon, authenticated
  with check (true);

-- 조회 — 견적문의관리 권한이 있는 어드민만
drop policy if exists quotes_admin_read on public.quotes;
create policy quotes_admin_read on public.quotes
  for select to authenticated
  using (public.has_admin_permission('/admin/quotes'));

-- 수정 — 같은 권한 (진행상태 변경 · 관리자 메모)
drop policy if exists quotes_admin_update on public.quotes;
create policy quotes_admin_update on public.quotes
  for update to authenticated
  using      (public.has_admin_permission('/admin/quotes'))
  with check (public.has_admin_permission('/admin/quotes'));


-- ---------------------------------------------------------------------------
-- 2) pageviews · downloads — 방문자 분석
--
--    ⚠️ **anon insert 정책을 만들지 않는다.** 기록은 브라우저가 아니라 Edge
--       Function `track` 이 service_role 로 넣는다(RLS 우회). anon 에게 insert 를
--       열면 사무실 IP 제외 로직을 우회해 아무나 조회수를 부풀릴 수 있다.
--
--    읽기만 연다 — /admin/analytics 화면이 브라우저에서 직접 집계한다.
-- ---------------------------------------------------------------------------
alter table public.pageviews enable row level security;

drop policy if exists pageviews_admin_read on public.pageviews;
create policy pageviews_admin_read on public.pageviews
  for select to authenticated
  using (public.has_admin_permission('/admin/analytics'));

alter table public.downloads enable row level security;

drop policy if exists downloads_admin_read on public.downloads;
create policy downloads_admin_read on public.downloads
  for select to authenticated
  using (public.has_admin_permission('/admin/analytics'));

-- ---------------------------------------------------------------------------
-- 3) internal_ips — 사무실 IP 제외 목록
--
--    ⚠️ **정책을 하나도 만들지 않는다.** 앱 코드는 이 테이블을 읽지도 쓰지도
--       않는다(전수 확인). Edge Function `track` 만 service_role 로 읽으므로
--       RLS 만 켜 두면 된다 — 정책 0개 + RLS on = service_role 외 전면 차단.
--       여기에 select 를 열면 사무실 IP 대역이 REST 로 공개된다.
-- ---------------------------------------------------------------------------
alter table public.internal_ips enable row level security;


-- ---------------------------------------------------------------------------
-- 4) storage.objects 정책 — 006 · 016 · 018 의 정책 부분 재적용
--
--    버킷 자체는 이미 만들어져 있다(코드에서 Storage API 로 생성).
--    ⚠️ 새 프로젝트에서는 SQL Editor 의 `insert into storage.buckets` 가
--       조용히 안 먹는 경우가 있다 — 버킷은 대시보드나 API 로 만들 것.
-- ---------------------------------------------------------------------------

-- portfolio — 공개 읽기 / 포트폴리오관리 권한자만 쓰기
drop policy if exists "portfolio images are public" on storage.objects;
create policy "portfolio images are public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'portfolio');

drop policy if exists "portfolio upload by admin" on storage.objects;
create policy "portfolio upload by admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio'));

drop policy if exists "portfolio update by admin" on storage.objects;
create policy "portfolio update by admin" on storage.objects
  for update to authenticated
  using      (bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio'))
  with check (bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio'));

drop policy if exists "portfolio delete by admin" on storage.objects;
create policy "portfolio delete by admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio'));

-- brief — 공개 읽기 / 회사소개서관리 권한자만 쓰기
--   ⚠️ update 정책이 반드시 있어야 한다. 같은 경로에 upsert 로 덮어쓰므로
--      insert 만 열면 두 번째 업로드부터 실패한다.
drop policy if exists "brief is public" on storage.objects;
create policy "brief is public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'brief');

drop policy if exists "brief upload by admin" on storage.objects;
create policy "brief upload by admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brief' and public.has_admin_permission('/admin/brief'));

drop policy if exists "brief update by admin" on storage.objects;
create policy "brief update by admin" on storage.objects
  for update to authenticated
  using      (bucket_id = 'brief' and public.has_admin_permission('/admin/brief'))
  with check (bucket_id = 'brief' and public.has_admin_permission('/admin/brief'));

drop policy if exists "brief delete by admin" on storage.objects;
create policy "brief delete by admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brief' and public.has_admin_permission('/admin/brief'));

-- recruit — **비공개**. 지원자는 올리기만, 읽기는 리크루트관리 권한자만
--   ⚠️ select 를 anon 에게 열지 말 것. 이력서는 개인 자료다.
--      어드민 화면은 createSignedUrl 로 그때그때 짧은 주소를 만든다.
drop policy if exists "recruit upload by applicant" on storage.objects;
create policy "recruit upload by applicant" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'recruit');

drop policy if exists "recruit read by admin" on storage.objects;
create policy "recruit read by admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'recruit' and public.has_admin_permission('/admin/recruit'));

drop policy if exists "recruit delete by admin" on storage.objects;
create policy "recruit delete by admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recruit' and public.has_admin_permission('/admin/recruit'));


-- ---------------------------------------------------------------------------
-- 5) admin_users ↔ auth.users 연결 복원 (001 의 FK + 002 의 동기화 트리거)
--
--    데이터 임포트가 admin_users 를 FK 없이 먼저 만들어 버려서, 001 의
--    `create table if not exists` 가 통째로 건너뛰어졌다 → FK 유실.
--    그 탓에 Auth 계정 없는 프로필이 그대로 남아 있을 수 있었다.
--
--    ⚠️ 아래 FK 는 **고아 프로필이 하나라도 있으면 실패한다**(23503).
--       실패하면 먼저 이걸로 찾아서 정리할 것:
--         select a.login_id, a.email from public.admin_users a
--           left join auth.users u on u.id = a.id where u.id is null;
-- ---------------------------------------------------------------------------
alter table public.admin_users drop constraint if exists admin_users_id_fkey;
alter table public.admin_users
  add constraint admin_users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- 대시보드에서 Auth 계정만 만들었을 때 프로필을 자동 생성 (002 와 동일)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_id  text := split_part(new.email, '@', 1);
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
-- 6) 확인
-- ---------------------------------------------------------------------------
-- 정책이 붙었는지
--   select tablename, policyname, cmd from pg_policies
--    where schemaname in ('public','storage')
--      and (tablename in ('quotes','pageviews','downloads','internal_ips')
--           or policyname ~ '^(portfolio|brief|recruit)')
--    order by tablename, cmd;
--
-- FK · 트리거
--   select conname from pg_constraint where conrelid = 'public.admin_users'::regclass;
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--
-- 고아 프로필이 없는지
--   select a.login_id from public.admin_users a
--     left join auth.users u on u.id = a.id where u.id is null;

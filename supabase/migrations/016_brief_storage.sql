-- ============================================================================
-- 회사소개서(Company Brief) PDF 업로드용 Storage 버킷
--
-- 어드민 '회사소개서관리'(/admin/brief) 에서 PDF 를 올리면 마케팅 페이지의
-- Company Brief Download 버튼 4곳(전체메뉴 PC/모바일, Contact 히어로 PC/모바일)이
-- 곧바로 새 파일을 받는다. 배포가 필요 없다.
--
-- ⚠️ 파일은 **고정 경로 하나**(brief/insplanet_brief.pdf)에 계속 덮어쓴다.
--    그래야 공개 URL 이 안 변해서 사이트 코드가 상수 하나로 끝나고, 옛 파일이
--    쌓여 저장 용량을 먹지도 않는다. 대신 upsert 가 되어야 하므로 update 정책이
--    반드시 필요하다(insert 만 열어 두면 두 번째 업로드부터 실패한다).
--
-- ⚠️ public 버킷이다 — 로그인 없이 받아야 하므로. URL 을 아는 사람은 누구나
--    받을 수 있다. 회사소개서는 어차피 공개 자료라 문제없다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 003(has_admin_permission).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 버킷
--   file_size_limit    : 60MB. 지금 파일은 14MB 다. 194MB 짜리 무압축 원본이
--                        실수로 올라가는 것을 막는다(무료 플랜 전송량 5GB 를
--                        원본 26번이면 다 쓴다).
--   allowed_mime_types : PDF 만. 어드민 화면의 accept 는 화면 제한일 뿐이라
--                        여기서 한 번 더 막는다.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brief', 'brief', true, 62914560, array['application/pdf'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 읽기 — 누구나 (사이트 방문자가 받아야 한다)
-- ---------------------------------------------------------------------------
drop policy if exists "brief is public" on storage.objects;
create policy "brief is public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'brief');

-- ---------------------------------------------------------------------------
-- 쓰기 — 회사소개서관리 권한이 있는 어드민만
--
-- ⚠️ '/admin/brief' 권한은 새로 생긴 것이라 **기존 계정에는 없다.**
--    사용자관리에서 각 계정에 체크해 주기 전에는 업로드가 거부된다(정상 동작).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'brief';
-- select policyname, cmd from pg_policies where tablename = 'objects' and policyname like 'brief%';

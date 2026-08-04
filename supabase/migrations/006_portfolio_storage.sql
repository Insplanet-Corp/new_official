-- ============================================================================
-- 포트폴리오 이미지 업로드용 Storage 버킷
--
-- 썸네일 PC/모바일 · 고객사 CI 를 어드민에서 직접 올린다.
-- 버킷은 public 이다 — 마케팅 페이지(/projects)가 로그인 없이 이미지를 받아야
-- 하기 때문이다. 서명 URL 을 쓰면 만료 관리가 필요하고 CDN 캐시도 못 탄다.
--
-- ⚠️ public 버킷이므로 URL 을 아는 사람은 누구나 볼 수 있다. 포트폴리오
--    이미지는 어차피 공개될 자료라 문제없지만, 비공개 자료는 여기 올리지 말 것.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 003(has_admin_permission).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------------
-- 읽기 — 누구나 (공개 페이지가 받아야 한다)
-- ---------------------------------------------------------------------------
drop policy if exists "portfolio images are public" on storage.objects;
create policy "portfolio images are public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'portfolio');

-- ---------------------------------------------------------------------------
-- 쓰기 — 포트폴리오 메뉴 권한이 있는 어드민만
--
-- 003 의 has_admin_permission 을 그대로 쓴다. security definer 라
-- admin_users 의 RLS 를 타지 않으므로 여기서도 재귀 걱정이 없다.
-- ---------------------------------------------------------------------------
drop policy if exists "portfolio upload by admin" on storage.objects;
create policy "portfolio upload by admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio')
  );

drop policy if exists "portfolio update by admin" on storage.objects;
create policy "portfolio update by admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio')
  )
  with check (
    bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio')
  );

drop policy if exists "portfolio delete by admin" on storage.objects;
create policy "portfolio delete by admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portfolio' and public.has_admin_permission('/admin/portfolio')
  );

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select id, name, public from storage.buckets where id = 'portfolio';
-- select policyname, cmd, roles::text from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and policyname like 'portfolio%' order by cmd;

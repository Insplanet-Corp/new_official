-- ============================================================================
-- 리크루트관리 스키마 (기획서 35~36p) — Careers 입사지원 접수함
--
-- Contact 페이지 > Join us > 채용확인 > Careers 팝업(.rc-modal / .mr-popup)이
-- 여기에 넣는다. 어드민 '/admin/recruit' 이 읽는다.
--
-- ⚠️ 컬럼은 **폼이 실제로 받는 것만** 이다 (2026-08-26 사용자 결정).
--    기획서 35p 목록에 있던 기술등급 · 경력 · 재직상태는 Careers 폼이 받지
--    않으므로 만들지 않았다. "폼이 우선, 어드민이 폼을 따라간다."
--    나중에 폼에 그 항목이 생기면 컬럼과 필터를 그때 같이 추가할 것 —
--    **지금 미리 nullable 로 만들어 두면 항상 '-' 만 나오는 죽은 칸이 된다.**
--
-- ⚠️ 지원분야(field)에는 칩에 적힌 **한글 문자열이 그대로** 들어간다
--    (quotes.project_fields 와 같은 규칙). 값의 원본은 src/data/contact.ts 의
--    RECRUIT_ROLES 이고, 어드민 필터도 거기서 파생시킨다(adminOptions.ts).
--    영문 슬러그로 따로 정의하면 필터가 아무것도 못 거른다 — 견적문의에서
--    실제로 겪었던 문제다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 003(has_admin_permission).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 테이블
--
--    id 는 클라이언트가 만들어서 보낸다(crypto.randomUUID). 첨부파일을
--    recruit/<id>/<파일명> 에 **먼저** 올리고 그 id 로 행을 넣기 때문이다 —
--    그래야 행에서 Storage 경로를 되짚을 수 있다.
-- ---------------------------------------------------------------------------
create table if not exists public.recruits (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text        not null,
  field      text,                    -- 지원분야. RECRUIT_ROLES 의 한글 문자열
  phone      text,
  email      text,
  url        text,                    -- 포트폴리오 URL (선택)
  file_path  text,                    -- recruit 버킷 안의 키. 공개 URL 이 아니다
  file_name  text,                    -- 지원자가 올린 원래 파일명 (표시·다운로드용)
  file_size  bigint
);

comment on table  public.recruits           is 'Careers 입사지원 접수함. 어드민 /admin/recruit 이 읽는다';
comment on column public.recruits.field     is '지원분야. src/data/contact.ts RECRUIT_ROLES 의 한글 문자열 그대로';
comment on column public.recruits.file_path is '비공개 recruit 버킷의 키. 어드민이 서명 URL 로만 받는다 — 공개 URL 이 아니다';

create index if not exists recruits_list_idx on public.recruits (created_at desc);
create index if not exists recruits_field_idx on public.recruits (field);

-- ---------------------------------------------------------------------------
-- 2) RLS
--
--    ⚠️ portfolios 와 반대다. 공개 페이지가 **쓰기만** 하고 **읽지 않는다.**
--    지원서는 개인정보라 anon 에게 select 를 열면 안 된다 — 열면 이름 ·
--    연락처 · 이메일이 REST 로 통째로 새어 나간다.
-- ---------------------------------------------------------------------------
alter table public.recruits enable row level security;

-- 접수 — 누구나 (로그인하지 않은 지원자가 넣는다)
drop policy if exists recruits_public_insert on public.recruits;
create policy recruits_public_insert on public.recruits
  for insert to anon, authenticated
  with check (true);

-- 조회 — 리크루트관리 권한이 있는 어드민만
drop policy if exists recruits_admin_read on public.recruits;
create policy recruits_admin_read on public.recruits
  for select to authenticated
  using (public.has_admin_permission('/admin/recruit'));

-- 삭제 — 같은 권한 (화면에는 아직 버튼이 없다. 스팸 정리를 대시보드에서 할 때 쓴다)
drop policy if exists recruits_admin_delete on public.recruits;
create policy recruits_admin_delete on public.recruits
  for delete to authenticated
  using (public.has_admin_permission('/admin/recruit'));

-- ---------------------------------------------------------------------------
-- 3) 첨부파일 Storage — **비공개** 버킷
--
--    ⚠️ portfolio · brief 버킷과 다르게 public = false 다. 이력서는 개인
--       자료라 URL 을 아는 사람이 받을 수 있으면 안 된다. 어드민 조회 화면이
--       createSignedUrl 로 짧게 유효한 주소를 그때그때 만든다.
--
--    file_size_limit : 50MB. Careers 폼의 안내 문구("최대 50MB")와 같은 값이다.
--                      화면 검사는 우회할 수 있으므로 여기서 한 번 더 막는다.
--    allowed_mime_types : **제한하지 않는다.** 이력서는 pdf · docx · hwp · zip 등
--                      형식이 제각각이고, hwp 는 브라우저마다 MIME 이 다르거나
--                      빈 문자열로 올라와 정상 지원서가 거부된다.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('recruit', 'recruit', false, 52428800)
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;

-- 업로드 — 누구나. 지원자가 로그인 없이 올린다
--   ⚠️ 익명 업로드라 스팸 여지가 있다. 버킷 용량 상한과 위 file_size_limit 이
--      유일한 방어선이다. 접수가 이상하게 늘면 Edge Function 경유로 바꿀 것.
drop policy if exists "recruit upload by applicant" on storage.objects;
create policy "recruit upload by applicant" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'recruit');

-- 읽기 — 리크루트관리 권한이 있는 어드민만 (서명 URL 발급도 이 정책을 탄다)
drop policy if exists "recruit read by admin" on storage.objects;
create policy "recruit read by admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'recruit' and public.has_admin_permission('/admin/recruit'));

drop policy if exists "recruit delete by admin" on storage.objects;
create policy "recruit delete by admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recruit' and public.has_admin_permission('/admin/recruit'));

-- ---------------------------------------------------------------------------
-- 4) 확인
-- ---------------------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
--  where table_schema='public' and table_name='recruits' order by ordinal_position;
-- select policyname, cmd, roles::text from pg_policies
--  where schemaname='public' and tablename='recruits' order by cmd;
-- select id, public, file_size_limit from storage.buckets where id='recruit';

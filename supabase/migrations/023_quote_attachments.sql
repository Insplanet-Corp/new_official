-- ============================================================================
-- 견적문의 첨부파일 (2026-09-02)
--
-- Contact 문의 폼에는 **처음부터 파일첨부 칸이 있었는데 그 파일이 아무 데도 가지
-- 않았다** — quotes 에 컬럼이 없어 PC/모바일 두 폼이 조용히 버렸다(에러도 안 났다).
-- 이 마이그레이션이 그 파일을 실제로 받아 어드민이 내려받을 수 있게 한다.
--
-- 구성은 018(recruits)과 똑같다 — 컬럼 3개 + **비공개** 버킷 + "업로드 → insert"
-- 순서. 다른 점은 열람 기록(020)이 붙는다는 것 하나뿐이다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 003(has_admin_permission) · 020.
-- (022 는 포트폴리오 다중 분류 — 서로 무관하므로 순서를 가리지 않는다.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 컬럼
--
--    ⚠️ 컬럼을 추가하기 **전** 의 DB 에 file_* 를 보내면 PGRST204 로 문의 접수가
--       통째로 실패한다. 그래서 lib/quotes.ts 의 submitQuote 는 첨부가 있을 때만
--       이 키들을 실어 보내고, 그래도 PGRST204 가 나면 첨부 없이 한 번 더 넣는다
--       ("문의는 접수되되 파일만 빠지는" 쪽이 "접수 자체가 안 되는" 쪽보다 낫다).
-- ---------------------------------------------------------------------------
alter table public.quotes add column if not exists file_path text;
alter table public.quotes add column if not exists file_name text;
alter table public.quotes add column if not exists file_size bigint;

comment on column public.quotes.file_path is '비공개 quote 버킷의 키. 어드민이 서명 URL 로만 받는다 — 공개 URL 이 아니다';
comment on column public.quotes.file_name is '의뢰인이 올린 원래 파일명(NFC). 표시·다운로드 파일명으로 쓴다';

-- ---------------------------------------------------------------------------
-- 2) Storage — **비공개** 버킷
--
--    ⚠️ portfolio · brief 와 다르게 public = false 다. 의뢰인의 기획서 · 견적
--       요청서라 URL 을 아는 사람이 받을 수 있으면 안 된다.
--
--    ⚠️ 새 Supabase 프로젝트에서는 SQL Editor 의 insert 로 버킷이 **안 만들어진다**
--       (2026-09-01 지역 이전 때 006·016·018 이 전부 그랬다). 이 프로젝트에는
--       'quote' 버킷이 이미 Storage API 로 만들어져 있어 아래 문장은 갱신만 한다.
--       버킷이 없는 환경이라면 대시보드나 Storage API 로 **먼저 만들 것.**
--
--    allowed_mime_types 는 제한하지 않는다 — 기획서가 pdf · docx · hwp · zip 등
--    제각각이고, hwp 는 브라우저마다 MIME 이 비어 오기도 해서 정상 문의가 막힌다.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('quote', 'quote', false, 52428800)
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;

-- 업로드 — 누구나. 의뢰인이 로그인 없이 올린다
--   ⚠️ 익명 업로드라 스팸 여지가 있다. 위 file_size_limit 과 버킷 용량이 방어선이다.
drop policy if exists "quote upload by client" on storage.objects;
create policy "quote upload by client" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'quote');

-- 읽기 — 견적문의관리 권한이 있는 어드민만 (서명 URL 발급도 이 정책을 탄다)
drop policy if exists "quote read by admin" on storage.objects;
create policy "quote read by admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'quote' and public.has_admin_permission('/admin/quotes'));

drop policy if exists "quote delete by admin" on storage.objects;
create policy "quote delete by admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'quote' and public.has_admin_permission('/admin/quotes'));

-- ---------------------------------------------------------------------------
-- 3) 열람 기록에 'file' 을 추가 (020)
--
--    첨부파일도 개인정보다 — 누가 언제 받아 갔는지 CSV 와 같은 표에 남긴다.
--    ⚠️ 사유는 요구하지 않는다. reason 제약은 action = 'download' 에만 걸려
--       있으므로 아래 상수만 늘리면 된다(제약 문장은 손대지 않는다).
--
--    020 의 action 검사는 **이름 없는 인라인 check** 라 환경마다 자동 생성된
--    이름이 다를 수 있다. 그래서 이름으로 지우지 않고 정의로 찾아 지운다.
-- ---------------------------------------------------------------------------
do $$
declare c text;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class     rel on rel.oid = con.conrelid
      join pg_namespace ns  on ns.oid  = rel.relnamespace
     where ns.nspname = 'public'
       and rel.relname = 'quote_access_logs'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) like '%action%'
       and pg_get_constraintdef(con.oid) not like '%reason%'
  loop
    execute format('alter table public.quote_access_logs drop constraint %I', c);
  end loop;
end $$;

alter table public.quote_access_logs
  add constraint quote_access_logs_action_check
  check (action in ('view', 'download', 'file'));

-- ---------------------------------------------------------------------------
-- 4) 확인
-- ---------------------------------------------------------------------------
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='quotes' and column_name like 'file%';
-- select id, public, file_size_limit from storage.buckets where id='quote';
-- select policyname, cmd from pg_policies
--  where schemaname='storage' and tablename='objects' and policyname like 'quote %';
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname='quote_access_logs_action_check';

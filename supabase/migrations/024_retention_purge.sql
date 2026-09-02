-- ============================================================================
-- 개인정보 보유기간 파기 (2026-09-02)
--
-- 개인정보처리방침(src/data/legal.ts)이 이미 공개적으로 약속한 보유기간을 실제로
-- 지키기 위한 준비다.
--     견적 문의  : 접수 후 1년
--     입사 지원  : 제출 후 3년
-- 「개인정보 보호법」 제21조는 보유기간이 지나면 **지체 없이** 파기하도록 하고,
-- 제30조는 방침에 적은 대로 처리할 의무를 지운다. 지금까지는 삭제 수단이 아예
-- 없어서 방침과 구현이 어긋나 있었다.
--
-- 실제 파기는 두 곳에서 일어난다 —
--   ① 어드민 조회 화면의 [삭제] 버튼 (사람이 지금 지운다)
--   ② /api/retention (Vercel cron, 하루 한 번, service_role)
-- 둘 다 **파일 먼저, 행 나중** 순서로 지운다(lib/retention.ts).
--
-- 이 SQL 이 하는 일은 하나뿐이다: 파기도 열람 기록에 남길 수 있게 action 에
-- 'purge' 를 더한다. 테이블·정책은 이미 020·023 에 있다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 020 · 023.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- action 에 'purge' 추가
--
-- ⚠️ 023 과 같은 이유로 **이름이 아니라 정의로 찾아 지운다** — 020 의 검사가
--    이름 없는 인라인 check 라 자동 생성 이름이 환경마다 다를 수 있다.
--
-- ⚠️ 사유(reason)는 'download' 에만 필수다. 파기에도 사유를 받지만(어드민 화면이
--    입력을 요구한다) DB 제약으로는 강제하지 않는다 — cron 이 남기는 자동 파기
--    기록까지 막히면 안 되기 때문이다(그쪽은 고정 문구를 채워 넣는다).
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
  check (action in ('view', 'download', 'file', 'purge'));

comment on column public.quote_access_logs.action is
  'view=조회, download=CSV 내보내기, file=첨부 다운로드, purge=파기(수동/자동)';

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname = 'quote_access_logs_action_check';
-- select action, count(*) from public.quote_access_logs group by action;

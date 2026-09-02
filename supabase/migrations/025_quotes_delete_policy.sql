-- ============================================================================
-- 견적문의 삭제 정책 (2026-09-02) — 024 의 빠진 조각
--
-- 증상: 어드민 견적문의 조회 화면에서 [삭제] 를 눌러도 **아무 일도 안 일어난다.**
--       에러도 안 뜨고 목록으로 돌아가는데 그 문의가 그대로 있다.
--
-- 원인: `quotes` 에 **DELETE 정책이 아예 없다.** 019 가 정의한 것은
--       insert(anon) · select(어드민) · update(어드민) 셋뿐이고, 021 이 옛
--       느슨한 정책들을 지우면서 delete 를 허용하던 것도 같이 사라졌다.
--       `recruits` 에는 018 이 recruits_admin_delete 를 만들어 뒀는데
--       quotes 에는 짝이 없었다 — 그래서 입사지원만 삭제가 됐다.
--
-- ⚠️ **RLS 로 막힌 DELETE 는 에러를 내지 않는다.** 그냥 0행이 지워지고
--    `204 No Content` 가 돌아온다(실측: 본문 빈 배열, Prefer: count=exact 를
--    붙여야 `content-range: */0` 로 드러난다). 그래서 화면은 성공으로 알고
--    목록으로 이동했다 — 조용히 실패하는 전형적인 경우다.
--    lib/retention.ts 가 이제 count 로 실제 삭제 건수를 확인한다.
--
-- ℹ️ /api/retention(cron)의 자동 파기는 **service_role 이라 RLS 를 우회**해서
--    이 구멍이 있어도 정상 동작했다. 그래서 검증에서도 안 드러났다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 003(has_admin_permission) · 019.
-- ============================================================================

-- 삭제 — 견적문의관리 권한이 있는 어드민만 (recruits_admin_delete 와 같은 모양)
--   ⚠️ 첨부파일 쪽 정책은 이미 023 이 만들어 뒀다("quote delete by admin").
--      행과 파일 **둘 다** 열려 있어야 파기가 끝까지 간다.
drop policy if exists quotes_admin_delete on public.quotes;
create policy quotes_admin_delete on public.quotes
  for delete to authenticated
  using (public.has_admin_permission('/admin/quotes'));

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select policyname, cmd, roles::text from pg_policies
--  where schemaname='public' and tablename='quotes' order by cmd;
--   → insert / select / update / delete 네 개가 나와야 한다.

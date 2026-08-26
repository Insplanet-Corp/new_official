-- ============================================================================
-- 옛 사이트(Vue SPA, Develop/Company/official) 전용 테이블 정리
--
-- ⚠️⚠️ **도메인을 새 사이트로 갈아끼운 뒤에 실행할 것.** ⚠️⚠️
--    지금 insplanet.co.kr 에 떠 있는 옛 사이트가 이 테이블들에 여전히 쓰고 있다.
--    교체 전에 실행하면 옛 사이트의 문의 폼이 500 을 뱉는다.
--
-- 지우는 것 --------------------------------------------------------------
--   contacts          옛 문의 폼. 새 사이트의 quotes 가 같은 역할을 한다.
--                     2건 들어 있었는데 둘 다 테스트였다(회사명 'ttt' / '1층 참치집',
--                     test@ 주소, 메시지 '1121212' / '문의'). 옮길 실데이터 없음.
--   brochure_history  옛 소개서 업로드 이력(1건). 새 어드민에는 이력 기능이 없고,
--                     파일은 Storage 의 brief 버킷이 들고 있다.
--
-- 남기는 것 (지우지 말 것) ------------------------------------------------
--   pageviews         865건. 방문 분석 데이터. 어드민에 접속자수 화면을 붙일 때
--                     그대로 쓴다 — 지우면 기존 통계가 끊긴다.
--   internal_ips      사무실 IP 목록. 위 집계에서 내부자를 제외하는 데 쓴다.
--   downloads         소개서 다운로드 기록. 유입경로가 남아 있어 쓸모가 있다
--                     (실제로 www.jobkorea.co.kr 유입 기록이 있다).
--   ⚠️ 이 셋은 Supabase Edge Function `track` 이 service_role 로 기록한다.
--      함수는 Supabase 에 배포돼 있어 저장소를 갈아끼워도 남는다. 새 사이트가
--      호출하지 않으므로 기록만 자연히 멈춘다.
--
-- 실행 전 백업 권장 (무료 플랜에는 자동 백업이 없다):
--   select * from public.contacts;          -- 결과를 CSV 로 내려받아 둘 것
--   select * from public.brochure_history;
-- ============================================================================

drop table if exists public.contacts cascade;
drop table if exists public.brochure_history cascade;

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select table_name from information_schema.tables
--  where table_schema = 'public' order by table_name;
--   -> admin_users, downloads, internal_ips, pageviews, portfolios, quotes 만 남아야 한다

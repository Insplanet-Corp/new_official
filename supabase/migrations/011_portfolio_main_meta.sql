-- ============================================================================
-- 메인 슬라이드가 쓰는 두 값 — 고객사명(텍스트)과 Launch
--
-- 홈 "Our Projects" 슬라이드는 [프로젝트명 / Client / Launch / 이미지] 를 그린다.
-- 그런데 포트폴리오에는 그 두 값이 없었다:
--   * 고객사는 client_ci **이미지**만 있다(진행중 표의 CI 칸). 텍스트가 없다.
--   * 기간은 started_on/ended_on 이지만 슬라이드 표기는 'Jan, 2024' 한 덩어리다.
--     진행 프로젝트는 ended_on 이 비어 있을 수 있어 날짜에서 만들 수도 없다.
--
-- client 는 004 때부터 있던 스텁 컬럼인데 **39행 전부 NULL 인 것을 확인**하고
-- 원래 의미대로(고객사명) 되살린다. 새 컬럼을 만들지 않는다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 010.
-- ============================================================================

alter table public.portfolios
  add column if not exists launch text;

comment on column public.portfolios.client is
  '고객사명 텍스트. 홈 메인 슬라이드의 Client 칸.
   ⚠️ 진행중 표의 고객사 칸은 여전히 client_ci 이미지다 — 둘은 다른 자리다.
   004 에서 "미사용" 으로 적어 뒀던 스텁 컬럼을 원래 의미로 되살린 것(011)';

comment on column public.portfolios.launch is
  '홈 메인 슬라이드의 Launch 표기 (예: Jan, 2024).
   started_on/ended_on 에서 만들지 않는다 — 진행 프로젝트는 종료일이 없다';

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
select seq, title, client, launch, is_main, thumb_main
  from public.portfolios where is_main order by seq desc;

-- ============================================================================
-- 005 가 넣었던 시드 더미 포트폴리오 15행 삭제
--
-- 왜 --------------------------------------------------------------------
--   005_portfolios_seed.sql 이 화면 확인용으로 넣은 가짜 데이터다.
--   제목이 "마이데이터 서비스 구축" "통합 고객 포털 리뉴얼" 처럼 예시 문구이고,
--   썸네일이 저장소 안 파일(/images/projects/thumb-XX.png)을 가리킨다.
--   실데이터 46행은 전부 Supabase Storage URL 을 쓴다.
--
--   이 15행이 사라져야 public/images/projects/thumb-*.png (20장, 약 23MB)와
--   public/assets/projects/table-logo*.png 을 저장소에서 지울 수 있다.
--   ⚠️ **순서: 이 SQL 먼저, 파일 삭제 나중.** 반대로 하면 어드민 목록에
--      깨진 썸네일이 남는다.
--
-- 삭제 조건을 이렇게 잡은 이유 --------------------------------------------
--   ⚠️ **created_at 을 조건으로 쓰면 안 된다.** 시드와 같은 날(2026-08-04)에
--      만들어진 실데이터가 섞여 있다 — "신한은행 HeyYoung Campus"(공개·메인).
--      날짜로 지우면 그 행까지 날아간다.
--   그래서 "썸네일이 저장소 안 로컬 경로를 가리키는가" 하나로만 판정한다.
--   2026-09-04 실측: 이 조건에 정확히 15행이 걸리고, 전부 use_yn='N',
--   is_main 인 행은 0개다.
--
-- 안전 확인 (2026-09-04 실측) ---------------------------------------------
--   · 대상 15행이 참조하는 Storage 파일: 0건 → 지워도 고아 파일이 안 생긴다
--   · 대상 중 html_file 이 있는 행(onNuri·shinhan·dap·dap): 같은 값을 가진
--     **공개 실데이터 행이 각각 따로 있다** → 상세가 사라지지 않는다
--   · 삭제 후 남는 행: 46개 (전부 use_yn='Y')
--
-- ⚠️ 실행 전에 백업을 권한다 — 무료 플랜에는 자동 백업이 없다.
--    아래 1) 미리보기 결과를 CSV 로 내려받아 두면 충분하다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 미리보기 — 15행이 나오고 전부 use_yn='N' 이어야 한다
-- ---------------------------------------------------------------------------
select id, title, use_yn, is_main, html_file, thumb_pc, client_ci, created_at
  from public.portfolios
 where thumb_pc like '/images/%'
    or client_ci like '/assets/%'
 order by created_at;

-- ---------------------------------------------------------------------------
-- 2) 삭제 — 안전장치가 붙어 있다
--
--    대상이 15행이 아니거나, 공개(use_yn='Y')·메인 행이 하나라도 걸리면
--    **아무것도 지우지 않고 멈춘다.** 그런 경우는 실데이터가 로컬 경로를
--    쓰고 있다는 뜻이므로 조건을 다시 봐야 한다.
-- ---------------------------------------------------------------------------
do $$
declare
  n_total int;
  n_risky int;
begin
  select count(*) into n_total
    from public.portfolios
   where thumb_pc like '/images/%' or client_ci like '/assets/%';

  select count(*) into n_risky
    from public.portfolios
   where (thumb_pc like '/images/%' or client_ci like '/assets/%')
     and (use_yn = 'Y' or is_main is true);

  if n_risky > 0 then
    raise exception
      '중단: 대상 중 공개(use_yn=Y)이거나 메인인 행이 %건 있습니다. 조건을 다시 확인하세요.',
      n_risky;
  end if;

  if n_total <> 15 then
    raise exception
      '중단: 대상이 15행이어야 하는데 %행입니다. 미리보기로 무엇이 걸리는지 먼저 확인하세요.',
      n_total;
  end if;

  delete from public.portfolios
   where thumb_pc like '/images/%' or client_ci like '/assets/%';

  raise notice '시드 더미 %행을 삭제했습니다.', n_total;
end $$;

-- ---------------------------------------------------------------------------
-- 3) 확인
-- ---------------------------------------------------------------------------
--   · 남은 행 46, 공개 46, 로컬 경로 0 이어야 한다
select
  count(*)                                                              as 전체,
  count(*) filter (where use_yn = 'Y')                                  as 공개,
  count(*) filter (where is_main is true)                               as 메인,
  count(*) filter (where thumb_pc like '/images/%'
                      or client_ci like '/assets/%')                    as 로컬경로_잔존
  from public.portfolios;

-- ============================================================================
-- 시드 포트폴리오의 썸네일을 Figma 그리드 세트로 교체
--
-- 정적 사이트(../insplanet)가 assets/projects/proj-01~11.png 를 지우고
-- images/projects/thumb-01~20.png (Figma 1653:1090 그리드 세트) 로 갈아탔다.
-- 저장소에도 public/images/projects/thumb-*.png 로 같이 옮겨 왔으므로 DB 의
-- 시드 행도 새 경로를 가리키게 한다. 정적 사이트와 같은 순서(1→11)로 붙인다.
--
-- ⚠️ 005 가 넣은 값 그대로인 행만 고친다 — 어드민에서 사람이 바꿔 넣은
--    Storage URL 은 건드리지 않는다.
--
-- ⚠️ 이 11건은 여전히 시드다. 이름·이미지·수상 여부가 서로 무관한 더미이므로
--    담당자에게 실제 포트폴리오 목록을 받아 통째로 갈아엎어야 한다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 004 · 005.
-- ============================================================================

update public.portfolios
   set thumb_pc     = replace(thumb_pc,     '/assets/projects/proj-', '/images/projects/thumb-'),
       thumb_mobile = replace(thumb_mobile, '/assets/projects/proj-', '/images/projects/thumb-')
 where thumb_pc     like '/assets/projects/proj-%'
    or thumb_mobile like '/assets/projects/proj-%';

-- ---------------------------------------------------------------------------
-- 확인 — 남아 있는 옛 경로가 0 건이어야 한다
-- ---------------------------------------------------------------------------
-- select count(*) from public.portfolios
--  where thumb_pc like '/assets/projects/proj-%'
--     or thumb_mobile like '/assets/projects/proj-%';

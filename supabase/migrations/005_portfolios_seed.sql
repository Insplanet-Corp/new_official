-- ============================================================================
-- 포트폴리오 시드 — 지금 /projects 에 쓰이는 이미지로 채운다
--
-- ⚠️ 이건 실데이터가 아니다. 지금 화면의 40장은 src/data/projectsPage.ts 의
--    buildCards() 가 시드 RNG 로 "생성" 한 것이고(이미지 11개·이름 15개 풀에서
--    무작위 조합, 수상 22% 확률), 이름과 이미지 사이에 아무 관계가 없다.
--    여기서는 그중 중복 없이 11건만 골라 넣는다. 담당자에게 실제 목록을 받으면
--    어드민에서 갈아엎을 것.
--
-- 이미지는 DB 에 넣지 않는다. public/assets/projects/*.png 를 Next 가 그대로
-- 서빙하고, DB 에는 <img src> 에 들어갈 경로 문자열만 담는다.
-- 나중에 Storage 로 옮기면 이 값만 전체 URL 로 바뀌고 화면 코드는 그대로다.
--
-- 실행: 004 다음. 이미 행이 있으면 건너뛴다(재실행 안전).
-- ============================================================================

do $$
begin
  if exists (select 1 from public.portfolios) then
    raise notice '포트폴리오에 이미 행이 있어 시드를 건너뜁니다.';
    return;
  end if;

  -- 종료 프로젝트 — 카드 그리드에 뜬다
  -- title 의 \n 은 화면에서 줄바꿈된다. E'' 문자열이라야 실제 개행이 들어간다.
  insert into public.portfolios
    (title, category, status, use_yn, award, thumb_pc, thumb_mobile, started_on, ended_on)
  values
    (E'신한 SoL증권\n모바일 웹 리뉴얼',     'Mobile',     'done', 'Y', true,
     '/assets/projects/proj-01.png', '/assets/projects/proj-01.png', '2025-10-15', '2026-05-14'),
    (E'모바일 뱅킹 앱\nUX 리뉴얼',          'Mobile',     'done', 'Y', false,
     '/assets/projects/proj-02.png', '/assets/projects/proj-02.png', '2025-03-01', '2025-11-30'),
    (E'핀테크 간편결제\n서비스',            'Mobile',     'done', 'Y', false,
     '/assets/projects/proj-03.png', '/assets/projects/proj-03.png', '2024-06-01', '2025-02-28'),
    (E'모빌리티 예약\n플랫폼',              'Mobile',     'done', 'Y', true,
     '/assets/projects/proj-04.png', '/assets/projects/proj-04.png', '2024-09-01', '2025-06-30'),
    (E'글로벌 이커머스\n브랜드몰 구축',      'Web',        'done', 'Y', false,
     '/assets/projects/proj-05.png', '/assets/projects/proj-05.png', '2025-01-10', '2025-09-30'),
    (E'기업 브랜드\n사이트 구축',           'Web',        'done', 'Y', false,
     '/assets/projects/proj-06.png', '/assets/projects/proj-06.png', '2024-11-01', '2025-04-30'),
    (E'라이프스타일\n커머스 플랫폼',         'Web',        'done', 'Y', true,
     '/assets/projects/proj-07.png', '/assets/projects/proj-07.png', '2025-02-01', '2025-10-31'),
    (E'미디어 콘텐츠\n포털 리뉴얼',          'Web',        'done', 'Y', false,
     '/assets/projects/proj-08.png', '/assets/projects/proj-08.png', '2024-04-01', '2024-12-20'),
    (E'교육 콘텐츠\nLMS 구축',              'Web',        'done', 'Y', false,
     '/assets/projects/proj-09.png', '/assets/projects/proj-09.png', '2025-05-01', '2026-01-31'),
    (E'AI 추천 커머스\n플랫폼 컨설팅',       'Consulting', 'done', 'Y', true,
     '/assets/projects/proj-10.png', '/assets/projects/proj-10.png', '2025-07-01', '2026-03-31'),
    (E'물류 관리 시스템\n컨설팅',            'Consulting', 'done', 'Y', false,
     '/assets/projects/proj-11.png', '/assets/projects/proj-11.png', '2024-08-01', '2025-05-31');

  -- 진행 프로젝트 — 표로 뜬다. 고객사 칸은 client_ci 이미지로 그려진다
  -- (기획서대로 고객사"명" 텍스트 필드는 없다. img 의 alt 는 프로젝트명을 쓴다.)
  insert into public.portfolios
    (title, category, status, use_yn, client_ci, started_on, ended_on)
  values
    ('KB스타뱅킹 앱 UX 고도화', 'Mobile',     'ongoing', 'Y',
     '/assets/projects/table-logo.png', '2026-05-01', '2026-12-31'),
    ('차세대 여신 시스템 구축',  'Consulting', 'ongoing', 'Y',
     '/assets/projects/table-logo.png', '2026-03-15', '2027-09-30'),
    ('통합 고객 포털 리뉴얼',    'Web',        'ongoing', 'Y',
     '/assets/projects/table-logo.png', '2026-08-01', '2027-02-28'),
    ('마이데이터 서비스 구축',   'Web',        'ongoing', 'Y',
     '/assets/projects/table-logo.png', '2026-04-01', '2026-11-30');
end $$;

-- ---------------------------------------------------------------------------
-- 확인 — 종료 11건 · 진행 4건, 전부 use_yn='Y'
-- ---------------------------------------------------------------------------
-- select seq, status, category, use_yn, award, replace(title, E'\n', ' / ') as 프로젝트명
--   from public.portfolios order by seq;
--
-- anon 이 실제로 읽을 수 있는지 (공개 페이지가 이 경로로 읽는다)
-- begin;
--   set local role anon;
--   select count(*) from public.portfolios;   -- 15 가 나와야 한다
-- rollback;

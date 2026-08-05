-- ============================================================================
-- 상세화면 HTML 의미 변경 — 파일명 → Storage 공개 URL
--
-- 기획서(25p)는 퍼블리셔가 만든 HTML 을 웹서버의
--   /com/resource/content/portfolio/detail/<파일명>
-- 에 두고 파일명만 저장하는 방식이었다. Vercel 계열 배포에서는 빌드 산출물이
-- 불변이라 파일을 나중에 못 넣는다 — 상세 페이지 하나 추가할 때마다 재배포가
-- 강제되고, 그러면 어드민에서 콘텐츠를 완결할 수 없다.
--
-- → 퍼블리셔 산출물 폴더를 저장소의 public/portfolio/<폴더>/ 에 그대로 넣고,
--   html_file 에는 사이트 내부 경로를 담는다:
--     /portfolio/heyyoung-1024/index.html
--   컬럼은 그대로 쓰고 의미만 바꾼다 (기존 값이 전부 NULL 이라 이관 불필요).
--
-- Storage 에 올리는 방식도 만들어 봤다가 접었다. 산출물이 파일 하나가 아니라
-- 폴더(index.html + css/ + img/)이고 서로를 상대경로로 참조하는데, Storage 에
-- 올리면 프록시가 그 상대경로를 전부 절대 URL 로 고쳐 써야 한다. 정규식으로는
-- 인라인 style 의 url()·srcset·JS 로 조립하는 경로를 못 잡아 산출물 형태에 따라
-- 조용히 깨진다. 폴더째 두면 경로가 저절로 맞으므로 그 문제가 사라진다.
-- 대신 상세 페이지 추가마다 배포가 필요하다 — 만드는 사람이 퍼블리셔라
-- 받아들일 만하다고 판단했다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 004.
-- ============================================================================

-- 예전 방식으로 파일명만 들어간 값이 있으면 비운다.
-- (/portfolio/ 로 시작하지 않는 값은 화면이 거부하므로 남겨 둘 이유가 없다)
update public.portfolios
   set html_file = null
 where html_file is not null
   and html_file not like '/portfolio/%';

comment on column public.portfolios.html_file is
  '상세화면 HTML 의 사이트 내부 경로 (예: /portfolio/heyyoung-1024/index.html).
   기획서의 "파일명 + 고정 경로" 에서 의미가 바뀌었다 — 008 참고.
   폴더는 저장소의 public/portfolio/ 아래에 둔다';

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select seq, title, html_file from public.portfolios
--  where html_file is not null order by seq;

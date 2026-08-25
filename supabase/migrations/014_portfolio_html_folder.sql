-- ============================================================================
-- html_file 을 "폴더명 하나" 로 정규화
--
-- 지금까지는 '/kb-app/index.html' 처럼 파일명까지 적어 저장했다(37건 전부).
-- 상세는 언제나 그 폴더의 index.html 이므로 파일명은 규칙으로 붙이면 된다 —
-- 어드민에는 폴더 이름만 입력한다(사용자 결정, 2026-08-25).
--
--   '/kb-app/index.html'  ->  'kb-app'
--
-- ⚠️ 이 마이그레이션은 **선택 사항**이다. src/lib/portfolios.ts 의
--    toDetailFolder() 가 옛 표기도 그대로 받아 주므로, 안 돌려도 화면은 멀쩡하다.
--    다만 어드민 목록/폼이 보여 주는 값과 DB 값이 어긋난 채로 남는다.
--    (다음에 그 행을 저장하면 그때 폴더명으로 눕는다)
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 008.
-- ============================================================================

-- ⚠️ 표기만 바꾸는 것이라 "등록/수정일" 이 오늘로 밀리면 안 된다.
--    012 의 WHEN 가드는 sort_order 만 걸러 주므로 여기서는 트리거를 잠깐 끈다.
alter table public.portfolios disable trigger portfolios_touch;

-- 앞의 '/' 와 'portfolio/' 접두를 떼고, 마지막 '/<파일명>.html' 조각을 떼어 낸다.
-- 결과가 여전히 '/' 를 품고 있으면(중첩 경로) 손대지 않는다 — 사람이 봐야 한다.
update public.portfolios
   set html_file = folder
  from (
    select id,
           regexp_replace(
             regexp_replace(
               regexp_replace(html_file, '^/+', ''),   -- 앞의 '/'
               '^portfolio/', ''                       -- 'portfolio/' 접두
             ),
             '/[^/]*\.html?$', '', 'i'                 -- 끝의 '/index.html'
           ) as folder
      from public.portfolios
     where html_file is not null and html_file <> ''
  ) norm
 where norm.id = public.portfolios.id
   and norm.folder <> ''
   and norm.folder not like '%/%'
   and norm.folder is distinct from public.portfolios.html_file;

-- ---------------------------------------------------------------------------
-- 깨진 링크 하나 교정 — 'BasSid' 인데 실제 폴더는 'bassId' 다.
--
-- macOS 는 파일시스템이 대소문자를 구분하지 않아 로컬에서는 멀쩡히 열린다.
-- Vercel(리눅스)에 올리면 이 카드만 404 가 난다. 2026-08-25 에 37건을 디스크의
-- public/portfolio/ 와 대조해서 찾았고, 어긋난 것은 이 하나뿐이었다.
-- ---------------------------------------------------------------------------
update public.portfolios
   set html_file = 'bassId'
 where html_file in ('BasSid', '/BasSid/index.html', 'BasSid/index.html');

alter table public.portfolios enable trigger portfolios_touch;

comment on column public.portfolios.html_file is
  'public/portfolio/ 아래 상세 산출물 **폴더명 하나** (예: kb-app).
   파일명(index.html)은 붙이지 않는다 — 화면이 규칙으로 붙인다(lib/portfolios.ts 의 detailSrc).
   ⚠️ 이 값과 실제 폴더명은 대소문자까지 같아야 한다. macOS 는 대소문자를 구분하지
   않아 로컬에서는 통과하지만 Vercel(리눅스)에서는 404 가 난다.';

-- ---------------------------------------------------------------------------
-- 확인 — 값이 폴더명 하나로 남았는지
-- ---------------------------------------------------------------------------
-- select seq, html_file from public.portfolios
--  where html_file is not null order by sort_order;

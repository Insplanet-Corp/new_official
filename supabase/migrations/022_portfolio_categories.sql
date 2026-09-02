-- ============================================================================
-- 포트폴리오 분류를 다중 선택으로 (Web · Mobile · Consulting 복수 체크)
--
-- 배경: 004 의 category 는 text 한 칸이라 한 프로젝트에 분류를 하나만 걸 수
-- 있었다. 실제로는 "웹이면서 앱" 인 프로젝트가 있고, /projects 필터 칩에서
-- Web 을 눌러도 Mobile 을 눌러도 나와야 한다(사용자 결정, 2026-09-02).
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run
-- 선행: 004 (category 컬럼을 백필 원본으로 읽는다), 012 (portfolios_touch 가
--       WHEN 가드를 갖고 있다 — 아래 disable/enable 주석 참고)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 컬럼 추가
--
--    빈 배열을 기본값으로 둔다. NULL 과 '{}' 두 가지 "없음" 이 섞이면 읽는 쪽이
--    매번 둘 다 처리해야 한다.
-- ---------------------------------------------------------------------------
alter table public.portfolios
  add column if not exists categories text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------------
-- 2) 백필 — 기존 단일 분류를 한 칸짜리 배열로
--
--    ⚠️ portfolios_touch 를 잠깐 끈다. 표기만 바꾸는 작업인데 목록의 수정일이
--    전부 오늘로 밀리면 안 된다(014 에서 같은 이유로 껐다).
--    012 의 WHEN 가드(to_jsonb(old) - 'sort_order' - 'updated_at' 비교)로는
--    막을 수 없다 — categories 값이 실제로 바뀌므로 가드가 통과시킨다.
-- ---------------------------------------------------------------------------
alter table public.portfolios disable trigger portfolios_touch;

update public.portfolios
   set categories = array[category]
 where category is not null
   and cardinality(categories) = 0;

alter table public.portfolios enable trigger portfolios_touch;

-- ---------------------------------------------------------------------------
-- 3) 값 제약
--
--    <@ 는 "부분집합". 004 의 category check 와 같은 화이트리스트다.
--    ⚠️ 값을 늘리면 TS 의 CATEGORY_VALUES(src/lib/portfolios.ts)도 같이 늘릴 것 —
--    SQL 은 그 상수를 못 읽는다.
--
--    "하나 이상" 은 여기서 막지 않는다. 백필로 '{}' 가 되는 행(category 가
--    NULL 이던 옛 행)이 실제로 있고, 그걸 제약으로 막으면 그 행은 다른 필드
--    수정조차 못 한다. 필수 여부는 어드민 폼의 validate 가 본다.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portfolios_categories_chk') then
    alter table public.portfolios add constraint portfolios_categories_chk
      check (categories <@ array['Web', 'Mobile', 'Consulting']::text[]) not valid;
  end if;
end $$;

comment on column public.portfolios.categories is
  '분류(다중). Web · Mobile · Consulting 의 부분집합. 화면·필터는 이 컬럼만 읽는다';

-- ⚠️ 옛 컬럼은 지우지 않는다. 022 를 돌리기 전 코드로 되돌아가야 할 때 분류가
--    통째로 사라지면 안 되기 때문이다. 대신 어드민 저장이 categories[1] 을
--    그대로 다시 써 넣어 값이 굳지 않게 한다(lib/portfolios.ts 의 toRow).
comment on column public.portfolios.category is
  '⚠️ 레거시 미러. categories[1] 이 들어간다(어드민 저장이 같이 쓴다). 읽지 말 것 — categories 를 쓴다';

-- 인덱스는 만들지 않는다. 분류 필터는 어드민 목록도 /projects 도 전부
-- 클라이언트에서 거른다(서버 쿼리에 category 조건이 없다). 서버 필터를
-- 붙이게 되면 그때 gin (categories) 를 추가할 것.

-- ---------------------------------------------------------------------------
-- 4) 확인
-- ---------------------------------------------------------------------------
-- select title, category, categories from public.portfolios order by sort_order limit 10;
-- select count(*) from public.portfolios where cardinality(categories) = 0;

-- ============================================================================
-- 포트폴리오 표시 순서 (sort_order) — 어드민 드래그 앤 드롭 정렬
--
-- 왜 seq 를 못 쓰는가 — seq 는 `generated always as identity` 라 UPDATE 가
-- 아예 거부된다(사람이 순서를 바꿀 수 없다). 게다가 seq 는 "등록 순번" 이라
-- 의미가 다르다. 그래서 사람이 정하는 표시 순서를 따로 둔다.
--
-- 값이 작을수록 위/앞이다. 어드민 목록의 "No" 는 이 순서상의 위치(1,2,3…)로
-- 그린다 — sort_order 값 자체를 보여주지 않는다(드래그 후 값이 촘촘하지
-- 않을 수 있어서).
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. 선행 004(·010·011).
--
-- ⚠️ 2026-08-25 확인 — 운영 DB 에는 sort_order 컬럼과 reorder_portfolios 함수가
--    이미 들어가 있었다(마이그레이션 파일 없이 대시보드에서 만든 것으로 보인다).
--    값도 seq 내림차순 그대로 1..41 이었다. 그래서 이 파일은 전부 멱등하게 썼다 —
--    이미 있는 것은 건드리지 않고(add column if not exists / null 만 백필),
--    함수는 drop 후 재생성해 본문을 이 파일 기준으로 맞춘다.
-- ============================================================================

alter table public.portfolios
  add column if not exists sort_order integer;

-- ---------------------------------------------------------------------------
-- 1) 백필 — 지금 화면에 보이던 순서를 그대로 옮긴다
--
--    기존 목록/공개 페이지는 전부 `order by seq desc`(최신이 위) 였다.
--    그 순서를 1..N 으로 옮겨 두면 이 마이그레이션 직후에는 화면이 하나도
--    안 바뀐다 — 정렬 기준만 sort_order asc 로 갈아탄다.
-- ---------------------------------------------------------------------------
with ranked as (
  select id, row_number() over (order by seq desc) as rn
    from public.portfolios
)
update public.portfolios p
   set sort_order = ranked.rn
  from ranked
 where ranked.id = p.id
   and p.sort_order is null;

-- ---------------------------------------------------------------------------
-- 2) 새로 등록한 건은 맨 위로
--
--    지금까지의 관례(최신이 위)를 유지한다. 어드민에서 등록하면 목록 1번에
--    나타나고, 거기서 드래그해 원하는 자리로 옮기면 된다.
--    ⚠️ BEFORE INSERT 라 not null 검사보다 먼저 돈다 — 아래 set not null 이 안전하다.
-- ---------------------------------------------------------------------------
create or replace function public.portfolios_head_sort_order()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sort_order is null then
    select coalesce(min(sort_order), 1) - 1 into new.sort_order from public.portfolios;
  end if;
  return new;
end $$;

drop trigger if exists portfolios_sort_default on public.portfolios;
create trigger portfolios_sort_default
  before insert on public.portfolios
  for each row execute function public.portfolios_head_sort_order();

alter table public.portfolios alter column sort_order set not null;

create index if not exists portfolios_sort_idx
  on public.portfolios (sort_order);

comment on column public.portfolios.sort_order is
  '표시 순서. 작을수록 위/앞. 어드민 목록의 드래그 앤 드롭이 정하고
   /projects · 홈 메인 슬라이드도 같은 순서로 그린다.
   값 자체는 연속이 아닐 수 있다(등록 시 min-1 이 들어간다) — 위치만 의미가 있다';

-- ---------------------------------------------------------------------------
-- 3) 순서 바꿈이 "수정일" 을 건드리지 않게 한다
--
--    004 가 건 portfolios_touch 는 UPDATE 마다 updated_at 을 now() 로 민다.
--    그대로 두면 카드 하나를 드래그했을 뿐인데 목록의 등록/수정일이 오늘로
--    전부 바뀌어 "언제 고친 글인지" 를 잃는다. sort_order 만 달라진 UPDATE 는
--    트리거를 아예 태우지 않는다.
--
--    to_jsonb(old/new) 로 비교하는 이유 — WHEN 절에서 "sort_order 를 뺀 나머지"
--    를 컬럼 나열 없이 통째로 견주려면 이 방법뿐이다. 컬럼을 나열하면 새 컬럼을
--    추가할 때마다 여기를 같이 고쳐야 한다.
-- ---------------------------------------------------------------------------
drop trigger if exists portfolios_touch on public.portfolios;
create trigger portfolios_touch
  before update on public.portfolios
  for each row
  when (
    (to_jsonb(old) - 'sort_order' - 'updated_at')
      is distinct from
    (to_jsonb(new) - 'sort_order' - 'updated_at')
  )
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4) 재정렬 RPC
--
--    어드민이 새 순서를 id 배열 하나로 넘기면 한 문장으로 다 바꾼다.
--    행마다 UPDATE 를 날리면 맨 아래 항목을 맨 위로 끌었을 때 수십 번 왕복한다.
--
--    ⚠️ security invoker 다 — 004 의 portfolios_admin_update RLS 가 그대로
--    적용된다. definer 로 바꾸면 로그인만 하면 누구나 순서를 바꿀 수 있게 된다.
-- ---------------------------------------------------------------------------
-- 이미 있는 함수를 create or replace 로 덮으면 반환형/인자명이 다를 때 에러가 난다.
-- 시그니처째 지우고 다시 만든다.
drop function if exists public.reorder_portfolios(uuid[]);

create function public.reorder_portfolios(p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.portfolios p
     set sort_order = x.ord::integer
    from unnest(p_ids) with ordinality as x(id, ord)
   where p.id = x.id
     and p.sort_order is distinct from x.ord::integer;
$$;

revoke all on function public.reorder_portfolios(uuid[]) from public, anon;
grant execute on function public.reorder_portfolios(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select sort_order, seq, title from public.portfolios order by sort_order limit 20;

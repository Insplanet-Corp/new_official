-- ============================================================================
-- 메인 노출 상한 3건 — DB 쪽 마지막 방어선
--
-- 홈 "Our Projects" 슬라이드는 3장이다. 4건째를 걸어 두면 조용히 잘려서
-- "체크했는데 왜 안 나오지" 가 되므로, 어드민 폼이 체크박스를 아예 비활성으로
-- 만든다(src/lib/portfolios.ts 의 MAX_MAIN).
--
-- 그런데 화면 차단은 보안이 아니다 — 두 사람이 동시에 폼을 열면 둘 다 "2건" 을
-- 보고 각자 체크해 4건이 될 수 있고, 그 계정 토큰으로 REST 를 직접 때리면
-- 화면을 아예 안 거친다. 그래서 여기서 한 번 더 막는다.
--
-- ⚠️ 상한 숫자가 두 군데다. MAX_MAIN 을 바꾸면 아래 3 도 같이 바꿀 것 —
--    SQL 은 TypeScript 상수를 못 읽는다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 010.
-- ============================================================================

create or replace function public.portfolios_limit_main()
returns trigger
language plpgsql
security definer          -- 세는 쪽이 RLS 에 가려지면 상한이 헐거워진다
set search_path = public
as $$
declare
  n integer;
begin
  /* "메인이 되는 순간" 에만 센다.
     ⚠️ is_main 인 행을 그냥 수정(썸네일 교체 등)할 때까지 막으면, 이미 3건이
        차 있는 상태에서 그 3건을 영영 못 고친다. */
  if new.is_main and (tg_op = 'INSERT' or not old.is_main) then
    select count(*) into n from public.portfolios where is_main;
    if n >= 3 then
      raise exception
        '메인은 최대 3건까지 등록할 수 있습니다. 현재 %건이 등록돼 있습니다.', n
        using errcode = 'check_violation';   -- 23514, 화면이 읽을 수 있는 코드
    end if;
  end if;
  return new;
end $$;

drop trigger if exists portfolios_main_limit on public.portfolios;
create trigger portfolios_main_limit
  before insert or update of is_main on public.portfolios
  for each row execute function public.portfolios_limit_main();

-- ---------------------------------------------------------------------------
-- 확인 — 지금 몇 건인가. 4건 이상이면 이 트리거를 걸어도 그대로 남는다
-- (기존 행은 검사하지 않는다). 초과분은 어드민에서 체크를 풀어 정리할 것.
-- ---------------------------------------------------------------------------
select count(*) as main_count from public.portfolios where is_main;

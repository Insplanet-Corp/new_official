-- ============================================================================
-- 포트폴리오 "메인 노출" — 플래그 + 전용 썸네일
--
-- 어드민 포트폴리오 등록/수정 화면에 [메인] 체크를 두고, 체크했을 때만
-- "썸네일 – 메인" 첨부가 나타난다. 그 썸네일이 없으면 저장되지 않는다
-- (화면에서 막고, 여기서도 check 제약으로 막는다).
--
-- 왜 썸네일을 따로 두는가 — 카드용 thumb_pc 는 세로 비율(304x409)이라
-- 메인 화면의 가로 배치에 그대로 쓰면 잘린다. 같은 프로젝트라도 컷이 다르다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. 선행 004.
-- ============================================================================

alter table public.portfolios
  add column if not exists is_main    boolean not null default false,
  add column if not exists thumb_main text;

-- ⚠️ check 는 NULL 을 통과시키므로 "메인인데 썸네일이 NULL" 을 명시적으로 막는다.
--    not valid 로 걸어 기존 행은 건드리지 않는다(전부 is_main=false 라 어차피 통과).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portfolios_main_thumb_chk') then
    alter table public.portfolios add constraint portfolios_main_thumb_chk
      check (not is_main or (thumb_main is not null and thumb_main <> '')) not valid;
  end if;
end $$;

-- 메인 화면이 "노출 중인 메인 프로젝트" 만 골라 읽는 경로
create index if not exists portfolios_main_idx
  on public.portfolios (is_main, seq desc)
  where is_main;

comment on column public.portfolios.is_main    is '메인 화면 노출 여부. true 면 thumb_main 이 반드시 있어야 한다(portfolios_main_thumb_chk)';
comment on column public.portfolios.thumb_main is '메인 화면용 썸네일 URL. 카드용 thumb_pc 와 비율이 달라 따로 둔다';

-- ---------------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------------
-- select seq, title, is_main, thumb_main from public.portfolios where is_main;

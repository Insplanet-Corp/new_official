-- ============================================================================
-- 견적문의 개인정보 열람·다운로드 기록 (2026-09-01)
--
-- 배경 — quotes 에는 신청인의 연락처·이메일이 들어 있다. 그래서
--   · 목록(/admin/quotes)에서는 연락처를 **마스킹**해서 보여주고
--   · 조회(/admin/quotes/[id])에서 원본을 볼 때마다 'view' 로 남기고
--   · 목록 CSV 다운로드는 **사유를 받아** 'download' 로 남긴다.
-- 화면은 만들지 않는다(사용자 결정 2026-09-01) — 기록만 쌓고 Supabase
-- 대시보드에서 확인한다. 나중에 화면을 붙이려면 select 정책을 하나 열면 된다.
--
-- ⚠️ **append-only 로 설계했다.** insert 정책만 만들고 select/update/delete 정책은
--    일부러 만들지 않는다. RLS 가 켜져 있고 정책이 없으면 그 동작은 전면 차단이므로,
--    어드민 계정으로는 기록을 **읽지도 고치지도 지우지도 못한다**(service_role 만 본다).
--    감사 기록이 그 기록을 만든 사람 손에 고쳐질 수 있으면 의미가 없다.
--    supabase-js 의 insert 는 기본이 `Prefer: return=minimal` 이라 select 정책이
--    없어도 성공한다 — ⚠️ 클라이언트에서 `.insert().select()` 를 쓰면 그때부터
--    권한 오류가 난다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run.
--       ⚠️ 드래그로 일부만 선택된 상태면 그것만 실행된다 — 선택 해제하고 Run.
-- 선행: 001(admin_users) · 003(has_admin_permission)
-- ============================================================================

create table if not exists public.quote_access_logs (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- 누가. ⚠️ 계정이 지워져도 기록은 남아야 하므로 on delete set null 이고,
  --       이메일·이름은 그 시점 값을 **복사해 둔다**(조인으로 되짚으면 계정이
  --       사라진 뒤 "누가 봤는지" 를 영영 알 수 없다).
  actor_id     uuid        references auth.users(id) on delete set null,
  actor_email  text,
  actor_name   text,

  -- 무엇을
  action       text        not null check (action in ('view', 'download')),
  --   view     : 조회한 문의 1건
  --   download : quote_id 는 비고 target_count/target_ids/filters 가 찬다
  quote_id     uuid,                       -- ⚠️ FK 를 걸지 않는다 — 문의가 지워져도 기록은 남는다
  target_count integer,
  target_ids   uuid[],
  filters      jsonb,                      -- 다운로드 시점에 걸려 있던 조회 조건

  reason       text,                       -- 다운로드 사유 (download 는 필수)

  -- 다운로드는 사유 없이 남길 수 없다. 화면에서도 막지만 여기가 실제 방어선이다.
  constraint quote_access_logs_reason_required
    check (action <> 'download' or btrim(coalesce(reason, '')) <> '')
);

comment on table  public.quote_access_logs             is '견적문의 개인정보 열람·다운로드 기록 (append-only, 화면 없음 — 대시보드에서 확인)';
comment on column public.quote_access_logs.actor_email is '기록 시점의 계정 이메일 사본. 계정이 지워져도 남아야 하므로 조인하지 않는다';
comment on column public.quote_access_logs.quote_id    is '조회 대상 문의. FK 없음 — 문의가 지워져도 기록은 남는다';
comment on column public.quote_access_logs.filters     is '다운로드 시점의 조회 조건 {company,person,system,kind}';

create index if not exists quote_access_logs_time_idx  on public.quote_access_logs (created_at desc);
create index if not exists quote_access_logs_actor_idx on public.quote_access_logs (actor_id, created_at desc);
create index if not exists quote_access_logs_quote_idx on public.quote_access_logs (quote_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 행위자는 **서버가 찍는다**
--
-- ⚠️ 클라이언트가 보낸 actor_* 를 그대로 믿으면 남의 이름으로 기록을 남길 수 있다.
--    그래서 BEFORE INSERT 에서 auth.uid() 로 덮어쓴다 — 클라이언트가 무엇을 보내든
--    무시된다. 이름·이메일은 admin_users 에서 그 시점 값을 읽어 복사한다.
--
-- security definer 인 이유: admin_users 의 select 정책은 authenticated 에게
-- 열려 있어 지금은 invoker 로도 읽히지만, 나중에 그 정책이 좁아져도 기록이
-- 조용히 비어 버리지 않게 한다. definer 함수에는 search_path 를 반드시 고정한다
-- (003 에서 같은 규칙을 세웠다).
-- ---------------------------------------------------------------------------
create or replace function public.stamp_quote_access_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actor_id := auth.uid();
  select a.email, a.name into new.actor_email, new.actor_name
    from public.admin_users a
   where a.id = auth.uid();
  return new;
end $$;

drop trigger if exists quote_access_logs_stamp on public.quote_access_logs;
create trigger quote_access_logs_stamp
  before insert on public.quote_access_logs
  for each row execute function public.stamp_quote_access_actor();

-- ---------------------------------------------------------------------------
-- RLS — 견적문의관리 권한자만 기록을 남길 수 있다. 읽기/수정/삭제 정책은 없다(위 참고).
-- ---------------------------------------------------------------------------
alter table public.quote_access_logs enable row level security;

drop policy if exists quote_access_logs_insert on public.quote_access_logs;
create policy quote_access_logs_insert on public.quote_access_logs
  for insert to authenticated
  with check (public.has_admin_permission('/admin/quotes'));

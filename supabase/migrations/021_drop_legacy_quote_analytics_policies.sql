-- ============================================================================
-- 019 의 메뉴권한 게이팅을 실제로 먹게 만든다 — 레거시 느슨한 정책 제거
--
-- 배경 (2026-09-01, 지역 이전 뒤 발견) —
-- 옛 프로젝트에서 대시보드로 만들어 둔 정책들이 이관 뒤에도 **살아 있었다.**
-- 처음에는 "quotes 정책이 통째로 유실됐다" 고 봤지만 오진이었다(아래 ℹ️ 참고).
-- 실제 상태는 019 의 정책과 레거시 정책이 **나란히 붙어 있는** 것이었다:
--
--   quotes       Anyone can submit a quote              INSERT  anon,auth  check true
--                quotes_public_insert                   INSERT  anon,auth  check true   ← 019
--                Only authenticated users can view quotes    SELECT auth   using true
--                quotes_admin_read                      SELECT  auth  using has_admin_permission(...)  ← 019
--                Only authenticated users can update quotes  UPDATE auth   using true
--                quotes_admin_update                    UPDATE  auth  using has_admin_permission(...)  ← 019
--   downloads    authenticated can select downloads     SELECT  auth  using true
--   internal_ips authenticated can select/insert/delete internal_ips
--
-- ⚠️ **RLS permissive 정책은 OR 로 합쳐진다** (CLAUDE.md 8번 함정, 007 에서 이미
--    한 번 밟았다). 그래서 `using true` 인 레거시 정책이 하나라도 남아 있으면
--    019 가 건 `has_admin_permission(...)` 게이팅은 **아무 효과가 없다.**
--    지금은 로그인만 하면 메뉴권한이 없어도 견적문의 전체(회사명·담당자·연락처·
--    이메일)와 방문자 분석이 REST 로 그대로 읽힌다.
--
-- 이 파일은 019 가 정의한 정책만 남기고 나머지를 지운다.
--
-- ⚠️ **동작이 바뀐다** — 이게 목적이다:
--    · `/admin/quotes` 권한이 없는 계정은 견적문의 목록이 **빈 채로** 뜬다(에러 아님)
--    · `/admin/analytics` 권한이 없는 계정은 방문자 분석이 0 으로 뜬다
--    · `internal_ips` 는 019 가 정책을 하나도 안 만들므로 **service_role 전용**이 된다
--      (앱 코드는 이 테이블을 읽지도 쓰지도 않는다 — 전수 확인. Edge Function `track`
--       만 service_role 로 읽고, 어드민의 "현재 내 IP" 는 그 함수의 whoami 를 쓴다.)
--    → 돌리기 전에 **쓰는 계정에 해당 권한이 체크돼 있는지 먼저 확인할 것.**
--      (사용자관리에서 확인. 권한이 없으면 화면이 비어 보여 고장으로 오해한다.)
--
-- ℹ️ **`Anyone can submit a quote` 를 지워도 Contact 폼은 멀쩡하다** — 019 의
--    `quotes_public_insert` 가 같은 일(anon/authenticated INSERT, check true)을 한다.
--    이름만 둘일 뿐 내용이 같아서 하나만 남기는 것이다.
--
-- ℹ️ **오진 기록** — "Contact 문의하기가 실패한다" 고 봤던 것은 검증 방법 탓이었다.
--    `Prefer: return=representation` 을 붙여 INSERT 하면 RETURNING 이 SELECT 정책까지
--    통과해야 하는데 anon 에게는 SELECT 정책이 없어 `42501` 이 난다(정상 동작).
--    앱의 `supabase.from('quotes').insert(...)` 는 `.select()` 를 붙이지 않아
--    `return=minimal` 이라 이 경로를 안 탄다 — **처음부터 정상이었다.**
--    ⚠️ **RLS 를 REST 로 검증할 때 `return=representation` 을 쓰지 말 것.**
--       읽기 권한이 없는 역할에서는 쓰기 성공도 42501 로 보인다.
--
-- 실행: Supabase 대시보드 > SQL Editor. 선행 019.
-- ============================================================================

do $$
declare
  -- 019 가 정의한 정책. 이것만 남긴다.
  keep constant text[] := array[
    'quotes_public_insert',
    'quotes_admin_read',
    'quotes_admin_update',
    'pageviews_admin_read',
    'downloads_admin_read'
  ];
  r record;
  n int := 0;
begin
  for r in
    select tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('quotes', 'pageviews', 'downloads', 'internal_ips')
       and not (policyname = any (keep))
     order by tablename, policyname
  loop
    raise notice '지움: public.% -> %', r.tablename, r.policyname;
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    n := n + 1;
  end loop;
  raise notice '레거시 정책 %개 제거', n;
end $$;

-- ---------------------------------------------------------------------------
-- 확인 — 아래 5개만 남아야 한다
--   downloads   downloads_admin_read    SELECT
--   pageviews   pageviews_admin_read    SELECT
--   quotes      quotes_admin_read       SELECT
--   quotes      quotes_public_insert    INSERT
--   quotes      quotes_admin_update     UPDATE
--   (internal_ips 는 0개 = service_role 전용)
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('quotes', 'pageviews', 'downloads', 'internal_ips')
 order by tablename, cmd, policyname;

# `track` Edge Function — 방문자 페이지뷰 기록

`src/lib/analytics.ts` 가 `supabase.functions.invoke('track')` 로 부른다.
브라우저가 DB 에 직접 넣지 않고 이 함수를 거치는 이유:

- 요청 IP 를 서버에서 봐야 사무실 IP(`internal_ips`)를 제외할 수 있다
  (IP 는 비교에만 쓰고 **저장하지 않는다**)
- service_role 로 넣으므로 `pageviews`/`downloads` 에 anon insert 정책이 필요 없다
  — 열면 아무나 조회수를 부풀릴 수 있다 (019 참고)

## ⚠️ 이 소스는 옛 프로젝트에 배포돼 있던 것보다 **오래됐을 수 있다**

옛 저장소(`Develop/Company/official`)의 소스를 그대로 가져온 것인데, 옛 프로젝트에
실제 배포돼 있던 함수에는 **이 소스에 없는 봇 필터**가 있었다
(curl 로 호출하면 `{"skipped":"bot"}` 이 돌아왔다).

그대로 배포하면 그 필터가 사라져 봇 트래픽이 조회수에 섞인다.
**배포 전에 옛 프로젝트의 배포본을 먼저 내려받아 비교할 것:**

```bash
supabase login
supabase functions download track --project-ref gepphbqhnuufnincxmor
```

## 배포

```bash
supabase functions deploy track --project-ref sbukxdevjuplwjnbmvpy --no-verify-jwt
```

`--no-verify-jwt` 가 필요하다 — 로그인하지 않은 방문자가 호출한다.
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 는 런타임에 자동 주입되므로
따로 설정하지 않는다. `INTERNAL_IPS` 시크릿은 선택 사항이다
(없으면 `internal_ips` 테이블만 본다).

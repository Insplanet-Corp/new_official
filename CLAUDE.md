# Insplanet 공식 사이트 — 작업 인수인계

> 정적 HTML 사이트를 Next.js 16 App Router + TypeScript로 포팅한 프로젝트.
> 마케팅 사이트(`/`, `/about`, `/projects`, `/contact`, `/mobile`)와 어드민(`/admin/*`)이 한 저장소에 있다.
> 구조 설명은 [README.md](README.md)에 있고, 이 문서는 **작업 이력과 결정 사항**만 담는다.

---

## 📌 Claude 에게 — 이 문서를 계속 살려둘 것

**의미 있는 작업 단위를 끝낼 때마다 이 문서를 갱신하고 별도 커밋한다.**
사용자가 매번 요청하지 않아도 스스로 한다. 세션은 끊기지만 이 문서는 남는다.

갱신 기준은 `/handoff` 명령어(`.claude/commands/handoff.md`)에 정리돼 있다.
직접 갱신하든 그 명령어를 쓰든 결과는 같아야 한다. 핵심만 옮기면:

- **코드를 읽어서 알 수 있는 것은 쓰지 않는다** — 파일 목록·함수 시그니처·구조 설명(README 담당)
- **코드만 봐서는 알 수 없는 것을 쓴다** — 왜 그 선택을 했는지, 시도했다 실패한 것과 그 이유,
  측정한 수치, 사용자와 합의한 결정, 미해결 질문, 조용히 깨지는 함정
- **검증하지 못한 것을 명시한다** — "확인함"과 "확인 못 함"을 절대 섞지 않는다
- **분량을 관리한다** — 매 세션 컨텍스트에 로드되므로, 해결된 이슈와 지나간 TODO는 지운다

---

## ⚠️ 가장 중요한 제약 — 레거시 런타임 결합

`public/js`에 정적 사이트 시절의 런타임 6,000여 줄이 **그대로** 들어 있다
(`main.js` 961줄, `blob.js`, `cta-glow.js`, `about-hero.js`, `about-blackhole.js`, `insight-background.bundle.js`).
이 코드가 DOM을 **클래스명과 ID로 직접 잡는다.**

```
클래스 셀렉터 조회  43곳   querySelector('.pin-insight') 등
classList 조작      48곳   add 22 · toggle 11 · contains 8 · remove 7
ID 셀렉터           #ci-logo #full-menu #lets-talk #head-title #bg-line #stage #left-block #symbol #blob
```

**마케팅 쪽 클래스명·ID를 바꾸면 스크롤 애니메이션·WebGL·페이지 전환이 조용히 죽는다.**
빌드는 통과하고 콘솔 에러도 안 나므로 알아채기 어렵다. 건드리기 전에 반드시
`public/js`를 grep해서 그 이름을 쓰는지 확인할 것.

전역 상태 플래그도 마찬가지다 — `.in` `.is-active` `.is-covered` `.on-dark` `.joined` 등은
레거시 JS와 React(`src/lib/dom.ts`의 `revealOnScroll`)가 **함께** 쓰는 관례다.

---

## 스타일링 방침 (확정)

| 영역 | 방식 | 이유 |
|---|---|---|
| **마케팅 페이지** | 전역 CSS 유지 (`src/styles/*.css`) | 레거시 결합 + 측정된 페이로드 회귀 |
| **어드민** | CSS Modules | 레거시 런타임과 무관, 자유롭게 스코프 가능 |

### 왜 마케팅은 전역으로 두는가 (측정 결과)

전체를 CSS Modules로 바꿔봤다가 되돌렸다. Turbopack이 루트 레이아웃을 공유하는 라우트의
CSS 모듈을 **한 청크로 합쳐서**, `/about`이 contact·projects CSS까지 받는다.

| 라우트 | 전역 CSS (현재) | 전체 모듈화 시 |
|---|---|---|
| `/` | 7.1KB gzip | 14.2KB (**+101%**) |
| `/about` | 9.1KB | 14.2KB (+56%) |
| `/contact` | 10.4KB | 14.2KB (+36%) |
| `/admin/login` | 10.3KB | 8.4KB (**−19%**) |

시도했지만 **효과 없었던 것**: `experimental.cssChunking`(webpack 전용이라 Turbopack에서 무시됨),
라우트별 얇은 `layout.tsx`로 청크 경계 만들기. 다시 시도하지 말 것.

되돌린 전체 변환 작업은 **`backup/css-modules-full` 태그**(로컬 전용, 원격 미푸시)에 보존돼 있다.
contact.css 1,020줄 → 5개 분할 같은 결과물이 필요해지면 거기서 꺼내 쓰면 된다.

### 어드민 CSS Modules 구조

`components/admin/` 아래에 `theme`(토큰) · `kit`(페이지 프리미티브) · `form`(라벨|컨트롤 행) ·
`AdminShell` · `ui` 모듈이 있다.

토큰은 CSS 커스텀 프로퍼티라 DOM 상속을 탄다 — 하위 모듈은 `theme.module.css`를 import하지
않아도 `var(--ink)`를 그대로 쓸 수 있다.

**⚠️ TS는 CSS Module 멤버를 `any`로 본다.** `kit.존재하지않는이름`을 써도 타입체크가 통과하고
런타임에 `undefined`가 className에 들어간다. 클래스명을 바꿀 때는 참조처를 직접 grep할 것.

### 어드민은 공용 컴포넌트를 쓴다 (CSS 클래스보다 우선)

`src/components/{button,badge,avatar,icon,text,layouts}` 의 공용 컴포넌트로 어드민 전 화면을
교체했다. **어드민에서 버튼·배지·아바타·아이콘·타이포·flex 를 CSS 클래스로 새로 만들지 말 것.**

| 쓸 것 | 대신 지운 것 |
|---|---|
| `<Button>` | `kit.btn` `btnPrimary` `btnGhost` `btnSm`, `login.module.css` 의 `.submit` composes |
| `<Badge>` | `ui.tsx` 의 `Badge`/`BadgeTone`, `ui.module.css` 의 `.badge*`, `kit.brandTag` |
| `<Avatar>` | `kit.avatar` |
| `<Icon>` | `ui.tsx` 안에 손으로 그려 넣었던 인라인 SVG |
| `<Text>` `<Heading>` | `.title` `.desc` `.statLabel` `.emptyTitle` … 폰트 크기/굵기 전용 클래스 |
| `<Flex>` | `.pageHead` `.pageActions` `.actions` `.inline` 같은 flex 전용 클래스 |

색 규칙 — **primary(등록·저장·수정·로그인) = `color="BLUE" variant="solid"`**,
secondary(목록·취소·조회·파일찾기) = `color="GRAY" variant="outline"`, 삭제 = `color="RED" variant="outline"`.
어드민의 기존 primary 는 검정(`--ink`)이었지만 공용 팔레트에 그 색이 없어 파랑으로 통일했다.

**`Button` 은 `href` 를 받으면 `next/link` 로 렌더한다.** 이동용 버튼을 `<Link><Button/></Link>`
로 감싸면 `<a>` 안에 `<button>` 이 들어가 스펙 위반 + 포커스가 두 번 잡힌다. 반드시 `href` 쪽을 쓸 것.

**색은 admin theme 토큰 문자열을 그대로 넘긴다** — `<Text color="var(--muted)">`. 컴포넌트가
`--text-color` 로 흘려보내므로 토큰 상속이 그대로 먹는다. `theme.ts` 의 hex 를 직접 쓰지 말 것.

⚠️ **`.button` 이 `display:inline-flex` 를 갖는다.** 반응형에서 버튼을 `display:none` 으로
숨기려면 클래스 하나로는 번들 순서에 따라 질 수 있다 — `AdminShell.module.css` 의
`.siteLink.siteLink` 처럼 특이도를 올려야 한다.

⚠️ **`Text` 는 레이아웃 prop(`mb` `px` …)이 없다.** `Flex` 의 gap/margin 으로 풀거나 className 을 쓸 것.

### 공용 컴포넌트에서 잡은 버그 3개 (같은 패턴을 다시 만들지 말 것)

교체 작업 중 **컴포넌트를 브라우저에서 실측**해서 찾았다. 셋 다 빌드·타입체크를 통과하고
콘솔 에러도 없어서, 코드만 읽어서는 절대 안 보인다. **새 prop 을 만들면 computed style 로
값이 실제로 먹는지 확인할 것.**

**1. `Flex` 의 `p` `px` `py` `m` `mx` `my` 가 전부 무시됐다 (측정값 `padding: 0px`)**

```css
padding-inline: var(--layout-px);   /* 18px 설정 */
padding-left:   var(--layout-pl);   /* 미정의 → 선언 무효 → 0 으로 리셋 */
```
미정의 커스텀 프로퍼티를 참조하는 선언은 무효(IACVT)가 되면서 그 속성이 **초기값으로
리셋**된다. shorthand 뒤에 longhand 를 나열해 두면 longhand 가 매번 앞을 지운다.
→ 여백·크기는 CSS 변수를 버리고 `Flex.tsx` 가 인라인 스타일로 직접 넣도록 바꿨다.
덤으로 prop 을 안 주면 className 이 건 padding 이 살아남는다(`.blocked` 의 `28px 32px`).

**2. `Text`/`Heading` 의 `fontSize` prop 이 죽어 있었다**

`.text { font-size: var(--custom-font-size) }` 가 `.size_N` 보다 **앞**에 있어서, `size` 에
기본값(`"2"`)이 있는 이상 항상 `.size_N` 이 이겼다. → `.customSize` 를 파일 끝으로 분리하고
`fontSize` 를 넘겼을 때만 붙인다. 이걸 고쳐서 11px·12.5px·13.5px 같은 **스케일에 없는
어드민 원래 값**을 그대로 복원했다.

**3. `Flex` 의 `align`/`justify` 가 중첩 Flex 로 새어 나갔다**

`--flex-align` 은 커스텀 프로퍼티라 **상속된다.** `data-align` 규칙으로만 값을 넣으니,
`align` 을 안 준 안쪽 Flex 가 바깥 값을 물려받았다 — 페이지 헤드의 제목·설명이
왼쪽 정렬이 아니라 가운데로 몰려 있었다. → `.flex` 에서 `--flex-align` `--flex-justify`
`--flex-wrap` `--flex-gap*` 을 **매번 초기화**한다. 새 축 변수를 추가하면 초기화도 같이 넣을 것.

같은 이유로 `Button`/`Badge` 의 `size_N { font-size }` 도 라벨에 닿지 않았다 —
라벨이 `<Text>` 라 자기 size 클래스(기본 14px)를 항상 달고 나왔다. `LABEL_SIZE` 맵으로
버튼/배지 크기에 맞는 Text size 를 넘긴다.

---

## 지금까지 한 일

### 1. GitHub 등록 (`main`)
- 저장소: `https://github.com/Insplanet-Corp/new_official` (**private**)
- `.gitignore` 확장 — `.env.*` 전체 차단(`.env.example`만 예외), 인증서/키, 빌드 산출물
- `.env.example` 추가 + README에 환경변수 설정 가이드와 담당자 문의 안내

### 2. 어드민 CSS Modules 전환 (`706e913`)
`admin.css` 272줄 → 모듈 5개. 동작은 그대로 보존했다.

> 이 커밋에는 **사용자가 직접 한 작업도 섞여 있다** — `portfolio/completed`, `portfolio/ongoing`
> 두 페이지를 지우고 진행/종료 토글이 있는 `portfolio/page.tsx` 하나로 합친 변경 + `tabs.ts` 수정.
> 커밋 메시지에는 CSS 전환만 적혀 있으니 이력을 볼 때 유의.

### 3. 기획서 기반 어드민 화면 틀 (`b44320b`)
`관리자시스템_화면설계서20260703.pptx` (45p) 기준. 5개 메뉴 × 목록/등록/조회/수정 라우트 17개.
당시엔 **화면 골격만** 만들었다 — 데이터 연동·저장·삭제·얼랏 없음.

기획서에서 **화면 규칙까지 반영한 것**:
- 포트폴리오 진행 상태 연동 (기획서 24~25p) — 진행 → 고객사 CI·프로젝트 기간 필수/활성,
  종료 → 썸네일 PC·모바일·HTML 파일명 필수/활성. 반대쪽은 비활성.
- 사용자 메뉴권한 (40p) — 전체메뉴 ON/OFF ↔ 하위 항목 연동
- 수정 화면 ID 비활성 (43p), 등록 화면에만 중복확인 버튼

**결정한 것**: 메인관리는 기획서의 A/B 선택지 중 **A타입(히스토리 관리형)**.
포트폴리오는 기존 토글 화면을 버리고 **기획서 구조(목록+CRUD)로 교체**.

> ⚠️ 이 커밋에서 **이미 동작하던 견적문의 Supabase 연동을 스켈레톤으로 덮어썼다.**
> 다음 커밋(`3a51214`)에서 되살렸다. 화면 틀을 만들 때 기존 구현이 있는지 먼저 확인할 것.

### 4. 견적문의관리 Supabase 재연결 (`3a51214`)

`quotes` 테이블은 **이미 존재하고 Contact 폼이 여기에 쓴다.** 실제 스키마(anon 키로 컬럼 확인):

```
id · created_at · company · person · phone · email · url · content · status · project_fields(jsonb)
```

`project_fields`가 이 도메인의 핵심이다. Contact 폼의 칩 선택이 **JSON 그대로** 들어가고,
기획서의 네 항목과 이렇게 대응한다:

| project_fields 키 | 기획서 항목 |
|---|---|
| `scope` | 프로젝트 업무범위 = 목록의 "시스템 종류" |
| `nature` | 프로젝트 성격 = 목록의 "개발 구분" |
| `budget` | 프로젝트 예산 |
| `period` | 프로젝트 기간 |

**⚠️ 값은 칩에 적힌 한글 문자열 그대로다** (`'웹사이트'`, `'신규'` …). 어드민 필터를
`'website'`, `'new'` 같은 영문 슬러그로 따로 정의했다가 **필터가 아무것도 못 거르는 버그**가
있었다. 지금은 `adminOptions.ts`가 `PROJECT_FIELDS`에서 파생시켜 두 곳이 어긋날 수 없다.
**선택지를 손으로 다시 적지 말 것.**

시스템종류·개발구분 필터는 jsonb 안을 봐야 해서 **클라이언트에서 거른다.** 접수 건수가
많아지면 PostgREST의 jsonb 연산자로 서버 필터링해야 한다.

**첨부파일은 붙일 수 없다** — 기획서(32p)엔 있지만 `quotes`에 컬럼이 없고 Contact 폼도
파일을 업로드하지 않는다. Storage 연동이 선행돼야 한다. 화면엔 안내만 띄워 뒀다.

### 5. 사용자관리 → `admin_users` 프로필 테이블 (`242f774`, `9df7312`)

**Supabase Auth 에 어드민 계정이 이미 있다** (로그인이 그걸로 동작). 하지만
기획서가 요구하는 사용자명·전화번호·사용여부·메뉴권한을 Auth 는 저장하지 않고,
**anon 키로는 계정 목록도 못 읽는다** (`/auth/v1/admin/users` → 403).
그래서 `auth.users` 에 1:1 로 붙는 프로필 테이블을 두는 구조로 갔다.

**미해결**: 기획서는 ID 기반 로그인인데 현재 구현은 이메일 기반이다.
`login_id`(표시·검색·중복확인)와 `email`(실제 credential)을 둘 다 들고 있다.

### 6. 어드민 전체를 공용 컴포넌트로 교체 (`8edc55f`)

`src/components/{button,badge,avatar,icon,text,layouts,divider}` + `src/styles/theme.ts`
로 **어드민 화면 전부**를 바꿨다. 규칙과 함정은 위 「어드민은 공용 컴포넌트를 쓴다」에 정리했다.

교체 규모: 버튼 31곳 · 배지 9곳 · 아바타 1곳 · 인라인 SVG 2곳 · 타이포/flex 클래스 20여 개 제거.
공용 컴포넌트에 가한 변경: `Button` 에 `href` 분기, `Text` 에 `htmlFor`, 위 「버그 3개」 수정.

**여백·폰트는 눈으로 보지 않고 `getComputedStyle` 로 원본 CSS 값과 하나씩 대조**했다.
원본과 의도적으로 다르게 둔 것: 버튼 라벨 13px → 14px(컴포넌트 스케일), primary 검정 → 파랑.

### 7. 사용자관리 신규 등록 — 서버 라우트 (`8edc55f`)

**등록은 브라우저에서 끝낼 수 없다.** anon 키로는
`auth.admin.createUser` → 403, `auth.signUp` → **현재 관리자 세션이 새 계정으로 바뀐다.**
그래서 `service_role` 키를 쥔 `POST /api/admin/users` 가 Auth 계정과 프로필을 함께 만든다.

**⚠️ `service_role` 은 RLS 를 전부 우회한다.** `admin_users` 의 쓰기 정책이 이 라우트에는
적용되지 않으므로 **호출자 권한 검사를 라우트가 직접 해야 한다.** 새 서버 라우트를 만들 때
이걸 빠뜨리면 인증 없이 DB 전체가 열린다.

프로필 insert 가 실패하면 **방금 만든 Auth 계정을 지운다.** 롤백이 없으면
"로그인은 되는데 프로필이 없어 아무 데도 못 들어가는" 계정이 쌓인다 (실제로 겪었다 — 9번).

`SUPABASE_SERVICE_ROLE_KEY` 가 없으면 등록만 503 이고 나머지 화면은 정상 동작한다.

**검증한 것**: 인증 게이트를 임시 프로덕션 서버로 실측 — 토큰 없음·잘못된 JWT·만료 형태
JWT·**anon 키를 토큰으로** 넣은 4가지 모두 401. 마지막 항목이 중요하다(anon 키는 브라우저
번들에 그대로 실려 있다). 처음엔 더미 service 키로 돌렸는데 그러면 API 키 게이트에서 먼저
막혀 **JWT 검증이 실제로 일어나지 않는다** — anon 키를 service 자리에 넣어 다시 돌린 결과다.

**사용자가 실제 등록 성공까지 확인함.**

### 8. `admin_users` RLS 무한재귀 (`003` 마이그레이션)

001 의 쓰기 정책이 이렇게 걸려 있었다:

```sql
create policy admin_users_write on public.admin_users
  for all to authenticated                                 -- SELECT 까지 포함된다
  using (exists (select 1 from public.admin_users me ...))  -- 자기 참조
```

**`for all` 은 SELECT 에도 적용된다.** select → 정책 평가 → 정책이 자기 테이블 select →
정책 재평가 → `42P17 infinite recursion`. 목록·상세·수정·중복확인은 물론 `AdminShell` 의
프로필 조회까지 전부 죽었다.

→ 권한 판정을 `has_admin_permission()` (`security definer`) 로 옮기고, 쓰기 정책을
insert/update/delete 로 분리했다. `security definer` 함수는 소유자 권한으로 돌아 RLS 를
타지 않으므로 재귀가 끊긴다. **`set search_path` 고정은 선택이 아니라 필수다.**

DB 에서 확인함: 정책 4개(select/insert/update/delete), `has_admin_permission` `secdef=true`
`owner=postgres`, 테이블 `owner=postgres` `force=false` → 함수가 RLS 를 우회하는 조건 충족.

**자기 참조 정책을 새로 만들 때 같은 함정을 반복하지 말 것.**

### 9. 프로필 없는 계정에 갇히는 문제 (실제로 겪음)

8번을 고치자 증상이 드러났다. 재귀 에러가 나던 동안 `AdminShell` 이 에러를 **삼키고**
통과시키고 있었는데, 조회가 정상화되니 `null` 이 돌아와 "계정 프로필이 없습니다" 로 막혔다.
`auth.users` 3건 전부 프로필이 없었다 — **`002` 가 실행된 적이 없었던 것.**

**닭-달걀**: `admin_users` 쓰기는 `/admin/users` 권한자만 가능한데, 그 첫 프로필이 없다.
라우트에 "테이블이 비면 로그인 사용자가 첫 계정 생성 허용" 경로를 넣어 뒀지만
**`AdminShell` 게이트가 먼저 막아서 도달하지 못한다.** 결국 SQL 로 첫 프로필을 넣어 풀었다.

→ 새 환경 구축 시 **`001` → `002` → `003` 순서로 전부 실행할 것.** 002 를 빠뜨리면
대시보드에서 만든 계정마다 같은 문제를 겪는다.

### 10. 오류 판정을 메시지 대신 코드로 (`8edc55f`)

`isMissingTable` 이 `/does not exist|schema cache/` 로 매칭하고 있었다. 테이블이 없던
시절엔 문제없었지만, 테이블이 생긴 뒤로는 **컬럼이 하나 어긋났을 뿐인 `PGRST204`
("Could not find the 'x' column ... in the schema cache") 와 `42703` 까지**
"테이블 없음" 으로 잡아 엉뚱한 안내를 띄웠다.

→ 에러 **코드**로만 판정한다. 실제 PostgREST 응답에 물려 검증했다 —
구 정규식은 4건 중 2건 오분류, 지금은 4건 정상.

**`AdminShell` 이 에러를 삼키던 것도 고쳤다.** 이것 때문에 9번 진단이 늦어졌다.
화면을 막지는 않고(일시적 오류로 어드민이 통째로 잠기면 곤란) 본문 위에 띠로 띄운다.

### 11. 메뉴권한을 화면에 반영 (`8edc55f`)

`permissions` 가 저장만 되고 아무 데도 안 쓰이고 있었다 — 권한을 빼도 탭이 다 보였다.
탭을 숨기고, **주소를 직접 쳐도 막는다**(숨기기만 해서는 URL 입력으로 뚫린다).
하위 경로는 부모 탭 권한으로 판정한다(`/admin/users/new` → `/admin/users`).

기획서 44~45p 의 "숨긴다 / 보여주되 얼랏" 두 안 중 **숨기는 쪽으로 결정**(사용자 합의).
얼랏 방식으로 바꾸려면 `allowedTabs` 를 `ADMIN_TABS` 로 되돌리고 차단 화면만 남기면 된다.

**⚠️ 이건 화면 차단이지 보안이 아니다.** 그 계정의 토큰으로 REST API 를 직접 부르면
그대로 읽힌다. 서버측에서 실제로 막히는 건 `admin_users` 쓰기(RLS)와 `/api/admin/users`
뿐이고, **`quotes`·`portfolios` 등은 메뉴권한과 무관하게 열려 있다.**

---

## 현재 상태

```
브랜치   refactor/css-modules   (main 미머지)
커밋     8edc55f 공용 컴포넌트 전면 적용 + 사용자관리 등록·메뉴권한   ← 최신
태그     backup/css-modules-full                                    ← 되돌린 전체 CSS 변환 (로컬만)
```

빌드·타입체크 통과.

**마케팅 라우트는 더 이상 "초기 커밋과 diff 0" 이 아니다** — `7ef961b` 에서
`ProjectsExplorer.tsx` 의 필터바 reveal 을 고쳤다(이 세션에서 작성한 것이 아니라
작업 트리에 있던 변경을 분리 커밋한 것). 어드민 작업은 마케팅을 건드리지 않았다.

`8edc55f` 는 **두 작업 단위가 섞인 커밋이다.** `AdminShell`·`UserForm`·users 화면을
양쪽이 모두 수정해서 파일 단위로 나누면 중간 커밋 빌드가 깨진다. 이력을 볼 때 유의.

### Supabase 마이그레이션 실행 상태

| 파일 | 실행됨? |
|---|---|
| `001_admin_users.sql` | ✅ (테이블 컬럼 대조로 확인) |
| `002_admin_users_sync.sql` | ⚠️ **미확인** — 9번 시점엔 미실행이었다. 이후 실행했는지 확인 못 함 |
| `003_fix_admin_users_rls_recursion.sql` | ✅ (`pg_policies` 로 확인) |

anon 키로는 `admin_users` 를 못 읽어(RLS 가 `to authenticated`) 프로필 수를 확인할 수 없다.
**002 실행 여부부터 확인할 것** — 안 돌았으면 새로 만드는 계정마다 9번을 반복한다.

---

## 다음에 할 일

### 검증 못 한 것 (먼저 확인 필요)

**Claude 는 아직 로그인한 어드민 화면을 직접 못 봤다.** 세션이 없어 게이트를 못 넘는다.
사용자가 브라우저에서 확인한 것은 로그인·프로필 차단 화면·등록 성공까지다.
**메뉴권한 차단(11번)은 권한 뺀 계정으로 아직 아무도 확인하지 않았다** — 경로→권한
매핑 로직만 실제 소스로 테스트해 9건 통과시켰다.

견적문의는 한 걸음 더 미검증이다 — **`quotes` 테이블이 비어 있어 실제 렌더를 못 봤다.**
Contact 폼이 넣는 형태의 행으로 필터·표시 로직만 따로 검증했다.

### 기능 붙이기

| 메뉴 | 테이블 | 상태 |
|---|---|---|
| 사용자관리 | `admin_users` ✅ | **연동 완료** — 목록·상세·수정·등록·메뉴권한 |
| 견적문의관리 | `quotes` ✅ | **연동 완료** — 목록·필터·상태변경·상세 (데이터 0건) |
| 리크루트관리 | `recruits` | 테이블 없음 |
| 메인관리 | 없음 | 스키마 설계부터 |
| 포트폴리오관리 | `portfolios` | 기획서 항목과 안 맞음. 재설계 필요 |

**DB 실측 (anon 키, 컬럼은 개별 프로브로 확인):**

```
pageviews     id · created_at · path · referrer · visitor_id · utm_source/medium/campaign
portfolios    id · created_at · title · client · description
admin_users   001 스키마와 일치
quotes        기존과 동일
recruits      없음
```

**⚠️ `pageviews` 는 이 저장소와 무관한 고아 테이블이다.** `src/**`·`public/js`·`.sql`·
전체 git 히스토리(`log --all -S`) 어디에도 등장하지 않는다. 대시보드에서 직접 만들었거나
다른 프로젝트 것으로 보인다. **삭제할지, 방문 추적을 실제로 붙일지 결정 필요.**

`portfolios` 는 `client`·`description` 이 늘었지만 여전히 기획서 항목과 안 맞는다.

**사용자용 마케팅 화면에서 DB 에 붙은 곳은 `ContactForm` 의 `quotes` insert 한 곳뿐이다.**
`/projects` 는 `src/data/projectsPage.ts` 하드코딩이고 `portfolios` 와 연결돼 있지 않다.

순서는 **스키마 설계 → 목록 조회 → 등록/수정 저장 → 삭제 → 필수값 얼랏**이 자연스럽다.
견적문의를 붙인 방식(`src/lib/quotes.ts`에 타입·헬퍼를 모으고 화면은 그걸 쓰는 구조)을
그대로 따라가면 된다.

이미지 업로드(썸네일 PC/모바일, 고객사 CI)와 첨부파일은 **Supabase Storage**가 선행돼야 한다.

### 바로 이어서 할 만한 것
- **`004` — 나머지 테이블에 메뉴권한 RLS.** 지금 메뉴권한은 화면에서만 막힌다(11번).
  `quotes` 등에 `has_admin_permission('/admin/quotes')` 정책을 걸어야 실제로 막힌다.
- **`002` 실행 여부 확인** (위 「마이그레이션 실행 상태」)
- **"계정 프로필이 없습니다" 화면에 자가 생성 버튼** — 라우트의 부트스트랩 경로가
  게이트에 가려 못 쓰이는 문제(9번) 해소

### 기획서에 물음표로 남은 것 (담당자 확인 필요)
- 메인관리 목록에 삭제 기능이 필요한가 (10p) — 현재는 조회 화면에만 삭제 배치
- 사용자 데이터 삭제 기능이 필요한가 (42p) — 현재는 수정/취소만
- 상세화면 HTML 업로드 실제 경로 (25p) — 지금은 `/com/resource/content/portfolio/detail/` 임시값
- 등록한 계정의 비밀번호 변경 절차 — 지금은 등록 시 관리자가 정하고 본인 변경 기능이 없다

---

## 작업 시 주의점 (실제로 밟았던 지뢰)

1. **import 별칭이 지역 변수와 충돌** — `import svc from './Services.module.css'` 아래에서
   `SERVICES.map((svc) => svc.title)`을 쓰면 데이터 항목이 모듈을 가린다. TS도 안 잡는다.
   `form`, `svc` 같은 흔한 이름을 별칭으로 쓰지 말 것.
2. **문자열로 조립하는 클래스명은 해시되면 깨진다** — `` `insight-num--0${i}` `` 같은 패턴.
   인덱스 lookup 배열로 바꿔야 한다.
3. **공유 컴포넌트가 페이지 클래스를 셀렉터로 잡는 경우** — `Cursor.tsx`가 `.pj-card`를 잡고
   있었다. 스타일 클래스 대신 `data-*` 속성으로 분리할 것.
4. **CSS Modules는 파일 단위 스코프** — `.a .b`에서 두 클래스가 다른 파일에 있으면 해시가
   달라 규칙이 죽는다. 자손 셀렉터는 같은 파일 안에 두거나 로컬 modifier로 풀 것.
5. **zsh는 변수를 자동 분할하지 않는다** — 스크립트에서 `$FILES`를 unquoted로 넘기면
   한 덩어리 파일명으로 취급된다. 배열이나 명시적 나열을 쓸 것.
6. **`SUPABASE_SERVICE_ROLE_KEY` 에 `NEXT_PUBLIC_` 을 붙이지 말 것** — 붙이는 순간
   브라우저 번들에 실려 RLS 를 우회하는 키가 공개된다. 서버에서만 읽는다.
7. **Supabase SQL Editor 는 선택 영역이 있으면 그것만 실행한다** — 단어 중간부터
   드래그된 채로 Run 하면 `syntax error at or near "ons"` 처럼 **실행한 적 없는 쿼리의**
   에러가 뜬다. 에러 메시지의 `LINE 1:` 내용이 방금 돌린 SQL 과 다르면 이걸 의심할 것.
8. **Next dev 서버는 같은 디렉터리에서 두 개 못 띄운다** — 두 번째가 조용히 죽는다.
   다른 포트로 검증이 필요하면 `next build && next start -p <포트>` 를 쓸 것.

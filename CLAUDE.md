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

| 영역              | 방식                               | 이유                                       |
| ----------------- | ---------------------------------- | ------------------------------------------ |
| **마케팅 페이지** | 전역 CSS 유지 (`src/styles/*.css`) | 레거시 결합 + 측정된 페이로드 회귀         |
| **어드민**        | CSS Modules                        | 레거시 런타임과 무관, 자유롭게 스코프 가능 |

### 왜 마케팅은 전역으로 두는가 (측정 결과)

전체를 CSS Modules로 바꿔봤다가 되돌렸다. Turbopack이 루트 레이아웃을 공유하는 라우트의
CSS 모듈을 **한 청크로 합쳐서**, `/about`이 contact·projects CSS까지 받는다.

| 라우트         | 전역 CSS (현재) | 전체 모듈화 시     |
| -------------- | --------------- | ------------------ |
| `/`            | 7.1KB gzip      | 14.2KB (**+101%**) |
| `/about`       | 9.1KB           | 14.2KB (+56%)      |
| `/contact`     | 10.4KB          | 14.2KB (+36%)      |
| `/admin/login` | 10.3KB          | 8.4KB (**−19%**)   |

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

| 쓸 것                | 대신 지운 것                                                                        |
| -------------------- | ----------------------------------------------------------------------------------- |
| `<Button>`           | `kit.btn` `btnPrimary` `btnGhost` `btnSm`, `login.module.css` 의 `.submit` composes |
| `<Badge>`            | `ui.tsx` 의 `Badge`/`BadgeTone`, `ui.module.css` 의 `.badge*`, `kit.brandTag`       |
| `<Avatar>`           | `kit.avatar`                                                                        |
| `<Icon>`             | `ui.tsx` 안에 손으로 그려 넣었던 인라인 SVG                                         |
| `<Text>` `<Heading>` | `.title` `.desc` `.statLabel` `.emptyTitle` … 폰트 크기/굵기 전용 클래스            |
| `<Flex>`             | `.pageHead` `.pageActions` `.actions` `.inline` 같은 flex 전용 클래스               |

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
padding-inline: var(--layout-px); /* 18px 설정 */
padding-left: var(--layout-pl); /* 미정의 → 선언 무효 → 0 으로 리셋 */
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

**결정한 것**: 메인관리는 기획서의 A/B 선택지 중 **A타입(히스토리 관리형)**.
포트폴리오는 기존 토글 화면을 버리고 **기획서 구조(목록+CRUD)로 교체**.

기획서의 필수/활성 규칙(24~25p, 40p, 43p)도 이때 반영했다. 단 포트폴리오의
진행 상태별 **비활성**은 이후 걷어냈다 — 12번 참고.

> ⚠️ 이 커밋에서 **이미 동작하던 견적문의 Supabase 연동을 스켈레톤으로 덮어썼다.**
> 다음 커밋(`3a51214`)에서 되살렸다. 화면 틀을 만들 때 기존 구현이 있는지 먼저 확인할 것.

### 4. 견적문의관리 Supabase 재연결 (`3a51214`)

`quotes` 는 **이미 존재하고 Contact 폼이 여기에 쓴다.** 이 도메인의 핵심은
`project_fields`(jsonb) — Contact 폼의 칩 선택이 **JSON 그대로** 들어간다
(`scope`=업무범위/시스템종류, `nature`=성격/개발구분, `budget`, `period`).

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
그대로 읽힌다. 서버측에서 실제로 막히는 건 `admin_users`·`portfolios` 쓰기(RLS)와
`/api/admin/users` 뿐이고, **`quotes` 는 메뉴권한과 무관하게 열려 있다.**

### 12. 포트폴리오관리 DB 연동 + `/projects` 공개 (`d01841d`, 004~007)

어드민에서 등록한 포트폴리오가 홈페이지 `/projects` 에 그대로 나온다.

**기존 `/projects` 의 40장은 실데이터가 아니었다.** `buildCards()` 가 시드 RNG 로
이미지 11개·이름 15개 풀에서 무작위 조합해 생성한 것이라(수상 22% 확률) 이름과
이미지 사이에 아무 관계가 없었다. 그래서 "지금 보이는 걸 DB 로 옮긴다" 가 성립하지
않았고, 중복 없이 11건만 골라 시드로 넣었다(`005`). **담당자에게 실제 목록을 받아
갈아엎어야 한다.**

**⚠️ 조회는 반드시 서버에서 한다.** `ProjectsExplorer` 의 reveal 이펙트가 **마운트
시점에** DOM 의 `.pj-card` 개수를 세어 첫 행을 계산한다. 클라이언트에서 뒤늦게
채우면 빈 그리드를 보고 아무 카드에도 `.in` 을 안 붙여 **그리드 전체가 `opacity:0`
으로 남는다.** 콘솔 에러도 안 난다.

**ISR 로 뒀다가 되돌렸다.** `revalidate = 60` 은 stale-while-revalidate 라 만료 후
**첫 요청도 옛 화면을 주고** 뒤에서 다시 만든다 — 새 내용은 그 다음 요청부터다.
"60초 뒤 새로고침" 이 아니라 "60초 뒤 두 번 새로고침" 이라 반영이 안 되는 것처럼
보인다. 지금은 `force-dynamic`. 트래픽이 늘면 ISR 로 되돌리되 어드민 저장 시
`revalidatePath('/projects')` 를 같이 붙여야 한다.

**이미지 컬럼에는 `<img src>` 에 그대로 넣을 문자열을 담는다.** 시드는 `/assets/...`
public 경로고 새 업로드는 Storage URL 인데, 화면 코드는 어느 쪽이든 그대로다.

**폼의 진행 상태별 입력 비활성을 없앴다** (사용자 요청 — 상태와 무관하게 넣어 두고
노출만 상태로 가른다). 이때 `toRow` 가 반대쪽을 `NULL` 로 눕히던 것도 같이 없앴다 —
**안 그러면 종료로 바꾸기 전에 올린 썸네일이 저장 시점에 조용히 버려진다.** 업로드는
성공하고 미리보기까지 뜨는데 저장하면 사라지는 형태라 알아채기 어렵다.

프로젝트명 줄바꿈은 **표현이 두 가지 섞인다.** 한 줄 `<input>` 은 진짜 개행을 담을 수
없어 사용자는 역슬래시+`n` 두 글자를 치고, DB(와 시드)에는 진짜 개행이 들어 있다.
`toRow`/`toDraft` 가 경계에서 변환한다. 안 맞추면 어드민에서 넣은 줄바꿈이 화면에서
안 먹는다.

### 13. RLS permissive 정책은 OR 로 합쳐진다 (`007`)

사용여부를 `N` 으로 바꿔도 `/projects` 에 계속 나왔다. anon 키로 직접 조회해
**`use_yn='N'` 인 행이 그대로 넘어오는 것을 확인**했다.

004 에서 `use_yn='Y'` 로 좁게 걸었는데도 뚫린 이유는, 004 **이전에 대시보드에서 만들어
둔** 정책 두 개(`Anyone can view published portfolios` / `Admins can manage portfolios`)가
남아 있었기 때문이다. **정책을 아무리 좁게 새로 걸어도 느슨한 정책이 하나라도 남아
있으면 그쪽이 이긴다.**

→ 007 에서 제거하고, `/projects` 쿼리에도 `use_yn` 필터를 **이중으로** 걸었다.
RLS 하나에만 기대지 않는다 — 같은 사고를 두 번 겪었고, 나중에 누가 느슨한 정책을
추가하면 또 조용히 뚫린다.

**새 테이블에 RLS 를 걸 때는 `pg_policies` 부터 확인할 것.** 대시보드에서 만든 정책이
이미 있을 수 있다.

### 14. 정적 사이트(`../insplanet`) 변경분 흡수 — PC 분량 (2026-08-19)

포팅 기준점은 정적 사이트의 **`b997b24`(2026-07-03)** 다. 그 뒤로 40커밋(08-12~08-19)이
쌓였고, 그중 **PC 에 해당하는 것만** 가져왔다. 사용자가 범위를 A(PC 갱신)로 정했다.

**기준점 대조로 확인한 것** — `style.css` · `about.css` · `projects.css` 는 포팅본이
기준점과 **바이트 단위로 같았다.** 그래서 통째로 덮어썼다. 마케팅 CSS 를 전역으로
남긴 결정(위 「스타일링 방침」)이 여기서 값을 했다. 손으로 합쳐야 했던 것은
`fonts.css`(`../assets`→`/assets` 경로만 다름) 와 `contact.css`(포팅 때 271→1020줄로
확장돼 있다) 두 개뿐이다.

**가져온 것**

- **About 04 섹션 전면 교체** — 「금융×모빌리티」→ **Experience**. 카드 4개의 문구·아이콘이
  전부 바뀌었고(`Mobility & Enterprise Insight` → `Cross-Industry Insight`), `core-value-head`
  래퍼가 사라졌다. 갤러리는 3+1 그리드 → **8장 마퀴 밴드**(4장 + `aria-hidden` 복제 4장)로
  바뀌면서 **`.about-fusion` 의 마지막 자식으로 들어갔다** — `AboutGallery` 를 페이지가 아니라
  `AboutFusion` 이 렌더한다.
- **마무리 이미지(07) 가 핀 확대 스크럽이 됐다** — `about-fullbleed-pin` > `-box` 구조.
  `about-hero.js` 가 +67줄로 이걸 같이 몬다. 브라우저에서 확인함: 스크롤 0 에서
  박스가 `90×55.8px` = 스크립트의 `cw*0.0625` 계산과 일치.
- **About 스크롤 리빌** — 인라인 `<script>` 2개를 `AboutReveals.tsx` 로 옮겼다.
  `revealOnScroll` 에 `rootMargin` 인자를 추가했다(게이트 `-25%`).
  ⚠️ `.about-axcreator` 만 threshold 0 이다 — 이 루트가 뷰포트보다 커서 % 임계치를 쓰면
  너무 늦게 발화한다.
- **Contact 동의문에 약관 링크 2개** (`href="#"` 는 정적 사이트도 자리표시자다)
- **커서 GROW_SEL** 에 시트 닫기 버튼 추가
- **썸네일 20장** `public/images/projects/thumb-01~20.png` (27MB) + `009` 마이그레이션

**의도적으로 안 가져온 것**

- **어댑티브 경계 767 → 1023.** 정적 사이트는 아이패드 세로까지 모바일로 보내지만,
  그건 mobile-about/contact/projects 3페이지가 **있다는 전제**다. Next 에는 없다.
  `/mobile` 은 히어로만 있는 WIP 작업장이므로 경계를 올리면 태블릿이 미완성 화면을 받는다.
  about/contact/projects 에는 분기를 아예 달지 않았다 — `/mobile`(홈)로 보내면
  About 을 요청한 사람이 홈을 받는다. **모바일 페이지를 만들 때 같이 올릴 것.**
- 모바일 전부(3페이지 + `mobile.html` +149줄 + `mobile-menu.js` `tap-feel.js`).
  `style.css` 를 통째로 덮었으므로 **모바일 CSS 는 이미 다 들어와 있다**(`m-*` `ma-*`
  `mc-*` `mp-*` `mr-*`). 마크업과 런타임만 만들면 된다. JS 는 `public/js` 에 그대로
  복사하기로 사용자와 합의했다.

### 15. 프로젝트 상세를 "올라오는 시트" 로 (`ProjectSheet.tsx`)

정적 사이트가 새로 만든 `project-sheet.js`(466줄) 의 **연출만** 가져왔다.
라우트는 기존 `/projects/[id]` 를 유지한다(사용자 결정).

**⚠️ 원본과 딱 하나 다르게 갔다 — 원본은 상세 HTML 을 `fetch` 해서 페이지에 주입한다.
우리는 하지 않는다.** 주입하면 퍼블리셔 문서의 스크립트가 **우리 문서에서** 돌고,
`localStorage` 의 Supabase 세션 토큰을 읽을 수 있다. `DetailFrame` 이 `sandbox`
(`allow-same-origin` 없이)를 쓰는 이유가 그것이다. 그래서 시트 안에도 **iframe 을 그대로
넣는다.** 파급 효과 두 가지:

- 진행률을 이미지 개수로 못 센다 → iframe 의 `load` 하나로 만든다
- 상세의 자체 컨트롤(`.pd-btn` 의 Copy URL 등)에 손이 닿지 않는다 — 상세 문서가 자기
  인라인 스크립트로 처리한다 (`window.ProjectSheet` 가 없으면 스스로 동작하게 짜여 있다)
- **iframe 크기 전제는 17번을 반드시 읽을 것**

**진행 바 rAF 함정** — 공개 시점을 "그려진 바가 1 에 닿는 rAF 루프"에 매달아 뒀는데,
**백그라운드 탭에서는 rAF 가 통째로 멈춘다.** 그러면 카드를 누른 사람이 주소만 바뀐 채
아무것도 못 보는 상태로 남는다. 보호 타이머(8초)를 rAF 를 거치지 않고 **직접 여는** 경로로
따로 뒀다. 실제로 이 경로가 동작하는 것을 브라우저에서 확인함.

**리액트 함정** — `.ps-bar` 의 `transform` 을 JSX `style` 에 두면 안 된다. rAF 가 매 프레임
쓰는 값이라, 다른 state 로 리렌더가 한 번 일어나면 그때마다 0 으로 되돌아간다.
CSS(`.ps-bar`)가 이미 `scaleX(0)` 으로 시작시키므로 JSX 에서는 빼고 `opacity` 만 state 로 몬다.

**`detailSrc()` 로 경로 판정을 합쳤다** (`lib/portfolios.ts`). 상세 라우트와 시트가 같은
함수를 쓴다. 겸사겸사 **조용한 버그를 하나 잡았다** — 어드민 폼의 예시는
`/heyyoung-1024/index.html`(앞에 `/`) 인데 코드는 `` `/portfolio/${html_file}` `` 로 붙여서
`/portfolio//heyyoung-...` 가 나왔다. **동작은 했다 — Next 가 308 로 한 번 더 돌려보내서.**
이제 앞의 `/` 와 `portfolio/` 접두를 둘 다 흡수한다(008 주석은 접두 포함 표기라 DB 에
두 표기가 섞일 수 있다).

**브라우저에서 확인한 것**: 카드 클릭 → `/projects/<id>` 로 pushState · iframe 이 올바른
src 로 마운트 · `html.ps-open` · 보호 타이머로 `is-open` · `body{position:fixed}` 잠금 ·
ESC → `history.back()` → 주소 복귀 · `inert` 복원 · 슬라이드 후 iframe 해제.
`.ps-scroll` 1440×900 / scrollHeight 1200 로 스크롤 가능.

**확인 못 한 것**: 슬라이드 애니메이션 자체, 진행 바가 차는 모습.
**브라우저 패널이 백그라운드라 rAF·IO·타이머가 전부 스로틀되고,
`innerWidth/Height` 가 0 으로 잡힌다.** iframe 은 패널이 `ERR_BLOCKED_BY_CLIENT` 로 막아
본문이 아예 안 뜬다(문서 자체는 `fetch` 로 200·13KB 확인). **사람이 실제 브라우저에서
봐야 한다.**

### 16. 상세화면 산출물을 옮겨오면서 깨진 경로 (`public/portfolio/`)

정적 사이트의 `projects/kb-app.html` 산출물을 `public/portfolio/heyyoung-1024/` 로
옮기면서 경로가 어긋났다. **HTML 의 `src`/`href` 만 봐서는 절반밖에 안 보인다** —
나머지 절반이 CSS 의 `url()` 안에 있었다.

| 깨진 것                             | 원인                                                                                               | 고친 값                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| **`css/fonts.css` 안의 웹폰트 7개** | `url("../assets/fonts/…")` 가 `/portfolio/assets/fonts/…` 로 풀린다. **HTML 스캔으로는 안 잡힌다** | `url("/assets/fonts/…")`    |
| `/ci_logo_white.svg`                | 정적 사이트는 루트에 에셋이 있었다                                                                 | `/assets/ci_logo_white.svg` |
| `img/kb-app/sec-0N.*` (6장)         | 옮기면서 `kb-app/` 한 단계가 평평해졌다                                                            | `./img/sec-0N.*`            |
| `./projects.html` (닫기)            | 404 는 아니었지만 Next 목록이 아니라 딸려 온 정적 더미 목록으로 갔다                               | `/projects`                 |

스타일시트 링크(`../css/*.css`) **자체는 안 깨져 있었다** — 옮길 때
`public/portfolio/css/` 에 사본이 같이 들어와서 200 으로 떴다. 진짜 문제는 그 안의
폰트였다. **다음에 산출물을 옮길 때는 CSS 안의 `url()` 까지 확인할 것.**

### 17. ⚠️ 상세 iframe 은 내용 높이가 아니라 **뷰포트 크기**여야 한다

"경로를 고쳤는데 오히려 아예 안 되던" 진짜 원인이었다.

`_shared/project-detail.css` 는 상세를 **자기가 곧 뷰포트라는 전제** 위에 세워 놨다:

```
.pd-hero{height:100vh}                 /* 히어로가 한 화면 */
.pd-close, .pd-hero-scroll{position:fixed}
```

원본 정적 사이트는 상세를 **시트 DOM 에 주입**하므로 `.ps-scroll` 이 곧 뷰포트가 되어
전제가 성립한다. 우리는 세션 토큰 때문에 주입 대신 **sandbox iframe** 을 쓰는데(15번),
거기에 높이 통지(`_height.js`)로 **iframe 을 내용 높이만큼 늘리자** 둘 다 깨졌다:

- `100vh` 가 **iframe 자기 높이**로 풀린다 → 히어로가 커짐 → 문서가 길어짐 →
  높이를 다시 통지 → **끝없이 자란다**
- `position:fixed` 가 뷰포트가 아니라 **문서 맨 위**에 붙는다

→ **iframe 높이를 고정한다** (시트 `height:100%`, 단독 라우트 `100svh`).
스크롤은 iframe 안에서 일어난다. 그래서 **시트 전용 Lenis·`--ps-sbw`·`is-at-end`·
높이 통지가 전부 필요 없어져서 지웠다.** `_height.js` 도 삭제했다.

`/projects/[id]` 에서는 **`PageShell` 을 뺐다** — 상세가 자기 CI 로고와 닫기를 화면
모서리에 fixed 로 그려서 사이트 헤더와 겹친다. SEO 용 `h1` 은 iframe 밖에 남겼다.

### 18. iframe 경계에서 생긴 버그 4개 → `_shared/bridge.js`

상세를 iframe 에 넣으면서 **부모와 끊긴 것들**이 한꺼번에 증상으로 나왔다.
넷 다 원인이 같아서 다리 스크립트 하나로 푼다.

| 증상                                                 | 원인                                                                                                                                                                           | 해결                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 아래 화살표를 누르면 **CSS 없는 목록 페이지**가 뜬다 | `.pd-close` 의 `href="/projects"` 가 **iframe 안에서** 열린다. sandbox 라 상위 이동(`allow-top-navigation`)이 없어 스스로 나갈 수도 없다                                       | 다리가 클릭을 가로채 `pdClose` 를 부모에게 넘긴다                                                                |
| **X 버튼이 같이 보인다**                             | 부모는 상세가 자기 닫기를 가졌는지 알 방법이 없다                                                                                                                              | 다리가 `pdReady{ownClose}` 를 알리고 부모가 `.ps-sheet.is-own-close` 를 붙인다 (CSS 는 style.css 에 이미 있었다) |
| 다시 열면 **더 느리고 흰 배경**                      | 닫을 때 `setSrc(null)` 로 iframe 을 버렸다. ① 다시 받아 와야 해서 느리고 ② **1.4초 타이머가 도는 동안 다시 열면 그 타이머가 방금 띄운 iframe 을 지워** 시트의 흰 바탕만 남는다 | iframe 을 버리지 않는다. `ready` 로 기억해 같은 상세면 진행 바 없이 즉시 올린다                                  |
| 상세 위에서 **커서가 멈춘다**                        | `mousemove` 가 부모 문서에 도달하지 않는다                                                                                                                                     | 다리가 좌표를 넘기고 `Cursor.tsx` 가 받는다. iframe 이 화면 전체를 덮으므로 **좌표가 1:1** 이라 보정이 필요 없다 |

**⚠️ 새 상세 산출물에 `bridge.js` 를 빠뜨리면 위 네 개가 그대로 재현된다.**
`public/portfolio/README.md` 에 추가 절차를 적어 뒀다.

`Cursor.tsx` 는 `framed` 플래그를 둔다 — 다리에서 좌표가 오는 동안에는
`elementFromPoint` 를 쓰지 않는다(부모 입장에서는 어디를 가리켜도 iframe 하나만 잡힌다).
커서가 커지는 판정은 다리가 같이 보내 준다. 부모에서 실제 `mousemove` 가 오면 해제된다.

**검증**: `bridge.js` 를 jsdom 으로 6가지 확인 — `pdReady{ownClose}` 통지 · 자식 SVG 에서
눌러도 `pdClose` · 좌표 전달 · 버튼 위 `grow` · 16ms 스로틀 · **단독 열람이면 아무것도 안
보냄**. 부모 반응은 브라우저에서 확인 — `ownClose` → `.ps-close` `display:none` ·
`pdClose` → 시트 닫힘 + 주소 복귀 · **2회차 열기는 캐시로 즉시**(1회차는 가드 타임아웃 9.6초,
백그라운드 탭이라 rAF 가 멈춘 탓) · iframe 1440×900 = 뷰포트.
커서 이동 자체는 rAF 가 멈춰 **눈으로 확인 못 함.**

### 19. 상세 폴더 구조 — 여러 개를 넣을 수 있게

```
public/portfolio/
├─ _shared/     fonts.css · style.css · project-detail.css · bridge.js   ← 한 벌만
├─ heyyoung-1024/   index.html + img/     ← 프로젝트 하나 = 폴더 하나
└─ README.md        추가 절차
```

공용 CSS 는 `../_shared/…`, 사이트 에셋은 `/assets/…`(절대), 다리는
`/portfolio/_shared/bridge.js`. 절차는 `public/portfolio/README.md` 참고.

**⚠️ 폴더명을 바꾸면 `portfolios.html_file` 이 깨진다.** DB 에 `<슬러그>/index.html`
로 들어 있다. `heyyoung-1024` 는 내용상 `heyyoung-campus` 가 맞지만 등록 데이터가
가리키고 있어 그대로 뒀다 — 바꾸려면 어드민에서 값을 같이 고칠 것.

정리하면서 지운 것: `_height.js`(쓰는 곳 없음), `heyyoung-1024/projects.html`(옮겨올 때
딸려 온 정적 목록 사본 725줄), 시트의 죽은 ref 4개·`SLIDE_MS`·reduced-motion 분기.

### 20. 상세 3건 추가 (onNuri · shinhan · dap) — 옮겨 오며 빠진 것들

사용자가 퍼블리셔 산출물 3개를 `public/portfolio/` 에 넣었다. **heyyoung-1024 와
종류가 다르다** — `.pd-*` 디자인 시스템을 쓰지 않고 `<style>` 안에 리셋부터 전부
들고 있는 자립형 문서다. 그래서 `_shared/*.css` 를 연결하지 않는다(연결하면 오히려
자기 스타일과 충돌한다). 문서 종류가 두 가지라는 것을 README 에 갈라 적었다.

고친 것 — **전부 "파일만 떼어 와서 원래 얹혀 있던 스타일시트가 안 온" 문제다.**

| 문서     | 증상                                | 원인 / 고친 것                                                                                                                                                                                 |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| onNuri   | 문서 폭이 **3072px** (뷰포트의 2배) | `img { max-width: 100% }` 가 없다. section06 이미지가 원본 크기로 펼쳐졌다. **문서가 `max-width: unset` 을 5군데서 쓰는 게 그 규칙을 전제한다는 증거다.** → `.onnuri img{max-width:100%}` 복원 |
| dap      | 커버 이미지 2장 **404**             | `cover_pc.png`/`cover_mobile.png` 를 부르는데 폴더에는 `cover.jpg`/`cover_m.jpg` → 실제 파일명으로                                                                                             |
| dap      | 다리 스크립트 없음                  | `bridge.js` 추가 (onNuri·shinhan 은 사용자가 이미 넣어 뒀다)                                                                                                                                   |
| 3건 전부 | 가로로 **120px** 밀린다 (dap)       | 스크롤 인 연출이 `.works-content-item` 을 `.show` 전까지 `translate(+200px)` 로 대기시킨다. **`body{overflow-x:hidden}` 으로는 안 막힌다** — `html{overflow-x:clip}` 를 넣었다                 |

**⚠️ `body` 의 `overflow-x:hidden` 은 문서가 옆으로 스크롤되는 것을 못 막는다.**
세 문서 다 그 한 줄을 갖고 있었는데 dap 은 그대로 120px 밀렸다. `clip` 을 쓸 것 —
스크롤 컨테이너를 만들지 않는다(`hidden` 은 만들어서 `position:sticky` 를 죽인다,
`src/styles/mobile.css` 에 같은 메모가 있다).

**닫기 버튼이 없는 문서다.** 다리가 `ownClose:false` 를 보내므로 시트의 기본 `.ps-close`
X 가 그대로 보인다 — 의도한 대로다(18번).

**미해결 — 외부 CDN 웹폰트.** 세 문서 다 MICEGothic 을 `cdn.jsdelivr.net` 에서 받는다.
사이트의 나머지는 전부 자체 호스팅(`/assets/fonts/`)이라, CDN 이 막히거나 느리면
**이 문서들만** 폰트가 바뀌며 레이아웃이 흔들린다. 자체 호스팅으로 옮길지 미결정.

**어드민 등록**: shinhan(seq 10) · onNuri(seq 11) 은 등록돼 있다. **dap 은 아직이다** —
상세화면 HTML 에 `dap/index.html` 을 넣어야 카드에서 열린다.

**검증**: 4개 문서의 참조 101개 전부 200 · 1440/375 두 폭에서 가로 스크롤 0 ·
깨진 이미지 0 · onNuri 의 `max-width:unset` 자리(`.img-glass img` 1136px)가 그대로
살아 있는 것 확인(디자인 보존) · dap 커버가 실제로 렌더되는 것 스크린샷 확인.

### 21. kb-app 교체 — "완전 빨간색" 두 가지와 CSS 동기화

사용자가 `heyyoung-1024` 를 `kb-app` 으로 갈아끼웠다. 정적 사이트의
`projects/kb-app/` (폴더 방식으로 바뀌었다)를 가져온 것이다.

**① 소스컨트롤이 온통 빨간 이유 — git 이 rename 을 못 봤다.**
폴더를 에디터/파인더에서 바꾸면 git 은 "32개 삭제 + 폴더 하나 untracked" 로 본다
(삭제 = 빨강). **`git add -A` 로 스테이징하면 git 이 내용 유사도로 rename(R) 을
묶어 준다** — 실제로 index.html 포함 8건이 R 로 잡혔다. 코드 문제가 아니다.

**② 화면이 깨진 이유 — `_shared/project-detail.css` 가 낡았다.**
가져온 HTML 은 정적 사이트의 **최신** 마크업이라 `.pd-sec--pc` `.pd-sec--m`
`.pd-m-only` 를 쓰는데, 우리 사본에는 그 규칙이 없었다. 결과:

- `.pd-sec--pc` / `--m` 이 둘 다 보여 **섹션 이미지가 12장** 쌓였다 (PC 6 + 모바일 6)
- `.pd-m-only` 의 `<br>` 이 PC 에서도 먹어 영문 제목이 2줄로 깨졌다

→ `../insplanet/css/project-detail.css` 에서 동기화했다.
**⚠️ 정적 사이트는 계속 움직인다.** 우리가 `f849839` 로 가져온 뒤에도
`project-detail.css` 가 3번 더 바뀌었다(1024 앵커 · 모바일 상세 · 히어로 높이).
**상세 마크업을 새로 가져올 때는 이 CSS 도 같이 동기화할 것.**

최신본은 `.pd-hero{height:var(--ps-vh,100dvh)}` 를 쓴다. `--ps-vh` 는 정적 사이트의
`project-sheet.js` 가 넣어 주는 값인데 **우리는 넣지 않는다 — iframe 자체가 뷰포트라
`100dvh` 폴백이 곧 정답이다**(17번). 실측: PC 900 / 모바일 812 = 각 뷰포트 높이.

**③ 링크 두 개**: `../../projects.html`(정적 사이트의 목록) → `/projects`,
`../../assets/…` → `/assets/…`(절대경로가 폴더 깊이에 안 흔들린다).

**⚠️ 아직 남은 것 — DB 가 옛 폴더를 가리킨다.** seq 16 의 `html_file` 이
`/heyyoung-1024/index.html` 인데 폴더가 `kb-app` 으로 바뀌어 **404** 다.
어드민에서 `kb-app/index.html` 로 고쳐야 카드에서 열린다. (anon 키로는 쓸 수 없어
Claude 가 못 고친다 — 8번 RLS 참고.)

**검증**: PC 1440 — 섹션 6장(모바일 0) · 제목 1줄 · 히어로 900 · 가로 스크롤 0.
모바일 375 — 섹션 6장(PC 0) · 제목 2줄 · 히어로 812 · `<picture>` 가
`m-hero-bg.jpg` 를 고름 · 깨진 이미지 0.

### 22. 다른 상세를 kb-app 템플릿으로 바꿀 수 있나 (조사 결과)

**`project-detail.css` 는 전부 `.pd*` 아래로 스코프돼 있다** (예외는 `.ps-sheet` 조합
선택자 하나와 keyframe 퍼센트뿐). 따라서 onNuri·shinhan·dap 의 자체 스타일과
**충돌 없이 같이 링크할 수 있다.** 히어로 이미지도 이미 세 폴더 다
`cover.jpg`/`cover_m.jpg` 를 갖고 있다.

두 가지 층위가 있고 비용이 전혀 다르다:

- **(A) 껍데기만 통일** — `.pd-hero`(풀스크린 커버 + CI + 닫기 셰브론 + KO/EN 제목 +
  Client/Launch + SCROLL) 와 `.pd-summary`(Overview 카드 + View Platform/Copy URL)를
  각 문서 앞에 두르고 본문은 각자의 살아 있는 HTML 그대로. 잃는 것 없음.
  덤으로 닫기 셰브론이 생겨 시트의 X 대신 쓰인다(18번).
  **필요한 재료**: 프로젝트별 EN 제목 · Client · Launch · Overview 문구 · 플랫폼 URL.
  **dap 은 이미 문서 안에 다 있다**(제목·Overview·Launch·Client·Device).
  onNuri·shinhan 은 받아야 한다.
- **(B) 본문까지 동일** — kb-app 처럼 섹션당 Figma export 이미지 한 장으로 교체.
  **권하지 않는다** — 선택 가능한 텍스트·반응형 리플로우·스크롤 애니메이션을 전부
  그림으로 바꾸는 일이고, 디자이너가 섹션마다 PC/모바일 2세트를 다시 뽑아야 한다.
  사실상 세 문서를 다시 만드는 작업이다.

사용자 결정 대기.

### 23. ⚠️ 치수 없는 `loading="lazy"` = 교착 (모바일에서 히어로 아래가 통째로 안 보임)

kb-app 을 모바일 폭으로 보면 **히어로만 나오고 아래가 전혀 안 나왔다.**

원인 — 섹션 이미지 12장이 전부 `loading="lazy"` 인데 **`width`/`height` 속성이 없다.**

1. 로드 전 `<img>` 높이는 0 → `.pd-sec` 6개가 전부 0 높이로 쌓인다
2. 문서 높이가 1472px (히어로 812 + 나머지 조금) 밖에 안 된다
3. 이미지들은 y≈1488 에 있다 — **문서 끝보다 아래라 스크롤로 도달할 수 없다**
4. 화면 근처로 못 가니 lazy 가 안 풀리고 → 높이도 안 생기고 → 문서도 안 길어진다

**정적 사이트에서는 안 터진다.** 거기선 `project-sheet.js` 가 상세를 주입하면서
모든 이미지를 `loading='eager'` 로 바꾼 뒤 시트를 올린다. 우리는 iframe 이라 그 단계가
없어서 드러났다(15번).

→ **`<img>` 에 원본 픽셀 크기를 적었다.** `.pd-sec img{width:100%;height:auto}` 라
속성이 종횡비만 주고, 브라우저가 **로드 전에 자리를 예약**한다.

|                      | 고치기 전 | 고친 뒤                 |
| -------------------- | --------- | ----------------------- |
| 모바일 375 문서 높이 | 1472      | **7554**                |
| PC 1440 문서 높이    | 1649      | **7090**                |
| 섹션 높이 (로드 전)  | 0         | 실제 값 (824·714·1016…) |

**PC 도 같은 버그였다** — 첫 섹션만 어쩌다 로드돼서 덜 티가 났을 뿐이다.

`_shared/bridge.js` 에 **보험**을 넣었다 — `loading="lazy"` 인데 `width`/`height` 가
없는 이미지는 lazy 를 푼다. 근본 해법은 문서에 치수를 적는 것이다(보험은 자리 예약을
못 하므로 이미지가 뜰 때 화면이 밀린다). jsdom 4건 확인: 치수 없는 lazy→eager ·
치수 있는 lazy 유지 · lazy 아닌 것 무시 · 기존 `pdReady` 동작 유지.

**⚠️ 다른 세 문서(onNuri·shinhan·dap)에는 치수를 안 넣었다.** 그쪽은 `loading` 자체를
안 써서 교착이 없다. 넣으면 로딩 중 화면 밀림(CLS)이 없어지지만, **각 이미지의 CSS 에
`height:auto` 가 있는지 하나씩 확인해야 한다** — 없으면 속성 height 가 그대로 먹어
이미지가 늘어난다. 미적용.

### 24. 인라인 `<style>` 분리 (onNuri·shinhan·dap)

사용자 요청 — "html 에 style 이 위에 잔뜩 있어 보기 싫다". 각 문서의 인라인
`<style>` 을 같은 폴더의 `style.css` 로 뺐다.

```
onNuri   1809줄 -> 279줄  (+ style.css 1529줄)
shinhan  1297줄 -> 503줄  (+ style.css  793줄)
dap       635줄 -> 190줄  (+ style.css  444줄)
```

**순수 이동임을 두 가지로 확인**했다 — ① 텍스트: 빼낸 CSS 와 원본 `<style>` 이 공백
무시 동일, 나머지 HTML 도 동일 ② 렌더: 분리 전 파일을 같은 폴더에 두고 같은 폭에서
렌더해 **요소 149개의 위치·크기·display·색·폰트·margin·padding·position·transform·
opacity 지문**을 비교 — 해시가 정확히 같았다(`-1218488085`).

**아직 안 한 통일 작업 (사용자 결정 대기)**

- **공통 CSS 승격** — 세 `style.css` 의 앞부분(리셋·MICEGothic·`only-pc`/`only-mobile`·
  `works-*`)이 거의 같다. `_shared/works.css` 로 올리면 중복이 사라진다.
  ⚠️ **기계적 추출이 안 된다** — 연속 공통 접두가 2줄뿐이다(주석 문구가 다르고 shinhan 은
  리셋에 `dl,dt,dd` 추가, dap 은 다크 배경). 손으로 병합해야 한다.
- **좌우 거터** — kb-app 은 48px(`.pd-secs` padding), 나머지 셋은 **0**(모든 섹션이
  0→1440 풀블리드). 맞추면 dap 커버·onNuri 유리 이미지 등 풀블리드 요소가 안쪽으로
  들어온다 — 그게 원하는 그림인지 확인 필요.
- **버튼/Overview 통일** — 세 문서엔 버튼이 없다. kb-app 의 `.pd-summary` 를 붙이려면
  프로젝트별 Client·Launch·Overview 문구·플랫폼 URL 이 필요하다. dap 은 문서 안에 이미
  다 있고 onNuri·shinhan 은 없다.

### 25. `<project-detail>` — 상세 껍데기를 컴포넌트로 (`_shared/works.js`)

사용자 요청: onNuri·shinhan 을 kb-app 과 같은 히어로로, 그리고 **"컴포넌트화해서 추후에도
바로 쓸 수 있게"**. 상세는 React 가 아니라 `public/` 에 그대로 올라가는 정적 HTML 이고
sandbox iframe 안에서 자기 문서로 돈다 — **빌드 단계가 없으므로 브라우저 표준인 커스텀
엘리먼트가 유일한 수단**이다.

```html
<project-detail
  ko="…"
  en="Onnuri digital|gift card"
  client="…"
  launch="Oct, 2022"
  hero="img/hero-bg.jpg"
  hero-mobile="img/m-hero-bg.png"
  overview-title="…"
  overview-text="…"
  platform="https://…"
>
  <div class="work-container onnuri">…본문 전체…</div>
</project-detail>
```

태그 하나가 히어로(배경·CI·닫기·KO/EN 제목·Client/Launch·SCROLL)와 Overview 카드
(제목·본문·View Platform·Copy URL)를 그리고, **자식으로 받은 본문을 `.pd-secs` 밴드
안으로 옮긴다.**

**⚠️ 본문을 밴드 안에 넣지 않으면 Overview 만 정렬되고 아래가 따로 논다.**
처음엔 컴포넌트가 상단만 그리고 본문 여백은 `works.css` 가 따로 줬는데, 값이 두 체계로
갈려서 Overview 아래부터 좌우 여백과 간격이 끊겼다. kb-app 은 Overview 와 모든 섹션이
**같은 `.pd-secs`** 안에 있어서 하나로 이어진다 — 그 구조를 그대로 가져왔다.
`.work-container` 에는 `display:contents` 를 걸어 박스를 지운다. 그래야 섹션들이 밴드의
직계 flex 자식이 되어 `gap` 이 섹션 사이마다 적용된다(래퍼가 남으면 래퍼 하나에만 걸린다).

**⚠️ `display:contents` 는 특이도 싸움에 진다.** `works.css` 를 문서 `style.css` 보다 먼저
로드하므로, dap 의 `.work-container.dap{display:flex}` 와 같은 특이도면 그쪽이 이겨서
**dap 만 섹션 간격이 0** 이었다. `.work-container.work-container` 로 클래스를 두 번 적어
올렸다.

**kb-app 과 값이 정확히 같은지 실측으로 대조함** (1440):
밴드 padding `27.7143px 46.8571px 108.571px` · gap `27.7143px` · 모든 블록 left `47` ·
width `1346` · 블록 사이 간격 전부 `28` · radius `12px` — kb-app 과 **동일**.
375: padding `16px 16px 48px` · gap `16` · left `16` · width `343` · radius `16px`.

**⚠️ Shadow DOM 을 쓰지 않는다.** 모양은 전부 `_shared/project-detail.css` 의 `.pd-*` 가
내는데, 그 CSS 는 `.pd` 컨테이너에 정의된 변수(`--q --dv --gx …`)에 매달려 있다. 그늘 안에
넣으면 그 CSS 가 닿지 않는다. 그래서 컴포넌트가 `.pd` 래퍼까지 같이 그린다.

**⚠️ `|` 줄바꿈에서 공백을 잃기 쉽다.** 제목류의 `|` 는 `<br class="pd-m-only">` 가 되는데
PC 에서는 그게 `display:none` 이라, 공백 없이 이으면 **"ShinhanSecurities"** 로 붙어 버린다.
`' <br …>'` 로 앞에 공백을 넣는다 (kb-app 원본 마크업도 같은 이유로 공백이 있다).

**⚠️ `.pd-btn` 클릭 처리가 두 곳에 있다.** kb-app 은 자기 인라인 스크립트가, 컴포넌트 문서는
`works.js` 가 한다. **둘 다 부르면 복사가 두 번 일어난다** — kb-app 에 `works.js` 를 넣지 말 것.

**kb-app 도 나중에 컴포넌트로 바꿨다** — 28번 참고.

`bridge.js` 는 버튼 처리를 놓고 **공유 주소만 중계**한다 — 부모가 `pdShareUrl` 로
`/projects/<id>` 를 내려보내고 `window.__pdShareUrl` 에 담는다. iframe 의 `location` 은
`/portfolio/<슬러그>/…` 라 Copy URL 이 그대로 쓰면 공유가 안 된다. sandbox 는 불투명 출처라
clipboard API 가 막히므로 `execCommand` 폴백이 실제 경로다.

`_shared/works.css` 는 **본문 좌우 거터만** 담당한다(PC 64 / 모바일 20). 배경은 풀블리드로
두고 안쪽만 들여쓰기 위해 **배경이 걸린 요소**에 패딩을 준다 — 문서마다 그 자리가 달라
문서별로 한 줄씩 적혀 있다.

**실측** (1440 / 375, 세 문서): 히어로 900/812 = 뷰포트 · `<picture>` 가 PC `hero-bg.jpg` /
모바일 `m-hero-bg.png` 를 고름 · CI·닫기(44/36)·KO+EN 제목·Client/Launch·SCROLL 전부 렌더 ·
Overview 카드 1346 폭 · 버튼 2개 · 본문 패딩 64/20 · 가로 스크롤 0 · 깨진 이미지 0.

**문구 출처와 미해결**

- shinhan·onNuri 는 사용자가 준 시안에서 그대로 옮겼다. **단, onNuri 시안의 모바일 컷에는
  Overview 문구가 shinhan 것으로 들어가 있다**(시안 복붙 흔적) — PC 컷의 온누리 문구를 썼다.
- shinhan 의 KO 제목은 시안에서 휴대폰 이미지에 가려 안 보여 `신한투자증권 모바일 웹 개편`
  으로 적었다. **확인 필요.**
- dap 은 시안이 없어 자기 문서의 값을 썼고 히어로는 `cover.jpg`/`cover_m.jpg` 를 쓴다.
  `launch` 는 문서에도 `202X.XX` 로만 있어 **비워 뒀다**(속성을 빼면 그 칸이 안 나온다).
- **`platform` 세 개 다 비어 있다** — 주소를 받으면 속성에 넣기만 하면 된다.

### 26. `src/styles/fonts.css` 의 폰트 경로가 되돌아가 빌드가 깨졌다

에디터 포매터가 이 파일을 정리하면서 `url('/assets/fonts/…')` 를 **`url("../assets/fonts/…")`
로 되돌려** Turbopack 빌드가 9개 에러로 실패했다. Next 가 번들하는 CSS 라 상대경로는
`src/assets/fonts/` 를 가리키는데 그런 디렉터리가 없다.

**이 파일은 반드시 절대경로여야 한다** (`public/assets/` 를 가리킨다). `public/portfolio/_shared/fonts.css`
사본도 같다. 포맷을 다시 돌릴 때 이 값이 살아 있는지 확인할 것.

### 27. 푸터까지 컴포넌트에 — 상세 템플릿 완성 (`_template/`)

`<project-detail>` 이 이제 **히어로 → Overview → 본문 밴드 → 푸터**를 전부 그린다.
새 프로젝트는 `public/portfolio/_template/` 을 복사해 속성 문구와 본문만 채우면 된다.

**푸터** — 사이트 푸터(`src/components/chrome/SiteFooter.tsx` + `style.css` chapter 08)와
같은 모양. CSS 는 `_shared/footer.css` 로 그 블록만 뽑았다(140KB `style.css` 를 통째로
부르면 문서 고유 스타일과 충돌한다). 로고는 `src/data/footerLogo.ts` 의 path 를 그대로
`_shared/footer-{wordmark,planet}.svg` 로 뽑아 `<img>` 로 겹쳐 놓는다 — CSS 가 두 요소에
각각 blur/scale 리빌을 걸기 때문에 하나로 합칠 수 없다.

**⚠️ SVG 를 뽑을 때 path 데이터를 콤마로 자르면 안 된다.** `d` 값 안에 콤마가 들어 있어
처음에 그렇게 했다가 XML 자체가 깨졌다(파일은 200 으로 뜨고 브라우저도 조용해서 눈치채기
어렵다). 따옴표 문자열을 통째로 뽑아야 한다. 뽑은 뒤 **원본 데이터와 문자열 동일성을
대조**했다 — 워드마크 10개·행성 1개 전부 일치.

**⚠️ 원본과 두 가지 다르게 갔다.**

1. `.footer{background:transparent}` → **흰색**. 원본은 흰 페이지 위에 얹히는 전제인데
   상세는 그 위가 어두운 밴드(`#0C0C0C`)다.
2. **모바일(≤1023)에서는 푸터를 아예 감춘다** (사용자 결정, 2026-08-20).
   처음엔 사이트의 `.m-footer` 규격(로고 246px · 패딩 80/20/32 · 13px · `column-reverse`)을
   같은 `.footer*` 클래스에 얹어 세로로 쌓았는데, 사용자가 모바일에서는 안 보이길 원해
   `@media (max-width:1023px){ .footer{display:none} }` 한 줄로 바꿨다.
   **⚠️ 되살릴 때 `display:none` 만 지우면 안 된다** — PC 푸터는 로고 448px + 좌우 절대배치라
   375 에서 **121px 넘친다**(`html{overflow-x:clip}` 가 스크롤은 막지만 내용이 잘린다).
   지운 모바일 레이아웃 규칙을 git 이력(`_shared/footer.css`)에서 같이 꺼내 와야 한다.

**⚠️ 회사 정보가 두 곳에 있다.** `src/data/site.ts` 의 `CONTACT`/`FOOTER_LINKS` 와
`_shared/works.js` 의 `FOOTER` 상수. 상세는 별개 문서라 값을 공유할 수 없다 —
주소·연락처가 바뀌면 **둘 다** 고칠 것.

**실측** (1440 / 375, 세 문서): 푸터가 밴드 바로 뒤 마지막 블록 · 높이 = 뷰포트(900/812) ·
흰 배경 · PC 로고/바 좌우 126 · 모바일 로고 246px 좌우 20 · **넘치는 요소 0** ·
가로 스크롤 0 · 깨진 이미지 0 · 링크 3개·카피라이트·주소·이메일·T/F 전부 렌더.

### 28. kb-app 도 컴포넌트로 (네 문서 구조 통일)

사용자 요청으로 kb-app 까지 `<project-detail>` 로 바꿨다. 이제 네 문서가 **완전히 같은
구조**다 — 공용 CSS 4줄 + `<project-detail>` 태그 하나 + `bridge.js`/`works.js` 두 줄.

**바꾼 뒤 렌더가 같은지 지문으로 대조했다** — 변환 전 `main.pd` 안 요소 66개의
위치·크기·display·색·폰트·padding·margin·radius 해시가 `-260543401` 이었고, 변환 후에도
**정확히 같다**(문서 높이 7039 동일). 즉 컴포넌트가 kb-app 의 마크업을 그대로 재현한다.
모바일 375 도 확인: 히어로 812 · `m-hero-bg.jpg` · 모바일 섹션 6(PC 0) · 블록 left 16 ·
width 343 · 간격 16 · 푸터 넘침 0.

지운 것: kb-app 의 인라인 `<script>`(리빌 + Copy URL). `works.js` 가 같은 일을 하므로
**둘 다 두면 복사가 두 번 일어난다.**

**⚠️ 정적 사이트에서 상세를 다시 가져올 때 `kb-app/index.html` 을 통째로 덮으면 안 된다.**
히어로/Overview 마크업이 컴포넌트 속성으로 옮겨졌기 때문이다. 가져올 것은
`projects/kb-app/index.html` 의 **`.pd-sec` 섹션 목록(과 `img` 의 width/height)** 뿐이고,
`css/project-detail.css` 는 지금처럼 계속 동기화한다.

`_shared/style.css` 는 kb-app 만 계속 쓴다 — 그 문서에는 자기 `style.css` 가 없어 리셋을
거기서 받는다. `footer.css` 를 뒤에 두어 푸터 배경(#fff)과 모바일 규칙이 이긴다.

### 29. 썸네일을 누른 횟수만큼 시트가 다시 열리던 문제 (`ProjectSheet`)

사용자 신고: "`.ps-bar` 가 누를 때마다 반복 실행되고 `project-sheet` 도 누른 횟수만큼 실행된다".

**DOM 이 늘어나는 게 아니다** — 몇 번을 눌러도 `.ps-bar`·`#project-sheet`·iframe 은 각 1개다
(portal 이 재마운트되지 않는다). 늘어난 건 **history 항목**이고, 되짚어 나올 때마다
`onPop` 이 상세를 다시 올린 것이다. dev 서버에 붙어 실측:

|                            | 고치기 전                               | 고친 뒤          |
| -------------------------- | --------------------------------------- | ---------------- |
| 썸네일 3연타 → `pushState` | **3회** (`history.length` 30→33)        | **1회** (순증 0) |
| 목록으로 나가는 뒤로가기   | **3번** (앞의 2번은 시트가 다시 올라옴) | **1번**          |

**왜 여러 번 누르게 되는가 — "안 보이는데 눌리는" 구간이 두 개 있었다.**
① 로딩 중에는 `open===false` 라 `.ps-sheet` 가 `translateY(100%)` 로 화면 밖이다. 목록이
그대로 보이고 그대로 눌린다. 피드백은 뷰포트 최상단 6px 바 하나뿐인데 카드는 한참 스크롤된
아래에 있어 **아무 반응이 없어 보인다.** 이 구간은 짧지도 않다 — `BAR_RATE=1.65` 때문에
즉시 로드돼도 최소 ~0.6초, 상한은 `LOAD_GUARD_MS=8000`.
② 닫을 때 `inert` 는 즉시 붙는데 슬라이드는 1.2초다. **inert 요소는 클릭을 아래로
통과시키므로**, 시트가 아직 화면을 덮고 있는 동안 안 보이는 카드가 눌린다
(`elementFromPoint` 로 `.pj-title` 이 잡히는 것 확인).

**고친 것 4가지** — `openSheet` 재진입 가드(`showing` ref) · 이미 상세 주소면 `pushState`
대신 `replaceState` · `html.ps-busy` 로 목록 링크 차단 · `onPop` 에서 같은 상세면 무시.

- **`showing` 은 `ready` 와 다르다.** `ready` = "받아 온 적이 있다"(닫아도 남는다, iframe 재사용용),
  `showing` = "지금 이걸 붙들고 있다"(닫으면 비운다). 둘을 합치면 재오픈 캐시가 죽는다.
- **`ps-busy` 는 `.pj-grid a` 만 끈다.** `.pj-card` 자체를 끄면 `useMagneticCards` 가
  `mouseleave` 를 못 받아 **카드가 밀린 자리에 굳는다.**
- **`SLIDE_MS = 1200` 은 `style.css` 의 `.ps-sheet` transition 과 같아야 한다.** 어긋나면
  목록이 너무 일찍 살아나거나 계속 죽어 있다.
- `requestClose` 의 가드를 `src` → `showing.current` 로 바꿨다. **`src` 는 닫아도 남으므로**
  목록만 보다가 누른 ESC 가 `replaceState` 까지 하고 갔다. 덤으로 `requestClose` 가 안정돼
  `message` 리스너가 매번 재등록되지 않는다.

### 29-b. ⚠️ iframe 은 부모와 **세션 히스토리를 공유한다** — 닫기를 두 번 눌러야 했던 이유

27번을 고친 뒤 사용자가 "마우스로 닫기를 한 번 누르면 안 닫히고 두 번 눌러야 한다"고
보고했다. **살아 있는 iframe 의 `src` 를 바꾸면 그게 히스토리 항목으로 쌓인다.** 실측:

```
카드 A (iframe 첫 로드)   PUSH → history.length 34 → 35     back 1번에 /projects ✓
카드 B (iframe src 교체)  PUSH → history.length 35 → 36     ← +1 이 iframe 네비게이션 항목
   back 1번 → iframe 만 되돌아간다. 부모 주소도 시트도 그대로 (open=true)
   back 2번 → 그제서야 닫힌다
```

**첫 프로젝트만 정상이라 놓치기 쉽다** — 새 iframe 요소의 첫 로드는 항목을 만들지 않는다
(replace 취급). 두 번째로 여는 상세부터 어긋난다. ESC 도 같은 `history.back()` 을 타므로
증상은 동일한데, ESC 테스트를 첫 프로젝트로만 하면 정상으로 보인다.

→ **`<iframe key={src}>`.** src 를 갈아끼우지 않고 요소를 새로 만든다. 같은 src 면 key 도
같아 재마운트되지 않으므로 **같은 상세 재오픈 캐시(18번)는 그대로다** — 재오픈 800ms 만에
`is-open`, 진행 바 `opacity:0` 확인.

→ 그래도 **`requestClose` 에 안전망을 남겼다.** 상세 문서가 자기 안에서 이동하면(앵커·
스크립트 네비게이션) 우리가 못 막고 같은 증상이 재발한다. `history.back()` 후 600ms 안에
안 닫혔으면 `replaceState('/projects')` + 직접 닫는다. `history.back` 을 no-op 으로 만들어
폴백이 실제로 도는 것 확인(+300ms 열린 채 → +900ms 닫힘).

**검증**: A→B→C 연속 + 재오픈까지 전부 back **1번**에 닫힘, `history.length` 35 고정.

### 29-c. ESC 중계 (`_shared/bridge.js` 의 다섯 번째 항목)

**키 이벤트는 프레임 경계를 넘지 않는다.** 부모의 keydown 리스너는 부모 문서에 달려 있어서,
상세 본문을 한 번이라도 클릭해 포커스가 iframe 으로 넘어가면 그 뒤로 ESC 가 부모에 아예
도달하지 않는다 — "아까는 되던 ESC 가 안 된다"가 된다. 다리가 `pdEsc` 로 넘긴다
(부모는 `pdClose` 와 같은 `requestClose`).

**⚠️ 글을 쓰는 중이면 가로채지 않는다** — `input`/`textarea`/`select`/`contenteditable`,
그리고 **한글 입력 조합 중**(`isComposing` · `keyCode === 229`). 조합 중의 ESC 는 조합을
취소하는 키지 화면을 닫는 키가 아니다. 지금 상세 문서에 입력 요소는 없지만 생길 수 있다.

**검증** — bridge 를 same-origin 테스트 프레임에 실제로 물려 6건 (sandbox 라 시트의
iframe 에는 키를 못 넣는다): 본문 ESC → `pdEsc` · 다른 키 무시 · input 안 무시 ·
IME 조합 중 무시 · `.pd-close` 클릭 `pdClose` 유지 · 로드 시 `pdReady{ownClose}` 유지.
부모 쪽은 시트를 열고 `pdEsc` 를 쏴서 한 번에 닫히는 것, 닫힌 뒤 다시 와도 무시되는 것 확인.

**확인 못 한 것**: 실제 마우스 클릭이 `pointer-events:none` 에 막히는지 — 브라우저 패널이
백그라운드라 트러스티드 입력이 자주 유실돼 프로그램 클릭으로 검증했고, **프로그램 클릭은
히트테스트를 우회한다.** computed style 이 `none` 인 것까지만 확인했다.
진행 바가 rAF 경로로 차서 열리는 모습도 여전히 못 봤다(8초 가드로만 열린다 — 15번과 같은 한계).

### 30. ⚠️ sandbox iframe 안에서는 **폰트만** 못 받는다 (CORS)

상세 화면들에서 웹폰트가 전부 시스템 폰트로 폴백돼 있었다. 경로 문제가 아니다 —
`_shared/fonts.css` 의 `/assets/fonts/*.woff2` 7개는 전부 실재하고 200 이다.

원인은 **누가 요청하는가**다. 상세는 `sandbox="allow-scripts"` iframe 안에서 도는데
(`allow-same-origin` 을 일부러 뺐다 — 15번), 그 문서의 origin 은 **`null`(불투명 출처)** 이다.
그런데 `@font-face` 의 폰트 요청만은 **항상 CORS 모드**로 나간다. 이미지·CSS·JS 는 no-cors 라
그냥 뜨므로 **폰트만 조용히 죽는다.** 실제로 불투명 출처 프레임에서 확인한 증상:

```
document.styleSheets[0].href   → .../fonts.css  (링크는 정상)
document.styleSheets[0].cssRules → SecurityError  ← 이제 cross-origin 취급이라는 증거
```

→ `next.config.ts` 에 `headers()` 로 `/assets/fonts/:path*` 에만
`Access-Control-Allow-Origin: *` 를 붙였다. 폰트는 자격증명 없이(anonymous) 요청되므로
`*` 로 충분하다. **`allow-same-origin` 을 되돌리는 쪽으로 풀지 말 것 — 세션 토큰이 열린다.**

**검증**: 7개 파일 전부 `Origin: null` 요청에 ACAO 응답 · 브라우저에서 **실제 cross-origin**
(127.0.0.1↔localhost) CORS fetch 200 `type=cors` 765,892바이트 · `FontFace.load()` cross-origin
`status=loaded` · 대조군 `/assets/ci_logo_white.svg`(헤더 없음)는 그대로 차단 → 스코프가
폰트에만 걸린 것 확인.

**확인 못 한 것**: 실제 시트 iframe 안에서 폰트가 그려지는 모습. **브라우저 패널이 sandbox
프레임의 서브리소스를 아예 차단한다**(네트워크 로그에도 안 남고 CORS 에러도 안 뜬다 —
15번의 `ERR_BLOCKED_BY_CLIENT` 와 같은 한계). 사람이 실제 브라우저에서 봐야 한다.

**정적 사이트(`../insplanet`)에서는 안 터진다** — 거기선 상세를 시트 DOM 에 주입하므로
그냥 same-origin 문서다. 우리만 겪는 문제다.

### 31. 전체메뉴 Projects 배지를 DB 건수로 (`lib/projectCount.ts`)

`.menu-badge` 가 `site.ts` 에 `badge: '42'` 로 박혀 있었다. **어떤 실제 숫자와도 안 맞았다** —
현재 공개 데이터는 40건(완료 36 · 진행중 4)이다. 세는 기준은 **완료 카드 36** 으로 정했다
(사용자 결정). 진행중 표는 토글 뒤라 첫 화면에 안 보이고, 카테고리 칩은 카드를 지우지 않고
`hidden` 만 토글하므로 배지를 거기 맞추면 메뉴를 열 때마다 숫자가 흔들린다.

**⚠️ 배지가 필요한 곳은 `/projects` 가 아니다.** 메뉴는 `PageShell` 이 그리므로 `/` `/about`
`/contact` 에도 같이 붙는데, 그 셋은 DB 를 안 읽는 **정적 렌더 대상**이었다. 매 요청 조회로
두면 세 페이지가 통째로 동적 렌더가 된다. → `unstable_cache`(300초)로 감쌌다.
**빌드 출력으로 확인함** — 셋 다 여전히 `○ (Static)` 이고 `Revalidate 5m` 이 붙었다.

- **`PageShell` 이 async 서버 컴포넌트가 됐다.** 클라이언트 컴포넌트에서 렌더하면 깨진다
  (지금은 전부 서버 페이지에서만 쓴다).
- **`lib/projectCount.ts` 를 클라이언트에서 import 하지 말 것** — `next/cache` 를 쓴다.
- **`/projects` 만 자기 `cards.length` 를 넘긴다.** 그 페이지는 `force-dynamic` 이라 그리드는
  항상 최신인데 배지가 캐시 값이면 눈앞의 카드 수와 어긋나 보인다.
  ⚠️ `cards.length` 가 아니다 — 그건 `toCards()` 가 완료만 거른 36 이라 기준(40)과 어긋난다.
- 조회 실패는 `null` 이고 **배지를 아예 안 그린다** — 틀린 숫자를 남겨 두는 것보다 낫다.
  0건일 때도 안 그린다.
- `select('id', { count: 'exact', head: true })` — 행은 한 건도 안 받는다.
- **모바일 `.m-menu-badge` 는 CSS 만 있고 마크업이 없다**(14번, 모바일 미착수).
  만들 때 같은 prop 을 받아 쓸 것 — 숫자를 다시 손으로 적지 말 것.

**어드민 저장 시 즉시 반영** (`lib/projectCountActions.ts`) — 등록·수정·삭제 뒤에
`refreshProjectCount()` 를 부른다. 안 부르면 5분간 옛 숫자가 남아 "저장했는데 그대로"로 보인다.

- **왜 서버 액션인가** — 어드민 폼은 클라이언트에서 supabase 로 직접 저장한다(서버 라우트를
  안 거친다). 캐시 무효화는 서버에서만 되므로 태그만 터는 액션을 따로 뒀다.
- **⚠️ Next 16 은 `revalidateTag(tag)` 인자 하나를 deprecate 했다** — 두 번째 인자로 옛 값을
  얼마나 더 내줘도 되는지(profile)를 받는다. 여기서는 **서버 액션 전용 `updateTag`** 를 쓴다
  (즉시 만료 = 저장한 사람이 자기가 쓴 값을 바로 본다). **라우트 핸들러에서는 던진다** —
  그쪽에서 필요해지면 `revalidateTag(PROJECT_COUNT_TAG, 'max')`.
- **⚠️ `'use server'` 파일은 async 함수만 export 할 수 있다.** `PROJECT_COUNT_TAG` 상수를 든
  `projectCount.ts` 안에 못 넣어서 파일이 갈렸다.
- 액션에 **권한 검사가 없다.** 서버 액션은 id 만 알면 누구나 부를 수 있지만 하는 일이 캐시
  태그 무효화뿐이라 최악이라도 count 쿼리가 한 번 더 돈다. 데이터를 읽지도 쓰지도 않는다.
- 실패해도 저장 흐름을 막지 않는다(`.catch` 로 로그만) — 최대 5분 뒤 자연 갱신된다.

**검증**: `/` `/about` `/contact` `/projects` 네 곳의 **SSR HTML** 에 `36` 이 들어 있는 것
(하이드레이션 전에도 값이 있다) · `/projects` 는 배지 36 = `.pj-card` 36 개로 **일치** ·
메뉴를 실제로 열어(`#menu-overlay.open`) 배지가 라벨 오른쪽 66×45 알약으로 렌더 ·
서버 액션을 클라이언트 번들에서 캔 id 로 **직접 호출해 200 + `x-action-revalidated: 1`**
(= `updateTag` 가 이 컨텍스트에서 안 던지고 실제로 무효화한다) · 빌드·타입체크 통과.

**확인 못 한 것**: 어드민에서 실제로 저장 → 다른 페이지 배지가 바로 바뀌는 왕복.
**Claude 는 어드민 세션이 없어 anon 키로는 `portfolios` 에 쓸 수 없다.** 사용자가 한 번
등록해 보고 `/about` 메뉴 숫자가 즉시 오르는지 봐야 한다.
**스크린샷도 못 찍었다** — 브라우저 패널이 백그라운드라 컴포지팅이 멈춘다.

**⚠️ 12번의 "시드 11건" 은 옛 상태다** — 지금 `portfolios` 는 40건이고 `public/portfolio/`
아래 상세 폴더도 17개가 미커밋으로 늘어 있다(사용자가 추가). 20·21번이 다루는 네 문서
기준으로 적힌 설명들은 그 사이 늘어난 분량을 반영하지 못한다.

---

## 현재 상태

```
브랜치   main
커밋     6deb523 포트폴리오   ← 마지막 커밋. 정적 사이트 흡수분(14·15번)은 아직 미커밋
태그     backup/css-modules-full   ← 되돌린 전체 CSS 변환 (로컬만)
정적 원본  ../insplanet  포팅 기준점 b997b24 → 현재 bf2ac6e (PC 분량만 흡수, 모바일 미착수)
```

빌드·타입체크 통과.

**마케팅 라우트는 더 이상 "초기 커밋과 diff 0" 이 아니다** — `7ef961b`(필터바 reveal
수정)와 `d01841d`(`/projects` DB 연동)가 건드렸다. 레거시 클래스명(`.pj-card` 등)은
전부 그대로 유지했다.

`8edc55f` 는 **두 작업 단위가 섞인 커밋이다.** `AdminShell`·`UserForm`·users 화면을
양쪽이 모두 수정해서 파일 단위로 나누면 중간 커밋 빌드가 깨진다. 이력을 볼 때 유의.

### Supabase 마이그레이션 실행 상태

| 파일                                     | 실행됨?                                       |
| ---------------------------------------- | --------------------------------------------- |
| `001_admin_users.sql`                    | ✅ 테이블 컬럼 대조                           |
| `002_admin_users_sync.sql`               | ⚠️ **미확인** — 9번 시점엔 미실행이었다       |
| `003_fix_admin_users_rls_recursion.sql`  | ✅ `pg_policies` 확인                         |
| `004_portfolios.sql`                     | ✅ 컬럼·정책 확인                             |
| `005_portfolios_seed.sql`                | ✅ 15건(종료 11 · 진행 4) 렌더 확인           |
| `006_portfolio_storage.sql`              | ✅ 버킷·정책 확인 (사용자 보고)               |
| `007_drop_legacy_portfolio_policies.sql` | ⚠️ **미확인** — 작성 후 실행 여부 확인 못 함  |
| `008_portfolio_detail_html.sql`          | ✅ 실행됨 (html_file 에 값이 들어간 행 확인)  |
| `009_portfolio_seed_thumbs.sql`          | ❌ **미실행** — 작성만 했다 (14번, 아래 참고) |

anon 키로는 `admin_users` 를 못 읽어(RLS 가 `to authenticated`) 프로필 수를 확인할 수 없다.
**002 와 007 실행 여부부터 확인할 것.** 002 를 빠뜨리면 새 계정마다 9번을 반복하고,
007 을 빠뜨리면 미공개 포트폴리오가 REST API 로 계속 새어 나간다(13번).

---

## 다음에 할 일

### 검증 못 한 것 (먼저 확인 필요)

**Claude 는 아직 로그인한 어드민 화면을 직접 못 봤다.** 세션이 없어 게이트를 못 넘는다.
사용자가 브라우저에서 확인한 것은 로그인·프로필 차단 화면·계정 등록 성공까지다.

아무도 확인하지 않은 것:

- **메뉴권한 차단(11번)** — 권한 뺀 계정으로 미확인. 경로→권한 매핑 로직만 9건 통과.
- **Storage 업로드 왕복(12번)** — 세션이 없어 쓰기 정책을 통과할 수 없다.
  버킷·정책 존재는 확인했지만 **파일을 실제로 올려본 적이 없다.**
- **어드민 포트폴리오 CRUD 화면** — 코드는 붙었지만 실제 등록/수정/삭제 미확인.
- **`/projects` 2행 이후 스크롤 reveal** — 브라우저 패널이 백그라운드로 내려가
  `IntersectionObserver`·`rAF` 가 정지해 확인 불가. 첫 행 reveal 과 필터바 reveal
  (둘 다 IO 경유)은 확인했으므로 정상일 가능성이 높지만 **직접 못 봤다.**

견적문의는 **`quotes` 가 비어 있어 실제 렌더를 못 봤다.** 필터·표시 로직만 따로 검증했다.

`/projects` 에서 **확인한 것**: 카드 11장·수상 심볼 4개·진행중 4행·`\n`→`<br/>`·
Web 필터 5장·진행중 토글·`use_yn='N'` 제외(11→10). 전부 프로덕션 빌드 실측이다.

### 기능 붙이기

| 메뉴           | 테이블           | 상태                                                      |
| -------------- | ---------------- | --------------------------------------------------------- |
| 포트폴리오관리 | `portfolios` ✅  | **연동 완료** — CRUD + Storage 업로드 + `/projects` 공개  |
| 사용자관리     | `admin_users` ✅ | **연동 완료** — 목록·상세·수정·등록·메뉴권한              |
| 견적문의관리   | `quotes` ✅      | **연동 완료** — 목록·필터·상태변경·상세 (데이터 0건)      |
| 리크루트관리   | `recruits`       | 테이블 없음                                               |
| 메인관리       | 없음             | 스키마 설계부터. 폼은 스켈레톤(업로드만 동작, 저장 안 됨) |

**⚠️ `pageviews` 는 이 저장소와 무관한 고아 테이블이다.**
컬럼은 `id · created_at · path · referrer · visitor_id · utm_source/medium/campaign`.
`src/**`·`public/js`·`.sql`·전체 git 히스토리(`log --all -S`) 어디에도 등장하지 않는다.
**삭제할지, 방문 추적을 실제로 붙일지 결정 필요.**

마케팅에서 DB 에 붙은 곳은 이제 두 곳이다 — `ContactForm` 의 `quotes` insert,
`/projects` 의 `portfolios` 조회.

새 메뉴를 붙이는 순서는 **스키마 설계 → 목록 조회 → 등록/수정 저장 → 삭제 → 필수값
얼랏**이 자연스럽다. `src/lib/{quotes,portfolios}.ts` 처럼 타입·변환·검증을 한 파일에
모으고 화면은 그걸 쓰는 구조를 따라가면 된다.

### 바로 이어서 할 만한 것

- **`009` 실행** — 안 돌리면 `/projects` 가 계속 옛 `proj-*.png` 를 가리킨다.
  그때까지 `public/assets/projects/proj-01~11.png` 를 지우면 안 된다(정적 사이트는 지웠다).
  돌린 뒤에 지울 것.
- **모바일 3페이지 + `mobile.html` 확장** — 정적 사이트에서 가장 큰 덩어리이고 아직 손도
  안 댔다. CSS 는 이미 다 들어와 있다(14번). 이걸 끝낸 뒤에 어댑티브 경계를 1023 으로 올린다.
- **실데이터 입력** — 지금 `/projects` 에 뜨는 11건은 시드다(12번). 담당자에게 실제
  포트폴리오 목록과 이미지를 받아야 한다.
- **`002`·`007` 실행 여부 확인** (위 「마이그레이션 실행 상태」)
- **`quotes` 에 메뉴권한 RLS** — `portfolios` 는 004 에서 걸었지만 `quotes` 는 아직
  메뉴권한과 무관하게 열려 있다(11번).
- **카드 클릭 → 상세 HTML 이동** — 컬럼은 있고 링크는 미연결 (사용자가 "추후" 로 보류)
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
8. **RLS permissive 정책은 OR 로 합쳐진다** — 좁은 정책을 새로 걸어도 느슨한 정책이
   하나 남아 있으면 그쪽이 이긴다. 정책을 손대기 전에 `pg_policies` 로 **기존 정책부터
   확인할 것.** 대시보드에서 만들어 둔 게 있을 수 있다 (13번).
9. **`for all` 정책은 SELECT 까지 포함한다** — 쓰기 권한만 의도했는데 읽기가 같이
   열리거나, 정책이 자기 테이블을 참조하면 `42P17` 무한재귀가 난다 (8번·13번).
10. **Next dev 서버는 같은 디렉터리에서 두 개 못 띄운다** — 두 번째가 조용히 죽는다.
    다른 포트로 검증이 필요하면 `next build && next start -p <포트>` 를 쓸 것.
11. **불투명 출처(sandbox) iframe 에서는 폰트만 CORS 를 탄다** — 이미지·CSS·JS 는 멀쩡한데
    `@font-face` 만 조용히 폴백된다. 정적 에셋에 `Access-Control-Allow-Origin` 이 필요하다 (30번).

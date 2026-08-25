# Insplanet 공식 사이트 — 작업 인수인계

> 정적 HTML 사이트를 Next.js 16 App Router + TypeScript로 포팅한 프로젝트.
> 마케팅 사이트(`/`, `/about`, `/projects`, `/contact`)와 어드민(`/admin/*`)이 한 저장소에 있다.
> 구조 설명은 [README.md](README.md)에 있고, 이 문서는 **작업 이력과 결정 사항**만 담는다.

---

## 📌 Claude 에게 — 이 문서를 계속 살려둘 것

**의미 있는 작업 단위를 끝낼 때마다 이 문서를 갱신하고 별도 커밋한다.**
사용자가 매번 요청하지 않아도 스스로 한다. 세션은 끊기지만 이 문서는 남는다.

갱신 기준은 `/handoff` 명령어(`.claude/commands/handoff.md`)에 정리돼 있다.
직접 갱신하든 그 명령어를 쓰든 결과는 같아야 한다. 핵심만 옮기면:

- **코드를 읽어서 알 수 있는 것은 쓰지 않는다** — 파일 목록·함수 시그니처·구조 설명(README 담당)
- **코드만 봐서는 알 수 없는 것을 쓴다** — 왜 그 선택을 했는지, 시도했다 실패한 것과 그 이유,
  사용자와 합의한 결정, 미해결 질문, 조용히 깨지는 함정
- **검증하지 못한 것을 명시한다** — "확인함"과 "확인 못 함"을 절대 섞지 않는다
- **분량을 관리한다** — 매 세션 컨텍스트에 로드되므로, 해결되고 재발 위험 없는 이슈의 장황한
  검증 서사·수치는 지우고 **함정·결정·미해결만** 남긴다. (2026-08-24 압축: 1497→약 700줄.
  잘려나간 상세 서사가 필요하면 git 이력에서 이 커밋 이전 버전을 볼 것.)

---

## ⚠️ 가장 중요한 제약 — 레거시 런타임 결합

`public/js`에 정적 사이트 시절의 런타임 6,000여 줄이 **그대로** 들어 있다
(`main.js`, `blob.js`, `cta-glow.js`, `about-hero.js`, `about-blackhole.js`, `insight-background.bundle.js`).
이 코드가 DOM을 **클래스명과 ID로 직접 잡는다** — 클래스 셀렉터 조회 40여 곳,
classList add/toggle/remove 40여 곳, `#ci-logo #full-menu #lets-talk #head-title #bg-line #stage #left-block #symbol #blob` 등.

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

**왜 마케팅은 전역인가**: 전체를 CSS Modules로 바꿔봤다가 되돌렸다. Turbopack이 루트 레이아웃을
공유하는 라우트의 CSS 모듈을 **한 청크로 합쳐서**, `/about`이 contact·projects CSS까지 받아
페이로드가 최대 +101% 늘었다. `experimental.cssChunking`(webpack 전용), 라우트별 얇은
`layout.tsx` 둘 다 효과 없었다 — **다시 시도하지 말 것.**

되돌린 전체 변환 작업은 **`backup/css-modules-full` 태그**(로컬 전용, 원격 미푸시)에 보존돼
있다. contact.css 를 여러 파일로 쪼갠 결과물이 필요해지면 거기서 꺼내 쓰면 된다.

### 어드민 CSS Modules 구조

`components/admin/` 아래에 `theme`(토큰) · `kit`(페이지 프리미티브) · `form`(라벨|컨트롤 행) ·
`AdminShell` · `ui` 모듈이 있다. 토큰은 CSS 커스텀 프로퍼티라 DOM 상속을 탄다 — 하위 모듈은
`theme.module.css`를 import하지 않아도 `var(--ink)`를 그대로 쓸 수 있다.

**⚠️ TS는 CSS Module 멤버를 `any`로 본다.** `kit.존재하지않는이름`을 써도 타입체크가 통과하고
런타임에 `undefined`가 className에 들어간다. 클래스명을 바꿀 때는 참조처를 직접 grep할 것.

### 어드민은 공용 컴포넌트를 쓴다 (CSS 클래스보다 우선)

`src/components/{button,badge,avatar,icon,text,layouts}` 의 공용 컴포넌트로 어드민 전 화면을
교체했다. **어드민에서 버튼·배지·아바타·아이콘·타이포·flex 를 CSS 클래스로 새로 만들지 말 것.**

| 쓸 것                | 대신 지운 것                                                                  |
| -------------------- | ----------------------------------------------------------------------------- |
| `<Button>`           | `kit.btn` `btnPrimary` `btnGhost` `btnSm` 등                                  |
| `<Badge>`            | `ui.tsx` 의 `Badge`/`BadgeTone`, `ui.module.css` 의 `.badge*`, `kit.brandTag` |
| `<Avatar>`           | `kit.avatar`                                                                  |
| `<Icon>`             | 손으로 그려 넣었던 인라인 SVG                                                 |
| `<Text>` `<Heading>` | `.title` `.desc` `.statLabel` `.emptyTitle` … 폰트 크기/굵기 전용 클래스      |
| `<Flex>`             | `.pageHead` `.pageActions` `.actions` `.inline` 같은 flex 전용 클래스         |

색 규칙 — **primary(등록·저장·수정·로그인) = `color="BLUE" variant="solid"`**,
secondary(목록·취소·조회·파일찾기) = `color="GRAY" variant="outline"`, 삭제 = `color="RED" variant="outline"`.
어드민의 기존 primary 는 검정이었지만 공용 팔레트에 그 색이 없어 파랑으로 통일했다.

**`Button` 은 `href` 를 받으면 `next/link` 로 렌더한다.** 이동용 버튼을 `<Link><Button/></Link>`
로 감싸면 `<a>` 안에 `<button>` 이 들어가 스펙 위반 + 포커스가 두 번 잡힌다. 반드시 `href` 쪽을 쓸 것.

**색은 admin theme 토큰 문자열을 그대로 넘긴다** — `<Text color="var(--muted)">`. `theme.ts` 의
hex 를 직접 쓰지 말 것.

⚠️ **`.button` 이 `display:inline-flex` 를 갖는다.** 반응형에서 버튼을 `display:none` 으로
숨기려면 클래스 하나로는 번들 순서에 따라 질 수 있다 — 특이도를 올려야 한다
(`AdminShell.module.css` 의 `.siteLink.siteLink` 처럼).

⚠️ **`Text` 는 레이아웃 prop(`mb` `px` …)이 없다.** `Flex` 의 gap/margin 으로 풀거나 className 을 쓸 것.

### 공용 컴포넌트에서 잡은 버그 3개 (같은 패턴을 다시 만들지 말 것)

전부 빌드·타입체크·콘솔 에러 없이 조용히 값이 안 먹은 케이스였다. **새 prop 을 만들면
computed style 로 값이 실제로 먹는지 확인할 것.**

1. **`Flex` 의 `p/px/py/m/mx/my` 가 전부 무시됨** — shorthand(`padding-inline`) 뒤에 미정의
   커스텀 프로퍼티를 참조하는 longhand(`padding-left: var(--layout-pl)`, 미정의)를 두면
   그 선언이 무효(IACVT)가 되면서 속성 전체가 초기값 0으로 리셋된다. → 여백/크기는 CSS 변수를
   버리고 `Flex.tsx` 가 인라인 스타일로 직접 넣는다.
2. **`Text`/`Heading` 의 `fontSize` prop 이 죽어 있었음** — `.text{font-size:var(--custom-font-size)}`
   가 `.size_N` 보다 CSS 순서상 **앞**에 있어 `size` 기본값(`"2"`)이 항상 이겼다. →
   `.customSize` 를 파일 끝으로 옮기고 `fontSize` 를 넘겼을 때만 붙인다.
3. **`Flex` 의 `align`/`justify` 가 중첩 Flex 로 새어 나감** — `--flex-align` 이 상속되는
   커스텀 프로퍼티인데 `align` 을 안 준 안쪽 Flex 가 바깥 값을 물려받았다. → `.flex` 에서
   `--flex-align` `--flex-justify` `--flex-wrap` `--flex-gap*` 을 **매번 초기화**한다.
   새 축 변수를 추가하면 초기화도 같이 넣을 것. (같은 이유로 `Button`/`Badge` 라벨의
   `size_N{font-size}` 도 안 먹어서 `LABEL_SIZE` 맵으로 별도 전달한다.)

---

## 포트폴리오 상세 iframe 시스템 (`public/portfolio/`)

퍼블리셔가 만든 정적 HTML 상세 페이지를 프로젝트 카드 클릭 시 "올라오는 시트"(`ProjectSheet.tsx`,
라우트 `/projects/[id]`)에 띄운다. 이 하위 시스템은 iframe 경계 때문에 함정이 많고 지금도
새 상세를 추가할 때마다 재발할 수 있으니 통째로 읽을 것.

**핵심 아키텍처 결정 — 원본은 상세 HTML 을 `fetch` 해서 페이지에 주입하지만, 우리는 하지
않는다.** 주입하면 퍼블리셔 문서의 스크립트가 우리 문서에서 돌면서 `localStorage` 의 Supabase
세션 토큰을 읽을 수 있다. 그래서 `sandbox="allow-scripts"` (⚠️ **`allow-same-origin` 을
절대 추가하지 말 것** — 세션 토큰이 열린다) iframe 을 그대로 쓴다.

**폴더 구조**: `_shared/`(fonts.css · style.css · project-detail.css · footer.css ·
bridge.js · works.js/css) 는 공용 한 벌, 프로젝트 폴더(`kb-app/` 등)는 하나씩. 새 프로젝트는
`_template/` 을 복사한다. ⚠️ **폴더명을 바꾸면 `portfolios.html_file`(DB, `<슬러그>/index.html`
형식) 이 깨진다** — 폴더명과 어드민 등록값을 항상 같이 바꿀 것.

**문서 종류가 둘이다**: kb-app 은 `<project-detail>` 커스텀 엘리먼트(히어로+Overview+본문밴드+
푸터를 전부 그림, `_shared/works.js`)로 통일된 반면, onNuri·shinhan·dap 은 자립형 문서로
`.pd-*` 디자인 시스템을 안 쓴다(`_shared/*.css` 를 연결하면 오히려 충돌한다). 새 상세를
`<project-detail>` 템플릿으로 통일할지는 프로젝트별 문구(EN 제목·Client·Launch·Overview·
platform URL)가 갖춰져야 가능 — 본문 이미지까지 Figma 렌더 이미지로 바꾸는 건 권장하지 않는다
(디자이너가 다시 뽑아야 하는 사실상 재작업).

### 반드시 지킬 규칙

- **iframe 은 내용 높이가 아니라 뷰포트 크기로 고정한다** (`.pd-hero{height:100vh}` 등 CSS가
  "자신이 곧 뷰포트"라는 전제 위에 있다). 높이 통지로 내용만큼 늘리면 `100vh`가 iframe 자기
  높이로 풀려 무한히 자라고 `position:fixed`가 문서 맨 위에 붙는다.
- **`<iframe key={src}>` 를 쓴다.** src 를 갈아끼우면(같은 iframe 요소 유지) 그게 브라우저
  히스토리 항목으로 쌓여 **닫기를 두 번 눌러야 하는 버그**가 난다(두 번째 상세부터, 첫 프로젝트는
  우연히 정상으로 보여 놓치기 쉽다). 요소를 새로 만들면 항목이 안 쌓인다. 그래도
  `requestClose` 에 안전망(`history.back()` 후 600ms 안에 안 닫히면 `replaceState`+직접 닫기)을
  남겨 뒀다 — 상세 문서 자체 네비게이션은 이걸로도 못 막는다.
- **iframe 재오픈 가드 두 종류를 구분한다** — `ready`(받아온 적 있음, 닫아도 남음, iframe
  재사용용) vs `showing`(지금 붙들고 있음, 닫으면 비움). 합치면 재오픈 캐시가 죽는다.
  같은 이유로 `openSheet` 재진입 가드, 이미 상세 주소면 `pushState` 대신 `replaceState`,
  `html.ps-busy`(로딩 중 `.pj-grid a` 만 차단 — `.pj-card` 자체를 끄면 `useMagneticCards` 가
  `mouseleave` 를 못 받아 카드가 밀린 자리에 굳는다)로 "안 보이는데 눌리는" 재오픈을 막았다.
- **`_shared/bridge.js` 가 iframe 경계를 넘는 5가지를 중계한다** — 안 넣으면 전부 재현된다:
  1. `.pd-close` 클릭을 가로채 `pdClose` 로 부모에 전달 (sandbox 라 상위 이동을 스스로 못 함)
  2. `pdReady{ownClose}` 로 상세가 자체 닫기를 가졌는지 알려 부모가 `.ps-close` X 를 숨김
  3. 좌표를 넘겨 `Cursor.tsx` 가 iframe 위에서도 커스텀 커서를 그리게 함 (`framed` 플래그)
  4. `pdShareUrl`(부모→자식) 로 실제 공유 URL 전달 — iframe 의 `location` 이
     `/portfolio/<슬러그>/...` 라 그대로 Copy URL 하면 공유가 안 됨. sandbox 는 불투명 출처라
     clipboard API 도 막혀 `execCommand` 폴백이 실제 경로.
  5. `pdEsc` 로 ESC 키 중계 — keydown 리스너는 프레임을 안 넘으므로 상세 클릭 후 포커스가
     iframe 으로 넘어가면 부모가 ESC 를 영영 못 받는다. `input`/`textarea`/`contenteditable`/
     한글 IME 조합 중(`isComposing`)에는 가로채지 않는다.
  - 여기에 **lazy-load 치수 보험**도 얹혀 있다: `loading="lazy"` 인데 `width`/`height` 가
    없는 이미지는 자동으로 eager 로 바꾼다(아래 이미지 성능 항목 참고).
- **⚠️ sandbox iframe(불투명 출처)에서는 `@font-face` 요청만 CORS 를 탄다.** 이미지·CSS·JS 는
  no-cors 로 그냥 뜨는데 폰트만 조용히 시스템 폰트로 폴백된다. → `next.config.ts` 의
  `headers()` 로 `/assets/fonts/:path*` 에 `Access-Control-Allow-Origin: *` 를 붙였다.
  **`allow-same-origin` 을 되돌려서 풀지 말 것.**
- **상세 산출물을 옮길 때 CSS 의 `url()` 까지 확인할 것** — HTML 의 `src`/`href` 만 봐서는
  폰트 등 절반이 안 보인다(`fonts.css` 의 상대경로가 옮긴 폴더 기준으로 깨짐).
- **`body{overflow-x:hidden}` 은 문서가 옆으로 스크롤되는 것을 못 막는다** — 스크롤 인 연출이
  요소를 화면 밖에서 대기시키면 그대로 밀린다. `html{overflow-x:clip}` 을 쓸 것
  (스크롤 컨테이너를 안 만들어 `position:sticky` 도 안 죽인다).
- **정적 사이트에서 상세를 다시 가져올 때 `kb-app/index.html` 을 통째로 덮지 말 것** — 히어로/
  Overview 마크업이 컴포넌트 속성으로 옮겨졌다. 가져올 건 `.pd-sec` 섹션 목록(과 img
  width/height)뿐이고, `_shared/project-detail.css` 는 정적 사이트 쪽이 계속 바뀌므로
  **매번 동기화할 것**(1024 앵커·모바일 상세·히어로 높이 등 이미 3번 어긋났었다).

## 지금까지 한 일 (요약)

**초기 설정 & 어드민 연동**

- GitHub 비공개 저장소 등록, `.env.*` 전체 gitignore.
- 어드민을 기획서(`관리자시스템_화면설계서20260703.pptx`, 45p) 기준 5메뉴 구조로, 이후 공용
  컴포넌트로 전면 교체(버튼 31·배지 9·아바타 1곳 등). 메인관리는 A타입(히스토리 관리형) 결정.
- **견적문의관리** — `quotes` 테이블은 이미 존재(Contact 폼이 씀). 핵심은 `project_fields`(jsonb) —
  값이 `'웹사이트'`처럼 **한글 문자열 그대로**라 어드민 필터 선택지를 `adminOptions.ts` 가
  `PROJECT_FIELDS` 에서 파생시킨다(손으로 다시 적지 말 것). 첨부파일 컬럼 없음(Storage 미착수).
- **사용자관리** — Supabase Auth 계정에 기획서가 요구하는 사용자명/전화/메뉴권한이 없어
  `admin_users` 프로필 테이블을 1:1로 붙였다. 미해결: 기획서는 ID 로그인, 구현은 이메일
  로그인이라 `login_id`(표시용)와 `email`(credential) 둘 다 있음.
  - **등록은 서버 라우트(`POST /api/admin/users`, `service_role`)로만 가능** — anon 키로는
    `auth.admin.createUser`가 403, `auth.signUp`은 현재 세션이 새 계정으로 바뀌어버린다.
    ⚠️ **`service_role` 은 RLS 를 전부 우회한다** — 호출자 권한 검사를 라우트가 직접 해야 함.
    프로필 insert 실패 시 방금 만든 Auth 계정을 롤백 삭제한다(안 하면 "로그인은 되는데 프로필이
    없어 아무 데도 못 들어가는" 계정이 쌓인다 — 실제로 겪음).
  - **`admin_users` RLS 무한재귀(`003`)** — 001의 쓰기 정책이 `for all to authenticated`(SELECT
    포함) + 자기 테이블 참조라 `42P17`. `has_admin_permission()`(`security definer`,
    `set search_path` 필수)로 권한 판정을 옮기고 쓰기 정책을 insert/update/delete로 분리해 해결.
    **자기 참조 정책을 새로 만들 때 같은 함정을 반복하지 말 것.**
  - 이 재귀를 고치자 "계정 프로필이 없습니다" 화면이 드러났다 — `002`(프로필 sync 마이그레이션)가
    실행된 적이 없었던 것. **새 환경은 001→002→003 순서로 반드시 전부 실행할 것.**
  - `isMissingTable` 이 메시지 정규식 매칭이라 컬럼 어긋남(`PGRST204`/`42703`)까지 "테이블
    없음"으로 오분류했다 — **에러는 코드로만 판정한다.** `AdminShell` 이 에러를 삼키던 것도
    고쳐서(위 진단이 늦어진 원인) 이제 화면은 안 막고 띠 배너로만 알린다.
  - **메뉴권한을 화면에 반영** — 탭 숨김 + URL 직접 입력도 차단(사용자 합의: "숨긴다" 쪽).
    ⚠️ 이건 화면 차단이지 보안이 아니다 — 그 계정 토큰으로 REST API 직접 호출하면 그대로
    읽힌다. 서버측 실제 차단은 `admin_users`·`portfolios` 쓰기(RLS)와 `/api/admin/users` 뿐이고,
    **`quotes` 는 메뉴권한과 무관하게 열려 있다.**

**포트폴리오 DB 연동 + `/projects` 공개**

- 기존 `/projects` 40장은 시드 RNG 로 만든 가짜 데이터라 "지금 보이는 걸 DB로 옮긴다"가
  성립하지 않아 11건만 새로 시드했다(`005`). 담당자에게 실제 목록을 받아야 한다.
- ⚠️ **조회는 반드시 서버에서** — 클라이언트에서 뒤늦게 채우면 마운트 시점에 DOM 카드 수를
  세는 reveal 이펙트가 0을 보고 그리드 전체가 `opacity:0`으로 남는다(콘솔 에러 없음).
- ISR(`revalidate=60`)은 stale-while-revalidate 라 만료 후 **첫 요청도 옛 화면**을 줘서 "두 번
  새로고침해야 반영"처럼 보인다 — 지금은 `force-dynamic`. 트래픽 늘면 ISR + 어드민 저장 시
  `revalidatePath` 조합으로 되돌릴 것.
- **RLS permissive 정책은 OR로 합쳐진다** — `use_yn='Y'` 로 좁게 걸어도 대시보드에서 미리
  만들어 둔 느슨한 정책이 하나 남아 있으면 그쪽이 이겨 `use_yn='N'` 행도 새어 나갔다(`007`에서
  제거). **새 테이블에 RLS 걸 때는 `pg_policies` 부터 확인.** 쿼리에도 `use_yn` 필터를
  이중으로 걸어 RLS 하나에만 기대지 않는다.
- 폼의 진행상태별 입력 비활성을 없앴다(사용자 요청) — 이때 `toRow` 가 반대쪽을 NULL 로 눕히던
  로직도 같이 없앴다(안 그러면 종료로 바꾸기 전 올린 썸네일이 저장 시 조용히 사라짐).
- 프로젝트명 줄바꿈은 어드민에서 `\n` 두 글자로 입력, DB엔 진짜 개행 — `toRow`/`toDraft` 가
  경계에서 변환한다.

**정적 사이트(`../insplanet`) 흡수 — PC 분량 (2026-08-19, 기준점 `b997b24`)**

- About 04 섹션(「금융×모빌리티」→Experience, 카드 4개 전면 교체, 갤러리가 8장 마퀴 밴드로),
  About 07 마무리 이미지가 핀 확대 스크럽으로, About 리빌을 `AboutReveals.tsx`로 컴포넌트화,
  Contact 약관 링크, 커서 GROW_SEL 확장, 썸네일 20장 + `009` 마이그레이션(⚠️ **미실행** — 아래
  마이그레이션 표 참고, 실행 전엔 `public/assets/projects/proj-*.png` 지우면 안 됨).
- **의도적으로 안 가져온 것**: 어댑티브 경계 767→1023(당시 모바일 페이지가 없어서 — 이후 34번
  에서 아예 반응형으로 전환해 해소됨), 모바일 마크업/런타임 전체(CSS는 이미 다 들어와 있었음).

**Figma 연동 + 모바일 홈 (2026-08-24)**

- `scripts/figma.mjs` 로 Figma REST API 직접 조회(`tree`/`png`/`text`/`meta`). 토큰은
  `.env.local`(`FIGMA_TOKEN`/`FIGMA_FILE_KEY`), 채팅으로 받지 않는다.
  ⚠️ **API가 숨긴 레이어(`visible:false`)까지 내려준다** — 트리만 읽고 안 보이는 요소를
  만들 뻔했다(모바일 푸터 "Scroll to Top" 버튼 등). 기본으로 숨김 레이어를 거르되(`SHOW_HIDDEN=1`
  로 켤 수 있음), **트리를 읽었으면 PNG 로도 대조할 것.**
- 모바일 홈에 빠져 있던 Projects·Say Hello·푸터 챕터를 정적 사이트 마크업 기준으로 채웠다.
  Projects 캐러셀은 PC와 같은 DB 조회(`is_main`)를 쓴다 — 두 페이지가 같은 슬라이드를 보여줘야
  하므로 로직을 갈라두지 말 것. 현재 카드는 `offsetLeft` 최근접으로 계산한다(gap 때문에
  `index*width`로는 어긋남). 푸터 로고는 `.m-footer-ci-*` 전용 클래스여야 한다 — PC 클래스를
  재사용하면 PC 챕터 전용 리빌 규칙에 걸려 영영 안 보인다.
- ⚠️ **확인 못 함 — 리빌 애니메이션.** 브라우저 패널에서 IntersectionObserver 가 콜백을 안 줘서
  강제로 `.in` 클래스를 넣어 레이아웃만 확인했다. **사람이 실제 폰에서 스크롤해 봐야 한다.**

**어댑티브 → 진짜 반응형으로 (2026-08-24)**

- 문제: 창 크기를 바꾸면 `/mobile`↔`/` 리다이렉트가 **문서 로드 시점에 한 번만** 돌아서, 경계를
  넘나들며 리사이즈하면 모바일 CSS(`@media max-width:1023px`)가 꺼진 채 모바일 마크업만 남아
  "메인이 검게 보임/CSS가 사라짐" 증상이 났다.
- → **`/` 하나가 PC/모바일 마크업을 둘 다 그리고 `home-responsive.css` 가 폭으로 가른다.**
  `/mobile` 은 `permanentRedirect('/')` 만 남기고 `AdaptiveRedirect`/`MobileRuntime`/
  `styles/mobile.css` 는 삭제. 서버가 뷰포트를 모르므로 JS 로 한쪽만 마운트하면 하이드레이션
  불일치가 나서 CSS로 가르는 쪽을 택했다 — 경계를 넘어도 **리로드 없이** 바뀐다(실측 확인).
  경계도 768→1024로 올라가 14번의 "모바일 완성 후 올릴 것" 과제가 자연히 해소됐다.
- 레거시 `main.js` 는 로드 시 한 번 바인딩하는 방식이라 두 마크업이 항상 DOM에 있는 이 구조와
  오히려 잘 맞는다(재바인딩 불필요).
- ⚠️ **`#insight-shader` 는 노드가 하나뿐이어야 한다** — 셰이더 번들이 `getElementById`로 첫
  번째에만 React 루트를 만들어서, 노드는 데스크톱 `Insight` 안에 한 번만 두고
  `InsightShaderSlot` 이 폭에 따라 `.insight-card`↔`.m-insight-frame` 으로 **옮긴다**(캔버스
  컨텍스트 유지됨). 둘 중 하나에 상태를 넣게 되면 이 방식을 재검토할 것.
- ⚠️ **데스크톱 푸터는 `#page-root:has(.m-footer) .footer` 로 감춘다** — 모바일 화면이 없는
  라우트가 남으면 그쪽에서는 계속 보여야 하므로 무조건 숨기면 안 된다(2026-08-24 기준 전부
  대응돼 이 조건은 지금 항상 거짓이지만, 셀렉터는 남겨 둔다).
- **어댑티브였던 about·projects·contact 모두 반응형으로 전환 완료** — `MobileAbout`/
  `MobileProjectsPage`/`MobileContact` 가 각 라우트에 붙었다. 새 라우트를 반응형으로 붙일 때는
  이 세 컴포넌트를 템플릿으로 삼으면 된다(정적 사이트의 `mobile-*.html` 을 그대로 옮기고,
  CSS(`.ma-*` `.mc-*` `.mp-*`)는 이미 style.css 에 들어와 있어 새로 쓸 필요 없음).

**Contact 모바일 (2026-08-24, `MobileContact`)**

- 정적 사이트 `mobile-contact.html` 을 그대로 옮겼다 — 히어로 → 폼 step1(칩) → 폼 step2(정보/
  내용/동의/제출) → Join Us → Careers 팝업 → 푸터. CSS(`.mc-*` `.mr-*`)는 이미 style.css 에
  다 들어와 있었다(PC `.ct-*`/`.rc-*` 와 완전히 분리된 프리픽스).
- **PC 의 `ChipGroup`/`FilteredInput`/`FileRow` 를 그대로 재사용하지 않고 `Mobile*` 버전을
  새로 만들었다** — 두 트리를 클래스명으로 완전히 분리해 둔 기존 관례(`.ma-*`/`.mc-*`/`.mp-*`
  vs `.ct-*`)를 따른 것. prop 으로 클래스 프리픽스를 넘기는 방법도 있었지만, 다른 Mobile\*
  컴포넌트들(`MobileAbout` 등)도 PC 컴포넌트를 참조하지 않는 독립 트리라 그 패턴을 유지했다.
- **`jumpToField`(`lib/formGating.ts`)에 `flashClass` 옵션을 추가했다**(기본값 `'ct-flash'`) —
  PC/모바일이 필수값 미입력 시 펄스시키는 CSS 클래스가 다르다(`.ct-flash` vs `.mc-flash`).
  이 유틸은 PC 도 이미 인퀴리 폼+recruit 팝업 둘이 공유하던 것이라 파라미터화가 자연스러웠다.
- **칩 옵션 라벨은 `mobile-contact.html` 을 손으로 베끼지 않고 PC 와 같은 `PROJECT_FIELDS`/
  `RECRUIT_ROLES`(`data/contact.ts`)에서 가져온다** — 정적 페이지가 먼저 쓰였던 문구("CMS",
  "유지보수" 등)가 PC 확정본과 다르게 남아 있었다(현재는 "CMS ∙ 시스템", "연간 유지보수").
  값이 갈리면 `quotes.project_fields` 에 어긋난 문자열이 저장되고 어드민 필터와도 안 맞는다.
- **Careers 팝업(`.mr-popup`)은 PC `RecruitModal` 의 딤 배경 모달이 아니라 풀스크린 시트다**
  (닫기는 X/ESC 뿐, 바깥 클릭 닫기 없음). 잠금도 정적 사이트의 구식 touchmove 체이닝 방지
  없이 PC 와 같은 `html.rc-lock`(`overflow:hidden`) + Lenis stop 만 썼다 — `.mr-scroll` 에
  이미 `overscroll-behavior:contain` 이 걸려 있어 최신 브라우저에서는 그걸로 충분하다(확인 못
  함: 실제 iOS Safari 구버전에서의 체이닝 여부).
- Join Us 팝업 상태(`recruitOpen`)는 PC `ContactPageBody` 와 별개로 `MobileContact` 가 따로
  들고 있다 — 두 트리가 항상 함께 마운트되고 폭으로만 갈리므로(홈과 같은 패턴) 공유할 이유가
  없다.
- ⚠️ **확인 못 함 — 리빌 애니메이션.** 브라우저 패널은 IntersectionObserver 콜백을 안 줘서
  `.in` 클래스를 강제로 넣어 레이아웃만 확인했다(칩 클릭 → 게이팅 → 제출 활성화, Join Us
  스크럽 clip-path, Careers 팝업 열기/ESC 닫기는 스크립트로 직접 실행해 확인함). **사람이
  실제 폰에서 스크롤해 리빌 타이밍을 봐야 한다.**

**메인 배지 / 메인 플래그 / 레거시 JS 수정**

- 전체메뉴 Projects 배지(`.menu-badge`)가 `site.ts`에 하드코딩(`'42'`)돼 있던 걸 DB 건수(완료
  카드 기준, 사용자 결정)로 바꿨다(`lib/projectCount.ts`, `unstable_cache` 300초 — `/` `/about`
  `/contact` 를 여전히 정적으로 유지하기 위함, `PageShell` 이 async 서버 컴포넌트가 됨).
  `/projects` 만 `cards.length`(완료만 거른 값)가 아니라 배지 기준과 맞춘 별도 카운트를 쓴다.
  조회 실패/0건이면 아예 안 그린다(틀린 숫자보다 낫다).
  - 어드민 저장 시 `lib/projectCountActions.ts` 의 서버 액션(`updateTag`)으로 즉시 캐시 무효화.
    ⚠️ Next 16 은 `revalidateTag` 한 인자 버전을 deprecate — 서버 액션에서만 `updateTag` 를
    쓴다(라우트 핸들러는 `revalidateTag(tag,'max')`). `'use server'` 파일은 async 함수만
    export 가능해 상수(`PROJECT_COUNT_TAG`)는 별도 파일로 뺐다.
  - **확인 못 함**: 어드민 저장 → 다른 페이지 배지 즉시 반영 왕복(Claude는 어드민 세션 없음).
- **포트폴리오 "메인" 플래그** — 어드민에 [메인] 체크 + 가로용 별도 썸네일(`thumb_main`) 추가
  (`010`, 실행 확인됨). 홈 "Our Projects" 슬라이드가 `SHOWCASE` 하드코딩 대신
  `is_main=true AND use_yn='Y'` 최신 N건(최대 5, `011` — **⚠️ 미실행**, 컬럼 `client`/`launch`
  추가) 조회로 바뀌었다. 홈이 `force-dynamic` 이 됨.
  - **레거시 `main.js` 를 최초로 수정** — 슬라이드 3장 고정을 5장까지 되도록 루프 상한/z-index/
    인디케이터 개수를 고쳤다(라인 ~695~830). 명암 샘플링 배열을 `.proj-img` 기준에서 `vises`
    기준으로 바꿔, 썸네일 없는 메인 행이 있어도 인덱스가 안 밀리게 함(밀리면 `renderAf` 가
    던져서 챕터 전체가 죽었다). **⚠️ 정적 사이트의 `main.js` 는 아직 3고정이다 — 거기서 다시
    가져오면 이 변경이 사라진다, 흡수할 때 이 블록을 재적용할 것.** 5장 넘기려면
    `MAX_SHOWCASE`(`data/home.ts`)와 CSS z-index 도 같이 늘릴 것.
  - **확인 못 함**: 휠로 5단계 실제로 넘기는 동작(브라우저 패널 rAF 정지 한계), 실제 메인
    등록분 렌더(등록 0건).

---

## 현재 상태

```
브랜치   main
태그     backup/css-modules-full   ← 되돌린 전체 CSS 변환 (로컬만)
정적 원본  ../insplanet  포팅 기준점 b997b24 (PC 분량만 흡수, 모바일은 Figma 기준 별도 진행)
```

빌드·타입체크 통과. 마케팅 라우트는 더 이상 "초기 커밋과 diff 0"이 아니다(필터바 reveal 수정,
`/projects` DB 연동 등). 레거시 클래스명(`.pj-card` 등)은 전부 그대로 유지했다.

### Supabase 마이그레이션 실행 상태

| 파일                                     | 실행됨?                                      |
| ---------------------------------------- | -------------------------------------------- |
| `001_admin_users.sql`                    | ✅                                           |
| `002_admin_users_sync.sql`               | ⚠️ **미확인**                                |
| `003_fix_admin_users_rls_recursion.sql`  | ✅                                           |
| `004_portfolios.sql`                     | ✅                                           |
| `005_portfolios_seed.sql`                | ✅                                           |
| `006_portfolio_storage.sql`              | ✅                                           |
| `007_drop_legacy_portfolio_policies.sql` | ⚠️ **미확인**                                |
| `008_portfolio_detail_html.sql`          | ✅                                           |
| `009_portfolio_seed_thumbs.sql`          | ❌ **미실행**                                |
| `010_portfolio_main.sql`                 | ✅ 사용자 실행 확인                          |
| `011_portfolio_main_meta.sql`            | ❌ **미실행** — 안 돌리면 메인 저장이 막힌다 |

anon 키로는 `admin_users` 를 못 읽어 프로필 수로 002 실행 여부를 확인할 수 없다.
**002 와 007 실행 여부부터 확인할 것.** 002 를 빠뜨리면 새 계정마다 "프로필 없음" 문제를
반복하고, 007 을 빠뜨리면 미공개 포트폴리오가 REST API 로 계속 새어 나간다.

---

## 다음에 할 일

### 검증 못 한 것 (먼저 확인 필요)

**Claude 는 아직 로그인한 어드민 화면을 직접 못 봤다** — 세션이 없어 게이트를 못 넘는다.
사용자가 확인한 것은 로그인·프로필 차단 화면·계정 등록 성공까지다. 아무도 확인하지 않은 것:

- 메뉴권한 차단 실동작 (로직만 유닛테스트 통과)
- Storage 업로드 왕복 (버킷·정책 존재만 확인, 실제 업로드 미시도)
- 어드민 포트폴리오 CRUD 화면 실동작
- `/projects` 2행 이후 스크롤 reveal (브라우저 패널 IO/rAF 정지 한계로 첫 행만 확인)
- 견적문의 실제 렌더 (`quotes` 데이터 0건)
- 상세 iframe 안 폰트 렌더링, 진행 바 rAF 애니메이션, 모바일 홈 리빌 (전부 브라우저 패널
  백그라운드 한계 — 사람이 실제 브라우저에서 봐야 한다)

### 기능 붙이기

| 메뉴           | 테이블           | 상태                                                      |
| -------------- | ---------------- | --------------------------------------------------------- |
| 포트폴리오관리 | `portfolios` ✅  | **연동 완료** — CRUD + Storage 업로드 + `/projects` 공개  |
| 사용자관리     | `admin_users` ✅ | **연동 완료** — 목록·상세·수정·등록·메뉴권한              |
| 견적문의관리   | `quotes` ✅      | **연동 완료** — 목록·필터·상태변경·상세 (데이터 0건)      |
| 리크루트관리   | `recruits`       | 테이블 없음                                               |
| 메인관리       | 없음             | 스키마 설계부터. 폼은 스켈레톤(업로드만 동작, 저장 안 됨) |

**⚠️ `pageviews` 는 이 저장소와 무관한 고아 테이블이다** — 코드·마이그레이션·git 히스토리
어디에도 안 쓰인다. 삭제할지 방문 추적을 실제로 붙일지 결정 필요.

새 메뉴를 붙이는 순서는 스키마 설계 → 목록 조회 → 등록/수정 저장 → 삭제 → 필수값 얼랏이
자연스럽다. `src/lib/{quotes,portfolios}.ts` 처럼 타입·변환·검증을 한 파일에 모으고 화면은
그걸 쓰는 구조를 따라가면 된다.

### 바로 이어서 할 만한 것

- **`009`, `011` 실행** — 안 돌리면 각각 `/projects` 썸네일 옛 경로, 메인 저장 막힘.
- **실데이터 입력** — 담당자에게 실제 포트폴리오 목록과 이미지를 받아야 한다.
- **`quotes` 에 메뉴권한 RLS** — `portfolios` 는 걸었지만 `quotes` 는 아직 메뉴권한과 무관하게 열려 있다.
- **카드 클릭 → 상세 HTML 이동** — 컬럼은 있고 링크는 미연결(사용자가 "추후"로 보류)
- **"계정 프로필이 없습니다" 화면에 자가 생성 버튼** — 라우트의 부트스트랩 경로가 게이트에
  가려 못 쓰이는 문제 해소

### 기획서에 물음표로 남은 것 (담당자 확인 필요)

- 메인관리 목록에 삭제 기능이 필요한가 (10p) — 현재는 조회 화면에만 삭제 배치
- 사용자 데이터 삭제 기능이 필요한가 (42p) — 현재는 수정/취소만
- 상세화면 HTML 업로드 실제 경로 (25p) — 지금은 임시값
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
   확인할 것.** 대시보드에서 만들어 둔 게 있을 수 있다.
9. **`for all` 정책은 SELECT 까지 포함한다** — 쓰기 권한만 의도했는데 읽기가 같이
   열리거나, 정책이 자기 테이블을 참조하면 `42P17` 무한재귀가 난다.
10. **Next dev 서버는 같은 디렉터리에서 두 개 못 띄운다** — 두 번째가 조용히 죽는다.
    다른 포트로 검증이 필요하면 `next build && next start -p <포트>` 를 쓸 것.
11. **불투명 출처(sandbox) iframe 에서는 폰트만 CORS 를 탄다** — 이미지·CSS·JS 는 멀쩡한데
    `@font-face` 만 조용히 폴백된다. 정적 에셋에 `Access-Control-Allow-Origin` 이 필요하다.

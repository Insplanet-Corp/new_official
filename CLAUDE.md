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

**⚠️ 상세 안의 부드러운 스크롤은 `_shared/bridge.js` 가 띄운다** (2026-08-25).
정적 사이트는 상세를 부모 문서(`.ps-scroll`)에 주입해서 부모의 `js/project-sheet.js` 가
시트 전용 Lenis 를 띄워 줬다(`startSheetLenis`, lerp 0.09). 우리는 상세가 sandbox iframe
안에서 **자기 문서를** 스크롤하므로 부모가 그 스크롤에 손댈 수 없다 — 그래서 bridge.js 가
iframe 안에서 `/js/vendor/lenis.min.js` 를 직접 띄운다(같은 lerp 0.09, `parent === window`
early return 보다 위라 단독 열람도 같은 감).
- 이게 빠져 있어서 "사이트는 부드러운데 상세 창만 뚝뚝 끊긴다" 가 났다. 지우지 말 것.
- `_shared/style.css` 의 `html.lenis` / `.lenis.lenis-smooth` 블록이 짝이다 — 그 파일을
  본문 style.css 로 다시 덮을 때 그 블록이 살아 있는지 확인할 것.
- 확인함: 상세를 단독 URL(`/portfolio/bokjiro/index.html`)로 열면 `__pdLenis` 가 lerp 0.09
  로 뜨고 `html.lenis` 가 붙으며 `lenis.scrollTo` 가 동작, 콘솔 에러 0.
  **확인 못 함**: 시트(iframe) 안에서의 실제 스크롤 감 — 자동화 브라우저가 sandbox iframe
  로드를 `ERR_BLOCKED_BY_CLIENT` 로 막아 끝까지 못 봤다. 스크립트 경로는 단독 열람과 동일하다.

**폴더 구조**: `_shared/`(fonts.css · style.css · project-detail.css · footer.css ·
bridge.js · works.js/css) 는 공용 한 벌, 프로젝트 폴더(`kb-app/` 등)는 하나씩. 새 프로젝트는
`_template/` 을 복사한다. ⚠️ **폴더명을 바꾸면 `portfolios.html_file`(DB, `<슬러그>/index.html`
형식) 이 깨진다** — 폴더명과 어드민 등록값을 항상 같이 바꿀 것.

**히어로+Overview+푸터는 이제 전부 `<project-detail>` 이 그린다** (`_shared/works.js`).
2026-08-25 기준 `public/portfolio/*/index.html` 37개 전부가 이 커스텀 엘리먼트로 감싸져 있다
(예전엔 "onNuri·shinhan·dap 은 `.pd-*` 를 안 쓰는 자립형 문서" 라고 적혀 있었으나 더는 사실이
아니다). 다만 **본문(`.works-*`)은 여전히 문서마다 제각각인 자체 CSS** 다 — 공통은 껍데기뿐이다.

⚠️ **그래서 본문에서 "화면 폭" 은 뷰포트가 아니다.** `<project-detail>` 의 `.pd-secs` 가 좌우
16px 을 먹고 그 안에서 문서 자체 섹션이 또 좌우 패딩을 먹는다. 본문 CSS 가 `vw` 로 폭·이동량을
잡으면 그 차이만큼 조용히 어긋난다 — shinhan section03 의 모바일 CMS 캐러셀이 실제로 그랬다
(카드 `66.66vw` + 트랙 `300vw` 에 부모의 `align-items:center` 가 겹쳐 첫 카드가 화면 왼쪽 밖
`x=-375px` 에 서 있었고, 이동량에 `gap` 이 빠져 장을 넘길수록 16px 씩 더 밀렸다).
→ **캐러셀 계산은 창(`.works-figure`) 폭 기준 `%` 로 하고 트랙(`ul`)을 `width:100%` 로 둘 것**
— 그래야 `li` 의 `flex-basis %` 와 `left %` 가 같은 기준을 본다. 이동량엔 `gap` 을 포함시키고,
공통 `.works-figure-content{justify-content:center}` 를 `flex-start` 로 꺼야 트랙이 안 밀린다.

⚠️ **shinhan `style.css` 는 문서 안에서 브레이크포인트가 두 개로 갈려 있다** — `.only-pc`/
`.only-mobile` 스와핑과 `.works-section` 여백 재정렬은 **1023**, 나머지 섹션 레이아웃 규칙은
**767**. 그래서 768~1023 구간이 "모바일 이미지 + PC 레이아웃" 이 된다. section03 은 1023/1024 로
맞춰 고쳤지만 **section01·02·04~08 은 아직 767/768 그대로다** (미확인 — 눈으로 안 봤다).

**`_shared/style.css` 를 슬림화 (2026-08-26) — 137KB → 14KB**

- 이 파일은 원래 마케팅 `src/styles/style.css` 의 **통째 사본**이었다(5,223줄 vs 5,334줄,
  줄 단위 차이 161줄 = 97% 동일). 정적 사이트에서 상세 산출물을 가져올 때 사이트
  스타일시트가 그대로 딸려온 것.
- 실측: 셀렉터 688개 중 상세 문서(`<project-detail>` + 각 프로젝트 본문)가 실제로 쓰는 것은
  **12KB뿐, 나머지 86%는 죽어 있었다.** 클래스 334개 중 상세 HTML·각 프로젝트 CSS/JS·
  `_shared/*.js` 어디에도 안 나오는 것이 314개(`.projects` `.menu-*` `.ct-*` `.m-*` `#stage`
  `.ps-sheet` … 전부 **부모 페이지의 것**이라 iframe 안에서는 아무 데도 안 붙는다).
- 남긴 기준 — ① **요소 셀렉터(`*` `html` `body` `img` …)는 전부**: 리셋·박스모델·기본 폰트가
  여기 있어 빠지면 여백이 통째로 달라진다 ② 코퍼스에 실제로 등장하는 클래스/아이디만
  ③ 참조되지 않는 `@keyframes` 9개 제거.
- ⚠️ **`html.lenis` / `.lenis.lenis-smooth` 블록은 반드시 남아야 한다** — `bridge.js` 가
  iframe 안에서 Lenis 를 띄우는 짝이다(위 항목 참고). 슬림본에도 들어 있다.
- ⚠️ **정적 사이트에서 상세를 다시 가져올 때 이 파일을 원본 style.css 로 덮지 말 것.**
  덮으면 137KB 사본이 되돌아온다. 파일 맨 위 주석에도 같은 경고를 넣어 뒀다.
- **검증 방법(다시 쓸 것)**: 같은 문서 안에서 `<link>` 의 href 만 바꿔치기해 **A/B 를 한
  로드에서** 했다 — 상세를 같은 출처 iframe 으로 띄우고(`contentDocument` 접근 가능),
  트랜지션/애니메이션을 끈 뒤 모든 요소의 computed style 40개 속성을 스냅샷 → href 를
  슬림본으로 교체 → 다시 스냅샷 → 요소 단위 비교. 페이지를 다시 로드하지 않으므로
  이미지 로딩·rAF 정지 같은 환경 차이가 끼어들지 않는다.
- **확인함**: `_shared/style.css` 를 쓰는 상세 **33개 전부**에서 차이 **0개**
  (요소 71~100개 × 40속성). 교체 후 스타일시트 규칙 수 688→70, `body` margin 0 ·
  `border-box` · 기본 폰트 유지, 문서 높이 동일(예: wmall 3693px), 히어로 렌더 정상.
- ℹ️ 곁가지: **`public/portfolio/kb-platform/` 은 빈 폴더**였다(index.html 자체가 없음).
  아래 "어느 행도 안 쓰고 있다" 항목의 그 폴더다 — 지워도 되는지 담당자 확인 필요.
- ℹ️ 같은 분석을 **마케팅 `src/styles/style.css` 에도 돌렸는데 지울 게 없다**(701개 규칙 중
  죽은 것 1KB). 후보로 잡힌 `.insight-num--02/03` `.m-insight-num--02/03` 은 `Insight.tsx` 가
  `` `insight-num--0${i+1}` `` 로 **조립**하는 이름이라 grep 에 안 걸리는 오탐이고(2번 함정),
  `.is-tapped` 는 모바일 탭 애니메이션이다. 진짜 미사용은 `.ps-error` 하나뿐 —
  **마케팅 쪽은 다시 파지 말 것.**

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
  - **자석 hover(`.pd-close`/`.pd-btn`)도 여기 있다** (2026-08-25). 부모 `main.js` 의
    `#full-menu` 자석 효과와 같은 스프링(`STRENGTH .5 / STIFF .12 / DAMP .78 / MAX 20`)인데,
    **부모 코드는 여기까지 못 온다** — 불투명 출처라 `contentDocument` 를 못 읽는다.
    그래서 같은 상수를 iframe 안에서 한 번 더 돌린다. **한쪽만 바꾸면 감각이 갈린다.**
    ⚠️ 이 블록은 브리지 IIFE **밖**에 있다 — 안에 넣으면 `parent === window` 얼리 리턴에
    걸려 상세를 주소창으로 직접 열었을 때만 죽는다.
    ⚠️ 요소를 미리 잡지 않고 document 위임으로 찾는다 — `.pd-close`/`.pd-btn` 은
    `works.js` 가 그리는데 그 스크립트가 `bridge.js` **뒤**에 로드돼 최상위
    `querySelector` 는 조용히 `null` 이다.
    ⚠️ 움직이는 것은 버튼 자신뿐이다 — `.pd-close` 의 셰브론은 `pd-close-pass` keyframe 이
    따로 굴린다(둘 다 transform 이라 같은 요소에 걸면 서로 잡아먹는다).
    **확인함**: 위임 리스너가 붙고 목표 좌표가 상한 안에서 계산된다(dev 5599, `__mag` 확인).
    **확인 못 함**: 실제 rAF 스프링 렌더 — 브라우저 패널이 `document.hidden` 이라 rAF 가
    아예 안 돈다. 사람이 실제 브라우저에서 올려 봐야 한다.
- **⚠️ sandbox iframe(불투명 출처)에서는 `@font-face` 요청만 CORS 를 탄다.** 이미지·CSS·JS 는
  no-cors 로 그냥 뜨는데 폰트만 조용히 시스템 폰트로 폴백된다. → `next.config.ts` 의
  `headers()` 로 `/assets/fonts/:path*` 에 `Access-Control-Allow-Origin: *` 를 붙였다.
  **`allow-same-origin` 을 되돌려서 풀지 말 것.**
- **상세 산출물을 옮길 때 CSS 의 `url()` 까지 확인할 것** — HTML 의 `src`/`href` 만 봐서는
  폰트 등 절반이 안 보인다(`fonts.css` 의 상대경로가 옮긴 폴더 기준으로 깨짐).
- **`body{overflow-x:hidden}` 은 문서가 옆으로 스크롤되는 것을 못 막는다** — 스크롤 인 연출이
  요소를 화면 밖에서 대기시키면 그대로 밀린다. `overflow-x:clip` 을 쓸 것
  (스크롤 컨테이너를 안 만들어 `position:sticky` 도 안 죽인다).
- **⚠️ 그 `overflow-x:clip` 을 `html`/`body` 에 걸지 말 것 — `#page-root` 에 건다.**
  (2026-08-25) 루트 스크롤러에 클립이 걸리면 Blink 가 루트 스크롤의 컴포지터 fast path 를
  포기하고 스크롤 프레임마다 메인 스레드 페인트로 떨어진다. **"전체 스크롤이 정적 사이트보다
  뚝뚝 끊긴다"** 의 원인이 이것이었다 — 정적 사이트(insplanet)에는 이 규칙이 아예 없다.
  dev/프로덕션·로컬/Vercel 무관하게 똑같이 났고, 콘솔 에러는 없다.
  - 사용자 확인: Vercel 배포본 콘솔에서 `documentElement.style.overflowX='visible'` 한 줄로
    즉시 부드러워지는 것을 확인함. → `home-responsive.css` / `mobile-pages.css` 두 곳을
    `#page-root { overflow-x: clip }` 로 옮겼다.
  - 확인함: `/`·`/about`·`/contact`·`/projects` × 1440·390 에서 `scrollWidth === clientWidth`
    (가로 스크롤 안 생김), `html`/`body` 는 `visible`, 핀 4개(`pin-beyond-stage`
    `pin-insight-stage` `partners-pin` `projects-pin`)가 계속 `position:sticky` 로 붙고
    실제로 `top:0` 에 고정됨, 메뉴 오버레이(`#menu-overlay`, page-root 안의 fixed)가
    뷰포트를 그대로 덮음, 모바일 `.m-proj-track` 은 자기 안에서만 가로 스크롤됨.
  - `#page-root` 로 충분한 이유: 본문이 전부 그 안에 있고, 밖에 있는 건 `#cursor`·`.ps-sheet`
    같은 **fixed** 뿐인데 fixed 는 문서 가로 스크롤 폭에 애초에 기여하지 않는다.
  - 곁가지로 재봤지만 **주범이 아니었던 것들**(참고용, 다시 파지 말 것): dev 모드(Vercel 에서도
    동일), 이미지 로딩(프로덕션 `scrollY=0` 에서 정적 13장/0.2MP vs next 21장/0.4MP 로 사실상
    동일 — 예전에 "15.6MP" 로 본 건 이미 스크롤을 끝낸 탭의 캐시를 잰 오측정이었다),
    Lenis 설정·버전(완전 동일). DOM 2배(301→587)로 강제 레이아웃이 +50%(0.29→0.43ms),
    `ResponsiveScrollKeeper` 가 스크롤 프레임당 +0.47ms — 둘 다 실재하지만 합쳐 프레임당
    0.9ms(예산의 5%)라 체감 끊김의 주범은 아니다.
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
- ⚠️ **모바일 Our Partners 의 칸 폭은 `flex: 0 0 1/3` 이어야 한다** (2026-09-02). `flex: 1 1 0`
  이면 마지막 줄에 로고가 **하나만 남았을 때**(25개 = 3×8+1) 그 하나가 줄 전체를 차지해
  **가운데**로 가 버린다. 파트너 수가 3의 배수일 때는 안 드러나므로 로고를 추가할 때마다
  재발할 수 있다. 꽉 찬 줄은 계산이 같아 보이는 건 그대로다. PC 는 무관하다 —
  이 규칙은 `@media (max-width:1023px)` 안에 있고 `.m-partners` 는 ≥1024 에서 `display:none` 이다.
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
- ⚠️ **WebGL 노드는 사이트에 하나뿐이어야 한다** — 레거시 스크립트들이 `getElementById` /
  `querySelector` 로 **첫 번째 하나**만 잡는다. 노드를 PC/모바일 두 벌 두면 스크립트가 PC 쪽을
  잡고, 폭이 좁아져 PC 섹션이 `display:none` 이 되는 순간 그 노드가 **0×0** 이 되어 조용히
  사라진다(모바일 쪽 노드에는 렌더러가 없어 배경색만 남는다). 그래서 노드는 PC 트리에 한 번만
  두고 `ResponsiveSlot` 이 폭에 따라 **옮긴다**(캔버스 컨텍스트·React 루트 모두 유지됨).
  현재 두 개다 — `#insight-shader`(`.insight-card`↔`.m-insight-frame`),
  `#cta-glow`(`.contact-cta`↔`.m-cta`, 2026-08-25 추가: "창을 줄이면 Say Hello 글로우가
  사라진다" 가 정확히 이 증상이었다). 옮기는 프레임 중 하나에 상태를 넣게 되면 이 방식을
  재검토할 것.
  ⚠️ **새 WebGL/캔버스 연출을 모바일에도 쓸 때 캔버스를 복사해 넣지 말 것** — 같은 함정이다.
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

**모바일 전체메뉴 + 잔여 정리 (2026-08-25)**

- **모바일 전체메뉴를 붙였다** (Figma `2477:46857`). `.m-menu-*` CSS 는 정적 사이트에서 이미
  style.css 에 들어와 있었는데 **마크업을 그리는 곳이 없어서** ≤1023 에서도 PC 2단
  `.menu-inner` 가 그대로 나오고 있었다. `MenuOverlay.tsx` 가 이제 PC/모바일 두 트리를 다
  그리고 폭으로 가른다(`.m-menu-scroll` 기본 `display:none` ↔ ≤1023 에서 `.menu-scroll` 을 숨김).
  리빌 원·`#menu-logo`·`#menu-close` 는 두 트리가 공유한다.
- **`main.js` 메뉴 IIFE 를 3군데 고쳤다** — 정적 사이트에서 `main.js` 를 다시 가져오면 사라지므로
  흡수할 때 재적용할 것(메인 슬라이드 5장 블록과 같은 주의):
  1. 리빌 원점을 `openBtn.getBoundingClientRect()` 로 **실측**한다(`cx=W-76,cy=60` 하드코딩 제거).
     모바일 햄버거는 `W-36,40` 이라 그대로 두면 원이 엉뚱한 데서 퍼진다. 덤으로 PC 도 정확해졌다 —
     `#full-menu` 의 right/top/size 가 전부 `clamp()` 라 76 은 특정 폭에서만 맞았다(1280 에서 1.7px 오차).
     `open()` 에서도 `resize()` 를 한 번 더 불러 폭이 바뀐 뒤 첫 열기를 맞춘다.
  2. `inMenuScroll` 셀렉터에 `.m-menu-scroll` 추가 — 없으면 열린 메뉴 안에서 터치 스크롤이 막힌다.
  3. close-then-navigate 바인딩을 `a.menu-item[href],a.m-menu-item[href]` 로 확장.
- **⚠️ `document.body` 로 포탈하는 모바일 컴포넌트는 ≥1024 에서 직접 숨겨야 한다.**
  `MobileRecruitModal`(`.mr-popup`)이 데스크톱 `/contact` 최상단에 **스타일 없는 날 폼**으로
  보이고 있었다. 원인 셋이 겹친 것: ① 열림/닫힘 트랜지션 때문에 `open` 여부와 무관하게 항상
  렌더한다 ② 닫힘 상태(`visibility:hidden`)가 `@media (max-width:1023px)` **안에만** 있다
  ③ 포탈이라 `.m-contact{display:none}` 바깥에 있다. → `mobile-pages.css` 의 ≥1024 블록에서
  `.mr-popup` 을 직접 숨긴다. PC `.rc-modal` 은 기본 숨김이 미디어쿼리 밖이라 같은 문제가 없다.
- **`<picture>` 방식 폐기** — PC/모바일 섹션을 `<picture>` 한 장으로 합치던 실험(숨은 이미지도
  받아 온다는 페이로드 문제)을 사용자가 되돌리고 `.pd-sec--pc`/`.pd-sec--m` 두 벌로 확정했다.
  `scripts/merge-pc-mobile-sections.py` 삭제, 남은 `<picture>` 마크업·CSS 도 제거.
  ⚠️ **`_shared/works.js` 의 히어로 `<picture>`(`hero-mobile` 속성)는 그대로 둔다** — 상세 30개가
  전부 쓰는 모바일 히어로 교체 수단이고 섹션 병합과 무관하다.

**Careers 팝업을 1024 경계에서 갈아끼우기 (2026-08-26, `RecruitContext`)**

- 문제: PC 모달(`.rc-modal`)과 모바일 풀스크린 시트(`.mr-popup`)가 **열림 상태와 폼 값을 각자**
  들고 있었다. PC 에서 열어 둔 채 창을 1024 아래로 줄이면 PC 모달이 **찌그러진 채 남고**(그 폭에서
  감추는 규칙이 없었다) 모바일 시트는 안 떴다.
- 해결: `RecruitProvider` 가 셋을 한 곳에서 들고 두 모달에 내려준다 — 열림(`open`) ·
  폭 판정(`isDesktop`) · 폼 값(`role` state + `draft` ref).
  CSS 는 `contact.css` 에 `@media (max-width:1023px){.rc-modal{display:none}}` 를 추가했다
  (`mobile-pages.css` 의 ≥1024 `.mr-popup{display:none}` 와 짝).

- ⚠️ **`open` 과 `active` 를 반드시 갈라 둘 것.**
  - `open` = 열려 있는가. **껍데기(`.is-open`)는 이 값으로만 그린다** — 감춰진 쪽도 클래스를
    계속 달고 있어야, 폭이 바뀌어 `display:none` 이 풀리는 순간 **이미 열린 모습으로** 나타난다.
  - `active` = 지금 폭에서 이쪽이 쓰이는가. 잠금·포커스·ESC·바깥클릭·draft 동기화는 전부 이 값.
  - 처음엔 `open` 자체를 폭으로 잘랐는데(`open && isDesktop`), 그러면 경계를 넘는 순간 `.is-open`
    이 **새로** 붙어 0.4s 페이드인이 처음부터 돌고 그 사이 뒤의 Join Us 가 비쳐 **깜박였다**
    (작은 창 → 큰 창 방향에서 특히 심했다). display 가 바뀌는 전환에서는 트랜지션이 안 도는
    성질을 이용해 해결한 것. 실측: 고치기 전 스왑 직후 `.rc-modal` 이 `opacity:0` 에서 시작,
    고친 뒤 `opacity:1` 즉시 + 진행 중 트랜지션 0개.
  - `active` 게이팅은 **PC 모달의 바깥클릭 닫기가 모바일 시트를 죽이던 문제**도 막는다 —
    그 폭에서 `.rc-card` 가 `display:none` 이라 `contains()` 가 항상 false 여서, 시트 안을
    눌러도 PC 쪽 리스너가 "카드 밖" 으로 보고 닫아 버린다.

- ⚠️ **폭 판정을 두 모달이 각자 하면 안 된다.** 각자 하면 상태 갱신이 서로 다른 커밋에 떨어져,
  나가는 쪽의 cleanup 이 들어오는 쪽의 setup **뒤에** 돌 수 있다 — ① 시트는 떠 있는데 스크롤
  잠금이 풀리고 ② draft 가 **저장 전에 복원**돼 입력값이 통째로 날아간다. 한 곳에서 판정해야
  두 모달이 같은 커밋에서 리렌더되고, React 가 그 커밋의 cleanup 을 전부 돌린 뒤 setup 을
  돌리므로 "나가는 쪽 저장 → 들어오는 쪽 복원" 순서가 보장된다.

- **폼 값은 상태를 끌어올리지 않고 경계에서 DOM 값을 옮긴다**(`useRecruitDraftSync`).
  텍스트 입력은 **일부러 uncontrolled** 다 — 필터(숫자만/ASCII만)가 값을 제자리에서 고쳐 써야
  캐럿이 안 튄다(`FilteredInput` 주석). controlled 로 바꾸면 그 성질이 깨지므로, 활성화될 때
  복원하고 비활성화될 때 담아 두는 방식을 썼다. 지원분야 칩만 원래 state 라 프로바이더가 공유한다.
  - ⚠️ 첨부파일은 `input.files` 를 `DataTransfer` 로 옮긴 뒤 **`change` 를 직접 쏴야 한다** —
    파일명 칸과 `FileRow` 내부 잠금값(`officialRef`)은 그 이벤트로만 갱신되기 때문이다.
    그래서 `FileRow`/`MobileFileRow` 를 두 군데 고쳤다: ① 파일이 비면 이름도 비운다(예전엔
    early return 이라 안 지워졌다) ② 포커스 이동은 `e.isTrusted` 일 때만(복원이 닫기 버튼에서
    포커스를 뺏지 않게).
- **확인함**(dev 5599, 1440↔900 왕복): 칩·이름·연락처·이메일·URL·첨부파일이 양방향으로 그대로
  넘어가고 제출 버튼 활성 상태도 유지됨, 모바일에서 고친 값이 PC 로 되돌아옴, 닫았다 다시 열어도
  값 유지, 전환 내내 `rc-lock`/`lenis.isStopped` 가 true, 포커스가 `.rc-close`↔`.mr-close` 로 이동,
  스왑 직후 진행 중 트랜지션 0개 + `opacity:1`.
  ⚠️ 브라우저 패널은 resize/matchMedia change 를 안 줘서 `resize` 를 **직접 dispatch** 해
  확인했다. **확인 못 함**: 사람이 실제로 창을 끌어 줄이는 조작(패널은 rAF 가 멈춰 트랜지션이
  안 돈다 — 첫 열기의 페이드인 연출이 그대로인지는 눈으로 봐야 한다).

**폭 경계를 넘을 때 스크롤 유지 (2026-08-25, `ResponsiveScrollKeeper`)**

- 문제: PC/모바일 마크업을 CSS 로만 가르므로 1024 경계를 넘으면 문서 높이가 통째로 달라지는데,
  브라우저는 스크롤을 **px 로만** 기억한다 — Our Projects 를 보다 창을 줄이면 엉뚱한 챕터로
  떨어지고, 짧아지는 방향이면 바닥으로 잘리기까지 한다.
- 해결: `PAIRS` 로 PC↔모바일 챕터 짝을 알고 있으므로, 스크롤/리사이즈마다 "몇 번째 챕터의 몇 %"
  를 기록해 두고 경계를 넘은 뒤 반대편 챕터의 같은 비율로 즉시 옮긴다. 첫 챕터 위(히어로,
  DOM 공유)는 `i:-1` 로 따로 다룬다. about·contact·projects 는 트리가 하나씩이라 페이지 비율로 맞춘다.
- ⚠️ **Lenis 에게 `resize()` 를 먼저 시켜야 한다.** Lenis 는 목표를 자기가 캐시한 `limit` 으로
  자르는데 그 값은 ResizeObserver→rAF 로 늦게 갱신된다. 안 부르면 옛 문서 높이로 잘려 목표보다
  위에 멈춘다(실측: 12199 요청 → 12028 착지, 정확히 `모바일 scrollHeight - 모바일 innerHeight`).
- ⚠️ **기록은 모드별로 따로 둔다**(`saved.pc` / `saved.m`). 레이아웃이 바뀐 직후에도 scroll 이
  한 번 더 들어와 하나뿐인 기록을 덮을 수 있다. 복원은 "방금 떠나온 모드" 의 기록만 읽는다.
- ⚠️ `matchMedia` 의 `change` 만 믿지 않고 `resize` 로도 같은 판정을 한다(`wasDesktop` 가드로
  한 번만 복원). 브라우저 패널처럼 **change 이벤트도 rAF 도 안 도는 환경**이 실제로 있다.
- 짝을 새로 추가할 때는 `home-responsive.css`/`mobile-pages.css` 가 감추는 목록과 **같은 짝**을
  유지할 것 — 한쪽만 늘리면 그 챕터에서만 조용히 옛 동작(px 유지)으로 돌아간다.
- **확인함**(dev, 브라우저 패널): 홈 `.projects` 40%/60% ↔ `.m-proj` 같은 비율, 히어로 구간 50%,
  `/contact` 페이지 50% 왕복. ⚠️ 단 패널은 실제 resize/matchMedia 이벤트를 안 줘서 `resize` 를
  **직접 dispatch 해서** 확인했다 — 사람이 실제 브라우저에서 창을 끌어 확인할 것.

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
    가져오면 이 변경이 사라진다, 흡수할 때 이 블록을 재적용할 것.**
    **2026-08-25 에 사용자 요청으로 5장 대응을 걷어내고 3장으로 못박았다.** 상한은
    `MAX_MAIN`(`lib/portfolios.ts`) 한 곳에 있고 `MAX_SHOWCASE` 가 그걸 그대로 쓴다.
    style.css 의 `.proj-vis:nth-child(4)/(5)` 레이어는 지웠다.
    ⚠️ **`main.js` 는 여전히 DOM 에서 개수를 센다 — 리터럴 3 을 다시 넣지 말 것.**
    메인이 1건이나 2건만 등록된 상태가 실제로 가능하고, 그때 3 고정이면 유령 스텝이
    생긴다(원래 코드가 그랬다). 상한은 "몇 장까지 되나" 지 "항상 몇 장" 이 아니다.
    **어느 것이 뽑히는가 = 어드민 목록의 No 순서**다 — `is_main` 인 행을 `sort_order`
    오름차순으로 읽는다. 드래그로 순서를 바꾸면 슬라이드 순서도 따라오는 것을 실제로
    확인했다(2026-08-25, BizPay 를 No 18 → No 1 로 옮기니 슬라이드 1번이 됐다).

- **메인은 4건째부터 체크박스가 비활성이다** (사용자 결정 — 잘라 버리는 것보다 못 걸게).
  세 겹이다: ① 폼이 열릴 때 `is_main` 건수를 세어 체크박스를 끈다(**지금 편집 중인 행은
  빼고 센다** — 안 그러면 이미 메인인 행이 자기 자신 때문에 체크를 못 푼다) ② 저장 직전에
  다시 센다(다른 창에서 먼저 채웠을 수 있다) ③ `015` 의 DB 트리거.
  ⚠️ ①②는 화면 차단이지 보안이 아니다 — 동시에 두 창을 열면 틈이 있고, 그 계정 토큰으로
  REST 를 직접 때리면 화면을 안 거친다. **실제 상한은 015 뿐이다.**
  ⚠️ **상한 숫자가 TS(`MAX_MAIN`)와 SQL(015) 두 군데에 있다** — 바꿀 때 같이 바꿀 것.
  ⚠️ 015 의 트리거는 `is_main` 이 **꺼짐→켜짐** 일 때만 센다. 안 그러면 이미 3건이 찬
  상태에서 그 3건의 썸네일조차 못 고친다. 기존 행은 검사하지 않으므로, 트리거를 걸기 전에
  이미 4건이 있으면 그대로 남는다(어드민에서 풀어야 한다).
  ⚠️ 세는 기준은 `is_main` 뿐이다 — `use_yn='N'` 인 메인도 한 자리를 차지한다. 홈 쿼리는
  `use_yn='Y'` 까지 거르므로 그 경우 슬라이드는 2장이 된다.
  - **확인 못 함**: 휠로 5단계 실제로 넘기는 동작(브라우저 패널 rAF 정지 한계), 실제 메인
    등록분 렌더(등록 0건).

**1024 경계를 넘나들면 스크롤이 죽던 버그 (2026-08-25)**

- 증상: 창을 키웠다 줄였다 하다 보면 **갑자기 페이지 스크롤이 통째로 안 된다.**
- 원인: PC "Our Projects" 챕터의 **스크롤 잠금**. 섹션이 화면을 채우면 main.js 가
  `locked=true` 로 들어가 wheel 을 preventDefault 하고(**비-passive 리스너**) `Lenis.stop()`
  을 부른 뒤, 휠 한 번에 프로젝트 한 장씩만 넘긴다. 그런데 **그 IIFE 에는 resize 처리가
  전혀 없었다** — 잠긴 채로 창을 1024 아래로 줄이면 `.projects` 는 `display:none` 이 되어
  화면에서 사라지는데 잠금은 그대로 남아, 모바일 화면에서 스크롤이 완전히 죽는다.
  반응형 전환(34번) 이전에는 한 문서가 한쪽 마크업만 들고 있었으므로 생길 수 없던 조합이다.
- 고친 곳 **두 군데**(둘 다 필요하다):
  1. `public/js/main.js` — 챕터 IIFE 끝에 resize 핸들러를 붙여 **섹션이 안 그려지면
     (`sec.offsetHeight===0`) 상태를 전부 되돌린다**: `exitArmed` `swipeFired` `cool` 를 끄고
     `__projUnlock()` 을 부른다. ⚠️ `__projUnlock()` 만으로는 부족하다 — 그 함수는
     `if(!locked) return` 이라 **`exitArmed` 를 못 지운다.** `exitArmed` 는 위로 당기는
     touchmove 에서 `lockAt()` 을 다시 부르므로, 섹션이 없는 폭에서 잠금을 **되살릴 수 있다.**
     ⚠️ 정적 사이트에서 `main.js` 를 다시 가져오면 사라진다 — 슬라이드 3장 블록·메뉴 IIFE 와
     같이 재적용할 것.
  2. `ResponsiveScrollKeeper` — 경계를 넘을 때 `__projUnlock()` 을 **먼저** 부른다. 이쪽
     리스너가 main.js 것보다 앞서 등록되므로, 안 풀고 `jump()` 하면 잠긴 main.js 의 onScroll 이
     섹션 상단으로 되돌려 버려 챕터 유지 자체가 안 먹는다.
- ⚠️ **관측 함정** — "휠이 먹히는가" 로 잠금을 판정하면 안 된다. **Lenis 가 `smoothWheel` 을
  위해 항상 wheel 을 preventDefault 한다.** 처음에 이걸로 재현했다고 착각해서 엉뚱한 A/B 를
  돌렸다. 올바른 관측점은 **`window.__lenis.isStopped`** 다(`lockAt` 이 `L().stop()` 을 부른다).
- **확인함**(dev, 브라우저 패널): 픽스 둘 다 끈 상태에서 데스크톱 잠금 → 900px 로 넘어가면
  `isStopped:true` 가 남고 `scrollTo` 가 9799→9799 로 **전혀 안 움직임**(재현). 픽스를 되돌리면
  같은 시나리오에서 `isStopped:false` + 스크롤 정상, **2왕복(PC→모바일→PC→모바일)** 모두 정상.
  데스크톱으로 돌아왔을 때 챕터에 다시 잠기는 것은 의도된 동작이다.
  ⚠️ 이 패널은 탭이 hidden 이라 rAF 가 얼어 있어 `onScroll`(rAF 스로틀)이 안 돈다 —
  잠금을 걸려면 `dispatchEvent(new Event('resize'))` 를 써야 한다(라인 996 이 rAF 없이 부른다).
  **확인 못 함**: 사람이 실제로 창을 잡고 흔드는 조작.

**홈 Our Projects — 상세 시트 + 모바일 화살표 (2026-08-25)**

- **홈에서도 프로젝트를 누르면 상세가 아래에서 올라온다.** `/projects` 목록이 쓰던
  `ProjectSheet` 를 홈에도 그대로 붙였다(같은 컴포넌트, 같은 경로 — document 클릭에서
  `a[href^="/projects/"]` 를 가로채고 `/projects/<id>` 로 pushState 한 뒤 iframe 을 올린다).
  - PC 는 오른쪽 비주얼 패널(`.proj-visual`)을 덮는 투명 링크 `ProjectVisualLink`,
    모바일은 캐러셀 카드 자체가 `<a>` 다. 둘 다 커서가 "View Project" 로 바뀌는 곳과 일치한다
    (`Cursor.tsx` 의 `VIEW_SEL` 에 `.m-proj-card` 를 추가했다).
  - ⚠️ **PC 는 링크를 레이어마다 깔면 안 된다** — 어느 `.proj-vis` 가 보이는지는 main.js 가
    **인라인 opacity** 로 정하므로 CSS 로 못 읽고, 안 보이는 레이어의 링크가 클릭을 먹는다.
    링크는 한 장만 깔고 href 만 바꾼다. 현재 슬라이드를 아는 **유일한 공개 신호**는
    `renderAf()` 가 매 프레임 토글하는 `.proj-indicator .proj-dot.is-active` 라
    MutationObserver 로 그것만 지켜본다.
  - ⚠️ 오버레이에 `pointer-events` 를 주지 않았다 — `.proj-visual` 이 기본 `none` 이고
    main.js 가 쇼케이스가 드러난 동안에만 `auto` 로 켜므로, 그 게이트를 그대로 물려받게 두는
    것이 맞다. `auto` 를 박으면 챕터 밖에서도 눌린다.
  - ⚠️ 클릭 가로채기 순서: `ProjectSheet` 의 document 리스너가 main.js 의 전역 링크
    가로채기보다 **먼저** 등록돼야 한다(React effect 가 지연 주입되는 main.js 보다 앞선다).
    main.js 는 맨 앞에서 `defaultPrevented` 를 확인하므로 지금 구조에서는 안전하다.
  - `ShowcaseItem` 에 `id`/`href`/`detail` 이 생겼다 — 규칙은 `toCards` 와 같다(상세 HTML 이
    등록된 행만 링크). `ProjectSheet` 의 prop 은 `SheetCard`(= `id|href|detail`)로 좁혀
    두 종류의 카드를 다 받는다.

- **모바일 캐러셀에 좌우 화살표를 붙였다** — 손가락으로는 트랙을 밀면 되지만 마우스에는
  넘길 수단이 아예 없었다. `.m-proj-carousel:hover` 일 때만 뜨고, `@media (hover:hover) and
  (pointer:fine)` 안에만 있어 터치 기기에는 존재하지 않는다.
  - ⚠️ **화살표는 카드 바깥(`.m-proj-carousel` 직속)에 둘 것** — 카드 안에 넣으면
    `VIEW_SEL`(`.m-proj-card`)에 걸려 화살표 위에서도 "View Project" 커서가 뜬다.
  - ⚠️ **다음/이전 계산에 `active`(스크롤 파생)를 쓰면 안 된다** — `scrollTo({behavior:'smooth'})`
    는 ~400ms 걸리는데 `active` 는 그게 끝나야 갱신돼서 **연타하면 같은 카드를 다시 요청한다**
    (구현 중 실제로 재현했다). 목표(`target`)를 따로 들고, 스크롤이 **멎은 뒤에만**(140ms)
    실제 위치로 맞춘다 — 부드러운 스크롤이 지나가는 중간 카드로 목표가 되감기지 않게.
  - 카드가 `<a>` 가 되면서 `draggable={false}` 가 필요해졌다 — 없으면 마우스로 트랙을 밀 때
    브라우저의 링크 끌기가 먼저 잡혀 가로 스크롤이 안 된다.
  - 끝에서는 화살표를 감추지 않고 `disabled` 로 흐리게만 둔다(자리가 비면 남은 화살표가
    움직인 것처럼 보인다).
- **확인함**: PC 오버레이 href 가 활성 닷을 따라간다(닷을 1,2 로 옮겨 확인), PC/모바일 둘 다
  클릭 시 `ps-open` + 해당 프로젝트 iframe(`onNuri`/`hey-young`)이 붙는다, 화살표 연타가
  두 칸을 제대로 넘어가고 양 끝에서 클램프된다, `/projects` 회귀 없음.
  **확인 못 함**: 눈으로 본 화살표 호버 연출·시트가 실제로 올라오는 슬라이드 — 브라우저 패널이
  hidden 이라 rAF·부드러운 스크롤·깊은 스크롤 후 캡처가 전부 죽는다(사람이 봐야 한다).

**메인관리 삭제 + 포트폴리오 표시 순서 (2026-08-25)**

- **어드민 '메인관리' 탭을 통째로 지웠다**(사용자 결정). 메인 노출은 포트폴리오관리 한 곳에서
  [메인] 체크 + 썸네일-메인 + 목록 순서로 다 처리한다. 지운 것은 `app/admin/main/**` 와
  `components/admin/MainForm.tsx` — **저장이 붙지 않은 스켈레톤이었다**(업로드만 동작).
  `ADMIN_TABS` 에서 빠지면서 첫 탭이 `/admin/portfolio` 가 됐다 — `/admin` 리다이렉트와
  `AdminShell` 의 "권한 없으면 접근 가능한 첫 탭으로" 로직은 둘 다 `ADMIN_TABS[0]` 을
  읽으므로 코드 수정이 필요 없었다.
  ⚠️ `admin_users.permissions` 에 남은 `'/admin/main'` 은 이제 어느 탭과도 안 맞는 유령
  값이다 — `013` 이 지운다. **`002` 의 기본 권한 배열에는 아직 들어 있다**(이미 실행된
  마이그레이션이라 손대지 않았다). 새 환경은 002 뒤에 013 을 한 번 더 돌릴 것.

- **표시 순서를 `sort_order` 로 옮겼다(`012`).** 어드민 목록에서 행을 끌어 순서를 바꾸면
  `/projects` 그리드·진행중 표·홈 메인 슬라이드가 **같은 순서로** 나온다(세 곳 다
  `order by sort_order asc, seq desc`).
  - **`seq` 를 못 쓴 이유** — `generated always as identity` 라 UPDATE 가 거부된다.
  - **어드민 "No" 는 `sort_order` 값이 아니라 정렬 후의 위치(1,2,3…)** 다. 드래그를 거치면
    값이 촘촘하지 않을 수 있어 값을 그대로 보여주면 번호가 튄다. 필터를 걸어도 **전체 목록
    기준 위치**를 보여준다 — 화면 번호와 실제 순서가 어긋나면 안 되므로.
  - **필터/검색이 걸려 있으면 드래그를 막는다.** 안 보이는 행들 사이 어디에 놓은 것인지
    정의할 수 없다. 카드 푸터가 이유를 안내한다.
  - **손잡이(`.dragHandle`)만 `draggable`** 이다. 행 전체를 draggable 로 두면 셀 안의 링크·
    텍스트를 집으려는 순간에도 드래그가 시작돼 클릭이 잘 안 잡힌다. 대신 `dragstart` 에서
    `setDragImage(tr)` 로 고스트를 행 전체로 바꾼다.
  - ⚠️ **드래그 중 배열은 `useRef` 가 진실이다.** `dragover` 는 한 프레임에 여러 번 들어오는데
    그 사이에 리렌더가 없을 수 있다. `setRows` 의 updater 안에서 옮기면 순수하지 않은 updater 가
    되어 StrictMode 가 두 번 호출하면서 순서가 두 번 밀린다.
  - **행 아무 데나 눌러도 상세로 간다**(`onRowClick`). `<tr>` 은 `<Link>` 로 감쌀 수 없어서
    (테이블 안에서 `<a>` 가 행을 감싸는 마크업은 스펙 위반이고 브라우저가 `<a>` 를 표 밖으로
    끄집어낸다) `router.push` 를 쓴다. **제목의 `<Link>` 는 남겨 둔다** — 키보드 포커스·
    스크린리더·새 탭이 거기 달려 있다. 대신 `a, button, input, select, [draggable='true']`
    안에서 시작한 클릭은 걸러 **두 번 이동하지 않게** 한다(드래그 손잡이도 여기 걸린다).
    ⌘/Ctrl 클릭은 `window.open` 으로 새 탭, 글자를 긁던 중(`getSelection()`)이면 이동 안 함.
  - **드래그 중 화면 끝에 닿으면 자동으로 스크롤한다**(`EDGE` 110px, 프레임당 최대 22px).
    ⚠️ **좌표는 `dragover`, 굴리는 건 `rAF` 로 나눠야 한다.** `dragover` 만 보고 굴리면
    포인터를 끝에 붙여 놓고 가만히 뒀을 때 이벤트가 뜸해져(브라우저마다 다르다) 스크롤이
    뚝뚝 끊긴다. 리스너는 **document** 에 건다 — 표 바깥(고정 헤더·여백)으로 끌고 가도
    계속 굴러야 한다. `preventDefault` 는 하지 않는다(좌표만 필요하고, 드롭 허용 여부는
    행의 `onDragOver` 가 정한다).
    ⚠️ `add/removeEventListener` 가 **같은 함수 참조**여야 떼진다 — `trackPointer` 를
    컴포넌트 밖에 둔 이유다. 안에서 만들면 렌더마다 새 함수가 되어 리스너가 쌓인다.
    어드민은 Lenis 를 안 쓰므로(`LegacyRuntime` 은 마케팅 `PageShell` 전용) `window.scrollBy`
    로 충분하다.
  - 저장은 `dragend` 에 **한 번**, `reorder_portfolios(uuid[])` RPC 로 한 문장에 끝낸다.
    행마다 UPDATE 를 날리면 맨 아래를 맨 위로 끌었을 때 수십 번 왕복한다.
    ⚠️ **`security invoker` 다** — 004 의 쓰기 RLS 가 그대로 적용된다. `definer` 로 바꾸면
    로그인만 하면 누구나 순서를 바꿀 수 있다.
  - ⚠️ **순서 변경이 `updated_at` 을 밀지 않게 `portfolios_touch` 에 WHEN 가드를 걸었다** —
    `to_jsonb(old) - 'sort_order' - 'updated_at'` 끼리 비교한다. 컬럼을 나열하지 않았으므로
    새 컬럼을 추가해도 여기를 고칠 필요가 없다.
  - **`42703` 폴백**: 012 를 안 돌린 DB 에서 `sort_order` 로 정렬하면 PostgREST 가 42703 을
    낸다. `/projects`·홈·어드민 목록 셋 다 예전 순서(`seq desc`)로 한 번 더 시도한다 —
    마이그레이션 하나 때문에 공개 페이지가 빈 그리드가 되면 안 된다.
  - **확인함**: `/projects` 가 `sort_order` 1,2,3… 순서로 카드를 그린다(dev 를 끈 뒤 프로덕션 빌드로 확인). **확인 못 함**: 어드민 목록의 실제 드래그·저장 — 세션이 없어 게이트를 못 넘는다.

**상세화면 경로를 폴더명만으로 (2026-08-25)**

- 어드민에 `/kb-app/index.html` 처럼 파일명까지 적던 것을 **폴더명 하나**(`kb-app`)만 적도록
  바꿨다(사용자 결정). 상세는 언제나 그 폴더의 `index.html` 이라 파일명은 규칙으로 붙인다.
- `lib/portfolios.ts` 의 `detailSrc` 를 `toDetailFolder()` + `DETAIL_INDEX` 로 쪼갰다.
  `toDetailFolder` 는 **옛 표기도 전부 받아 준다**(`/kb-app/index.html`, `portfolio/kb-app/…`,
  뒤에 `/` 붙은 것) — 014 를 안 돌려도 화면이 안 깨지게 하기 위함.
- ⚠️ **보안 판정이 여기로 옮겨졌다.** 예전엔 "`..` 만 아니면 통과" 라 중첩 경로가 지나갔는데,
  지금은 **한 조각짜리 폴더명만** 통과시킨다. 절대 URL·프로토콜 상대(`//evil.com`)·
  `javascript:`·`a/b/c/index.html`·`index.html` 단독이 전부 막힌다(실제로 돌려 확인함).
  `sandbox="allow-scripts"` iframe 에 들어가는 값이므로 **여기를 느슨하게 고치지 말 것.**
- `toRow` 가 저장 시 폴더명으로 눕히고, `toDraft` 가 편집 시 폴더명만 보여 준다. 해석이
  안 되는 값이면 원본을 그대로 띄우고 `validate` 가 저장을 막는다 — 조용히 NULL 로 만들면
  "저장은 됐는데 카드가 안 눌리는" 상태가 된다.
- **`014` 가 기존 37건을 폴더명으로 정규화한다(선택 사항).** 표기만 바꾸는 것이라
  `portfolios_touch` 를 잠깐 꺼서 등록/수정일이 오늘로 밀리지 않게 했다.
- ⚠️ **깨져 있던 링크 하나를 014 가 같이 고친다** — DB 는 `BasSid`, 실제 폴더는 `bassId` 였다.
  **macOS 는 대소문자를 안 가려 로컬에서는 멀쩡히 열리고, Vercel(리눅스)에서만 404 가 난다.**
  37건을 `public/portfolio/` 와 대조해 찾았고 어긋난 건 이 하나뿐이었다. 새 상세를 등록할
  때마다 폴더명 대소문자를 확인할 것.
- `public/portfolio/kb-platform` 은 **어느 행도 안 쓰고 있다** — 등록 누락인지 폐기물인지
  담당자 확인 필요.
- **확인함**: 옛 표기가 든 행(`/onnuri/index.html`)이 `/portfolio/onnuri/index.html` 로
  그대로 열린다(dev 5599). **확인 못 함**: 어드민 폼에서 폴더명만 입력해 저장하는 왕복 —
  세션이 없어 못 봤다.

---

**배포 전환 준비 — SEO/AEO · 회사소개서 · 방문자 분석 (2026-08-26)**

- **회사소개서 PDF 를 저장소에서 Supabase Storage 로 옮겼다.** 어드민 `/admin/brief` 에서
  올리면 배포 없이 교체된다. 고정 경로 `brief/insplanet_brief.pdf` 에 `upsert` 로 덮어쓰므로
  URL 이 안 변하고(사이트는 `BRIEF_PDF` 상수 하나) 옛 파일이 쌓이지도 않는다(016).
  - **주소를 짧게 바꿨다 (2026-08-31, 사용자 요청)** — 사이트가 거는 주소는 이제
    **`/brief.pdf`** 다. `next.config.ts` 의 `rewrites()` 가 이 경로를 Storage 원본으로
    **프록시**한다(리다이렉트가 아니라 프록시라 새 탭 주소창에도 짧은 주소가 남는다).
    ⚠️ `next.config.ts` 의 rewrites·headers 와 `data/site.ts` 의 `BRIEF_PDF` 가 **짝**이다.
    ⚠️ **확장자 `.pdf` 를 떼지 말 것** — `middleware.ts` 의 matcher 가 점이 든 경로를
    제외하므로, `/brief` 로 두면 어드민 서브도메인에서 `/admin/brief`(회사소개서관리
    화면)로 rewrite 돼 PDF 대신 어드민 페이지가 열린다.
    ⚠️ **짧은 주소가 되면서 이 링크가 "같은 출처" 가 됐다.** 예전에는 다른 출처라
    `main.js` 의 전역 링크 가로채기가 자동으로 걸러 줬는데 이제 아니다 — 지금 안 걸리는
    유일한 이유는 `target==='_blank'` 검사가 origin 검사보다 **앞**에 있기 때문이다.
    `target` 을 빼면 main.js 가 클릭을 가로채 페이지 전환 연출을 태우고 화면이 blank 가 된다.
    같은 이유로 `download` 속성도 다시 붙이면 안 된다 — 이제는 실제로 먹는다.
    - **왜 프록시인가**: Storage 원본 18.7MB 를 그대로 링크하면 열 때마다 **Supabase
      무료 전송량(5GB/월 ≈ 267회)** 에서 빠진다. Vercel CDN 에 재우면 그 부담이
      Vercel(Hobby 100GB ≈ 5,300회)로 옮겨간다. 그래서 `Vercel-CDN-Cache-Control:
      max-age=3600` + 브라우저에는 `must-revalidate` 를 준다. **대가는 파일 교체 후
      최대 1시간의 지연**이다(급하면 재배포).
    - Vercel 의 외부 rewrite 는 함수가 아니라 CDN 계층이 처리한다 — 함수 응답 4.5MB
      제한과 무관하고, **프록시 요청 제한은 120초 타임아웃뿐**이다(문서 확인).
    - **확인함**(로컬 프로덕션 빌드): `/brief.pdf` 가 `206` + `content-range:
      bytes 0-4/18710784` + `content-type: application/pdf` + 매직바이트 `%PDF-` 로
      스트리밍되고, Contact 링크가 `href="/brief.pdf" target="_blank"` 로 나온다.
      **확인 못 함**: 위 캐시 헤더가 실제로 붙는지 — 로컬 `next start` 는 프록시 응답에
      **상류 헤더를 그대로 통과**시킨다(실측). Vercel 에 올린 뒤 `curl -I` 로 볼 것.
    - ℹ️ 세션 중 원본 `cache-control` 이 `no-cache` → `max-age=3600` 으로 바뀌는 걸 봤다
      (파일 재업로드). 업로드 때 `cacheControl` 을 안 주면 Supabase 기본이 `no-cache` 라
      조용히 무캐시가 된다 — 어드민 업로드 코드에 그 옵션이 없다.
  - **2026-08-26 부터 "받기" 가 아니라 "새 탭에서 열기" 다** (사용자 결정). 링크 4곳
    (`ct-brief` · `mc-brief` · `brief-btn` · `m-menu-brief`)이 `download` 대신
    `target="_blank" rel="noopener noreferrer"` 를 쓰고, `BRIEF_PDF` 에서 `?download=` 를 뺐다.
    ⚠️ **`?download=` 을 다시 붙이지 말 것** — 붙이면 Supabase 가
    `Content-Disposition: attachment` 를 내려 주고, 새 탭이 열리자마자 닫히며 파일이 받아진다.
    실측: 파라미터 있으면 `content-disposition: attachment`, 빼면 그 헤더가 아예 없고
    `content-type: application/pdf` 만 남는다.
    ⚠️ **교차 출처라 `<a download>` 속성은 어차피 무시된다** — 그래서 예전에도 실제로
    받아지게 만든 건 속성이 아니라 `?download=` 쿼리였다. 속성을 남겨 두면 파일이 다시
    같은 출처로 옮겨졌을 때 조용히 "받기" 로 되돌아가므로 지웠다.
    ℹ️ `main.js` 의 전역 링크 가로채기는 `target==='_blank'` 와 `download` 를 **둘 다**
    거르므로(89행·342행) 이 교체로 가로채기 동작이 달라지지 않는다 — 4곳 모두 클릭 시
    `defaultPrevented === false` 인 것을 실제로 확인했다.
    ℹ️ 분석 화면의 `trackDownload('brochure')` 는 그대로 뒀다 — 이제 의미가 "받은 횟수" 가
    아니라 **"연 횟수"** 다. 항목 이름을 바꾸면 기존 집계와 끊긴다.
  - ⚠️ 원본 194.6MB 를 Ghostscript 로 **13.9MB** 로 줄였다. GitHub 은 100MB 넘는 파일을
    거부하므로 압축이 필수였다. **무엇이 실제로 줄였는지가 직관과 다르다** — 산출물 4벌의
    내부를 다시 재서 확인했다(2026-08-26):

    | 설정 | 크기 | 이미지 총 픽셀 | JPEG 로 바뀐 장수 |
    | --- | --- | --- | --- |
    | `/printer` | 41.3MB | 498MP (그대로) | 64 / 155 |
    | `/ebook` | 32.9MB | 490MP (그대로) | 65 / 161 |
    | `/screen` | 14.7MB | **180MP (잘림)** | 63 / 167 |
    | **채택본** | **14.6MB** | 490MP (그대로) | **157 / 161** |

    `/screen` 과 채택본은 크기가 같은데 가는 길이 정반대다 — `/screen` 은 **픽셀을 잘라서**,
    채택본은 **픽셀을 두고 거의 전부를 JPEG 로 바꿔서** 14MB 가 됐다. 그래서 `/screen` 만
    목업 안 작은 글씨가 뭉갠다.
    프리셋이 32~41MB 에 머문 이유는 `AutoFilter` 가 이미지마다 사진/도형을 자동 판정해
    **160장 중 100장쯤을 무손실로 남기기** 때문이다. 그 100장이 용량 대부분이었다.
    → 결정적인 플래그는 dpi 가 아니라 **`-dAutoFilterColorImages=false -dColorImageFilter=/DCTEncode`**
    ("자동 판정 끄고 전부 JPEG") 다.
  - ⚠️ **`-dColorImageResolution=150` 은 이 파일에서 거의 발동하지 않았다** — 페이지가
    `MediaBox [0 0 1920 1080]` = 가로 26.7인치짜리 대형 페이지라 3840px 이미지의 실효
    해상도가 144dpi 뿐이고, Ghostscript 는 목표의 1.5배(225dpi)를 넘을 때만 줄인다.
    **페이지가 물리적으로 크면 dpi 설정은 헛돈다** — 모르면 "150 을 줬는데 왜 안 줄지" 로 헤맨다.
  - 명령(`-c` 가 `-f` 보다 **앞**에 와야 설정이 먹는다, 뒤집으면 조용히 무시된다):
    ```
    gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dNOPAUSE -dBATCH \
       -dDownsampleColorImages=true -dColorImageResolution=150 \
       -dAutoFilterColorImages=false -dColorImageFilter=/DCTEncode \
       -c ".setpdfwrite << /ColorImageDict << /QFactor 1.3 /Blend 1 \
            /HSamples [2 1 1 2] /VSamples [2 1 1 2] >> >> setdistillerparams" \
       -sOutputFile=out.pdf -f in.pdf
    ```
    `QFactor` 는 **클수록 더 버린다**(0.1 최고화질 ~ 2.0 저화질). 1.3 까지 밀어도 안 띄었다.
  - ⚠️ **`-dQUIET` 를 쓰지 말 것** — 첫 시도에서 에러가 가려져 2.5KB 짜리 빈 PDF 가 나왔는데
    성공한 줄 알았다. 그리고 **크기만 보고 고르지 말 것**: 위 표처럼 같은 14MB 라도 화질이
    갈린다. 목업 안 작은 글씨가 있는 페이지를 확대 렌더해 눈으로 비교해야 한다.
  - **확인함**: 같은 경로에 덮어쓰면 Supabase 가 **CDN 캐시를 즉시 무효화한다**(max-age 3600
    파일을 덮어쓴 직후 새 내용이 나왔다). 그래서 cacheControl 을 짧게 둘 이유가 없다.

- **SEO/AEO 를 새로 붙였다.** 옛 사이트(Vue SPA)에는 아무것도 없었다 — 전 페이지 title
  'INSPLANET' 하나, description·OG 없음, robots/sitemap 없음, 본문이 `<div id="app">` 로 비어
  있고 아무 주소나 200 을 돌려줬다.
  - `data/seo.ts`(상수) · 루트 `metadata`(metadataBase·OG·트위터·robots) · 페이지별
    description/canonical · `robots.ts` · `sitemap.ts`(고정 4 + 상세 37 = 41개) ·
    `SiteJsonLd`(Organization/WebSite/ProfessionalService) · `public/llms.txt` ·
    OG 이미지(`public/assets/og-default.png`, footer_logo.svg 를 sharp 로 1200x630 렌더).
  - **`/work` · `/work/:slug` → `/projects` 308 리다이렉트**(next.config). 옛 라우트는 번들에서
    직접 확인했다. 상세는 옛 슬러그(`/work/bizpay`)와 새 UUID 사이 대응표가 없어 목록으로 보낸다.
  - 실적 썸네일 `alt` 가 전부 비어 있었다 → 프로젝트명·고객사로 채웠다.

  **2026-08-26 보완 — 실제 출력물을 재 보고 네 군데를 고쳤다.**

  - ⚠️ **`/projects/<id>` 37개가 전부 canonical 로 홈을 가리키고 있었다.** 상세가
    `alternates` 를 안 줘서 루트의 `canonical: '/'` 를 그대로 물려받은 것 — 즉 37개가
    "나는 홈페이지의 복사본이다" 라고 선언하는 상태였다. sitemap 은 같은 37개를 색인하라고
    하므로 정면 충돌이고, 그대로 두면 상세가 **검색에 아예 안 잡힌다.**
    → `generateMetadata` 에서 canonical·description·OG·트위터를 전부 직접 준다.
    **하위 라우트에서 canonical 을 빠뜨리면 조용히 부모 것을 물려받는다** — 새 라우트를
    만들 때마다 확인할 것.
  - ⚠️ 같은 곳의 title 이 `Insplanet — X — Insplanet` 으로 나왔다. 루트의 `title.template`
    이 ` — Insplanet` 을 자동으로 붙이는데 페이지가 회사명을 또 붙여서다. **템플릿이 있는
    한 하위 페이지는 이름만 준다.**
  - ⚠️ 홈에 `<h1>` 이 하나도 없었다(히어로가 `<div id="head-title">`). `h1` 로 바꿨다 —
    `main.js` 는 이 요소를 `getElementById` 로만 잡고(3곳) CSS 도 전부 `#head-title`
    선택자라 태그 변경은 안전하다. UA 기본 스타일은 `* { margin:0; padding:0 }` 과
    `#head-title` 의 font-size/weight/family 가 이미 전부 덮는다(확인함: 144.142px /
    600 / Cormorant Garamond / flex, 레이아웃 동일).
  - ⚠️ **`SITE_URL` 을 하드코딩하면 미리보기 배포의 공유 카드 이미지가 빈다.** og:image 가
    실서비스 도메인을 가리키는데 그 도메인이 아직 옛 사이트면, 이미지 요청에 옛 SPA 의
    `index.html` 이 돌아온다(실측: 200 인데 `content-type: text/html`, 662B). 카카오는
    이미지를 못 받아 회색 카드를 그린다. → `NEXT_PUBLIC_SITE_URL` →
    `VERCEL_PROJECT_PRODUCTION_URL` → 하드코딩 순으로 고른다.
    ℹ️ `SITE_URL` 은 metadata·robots·sitemap·JSON-LD 등 **서버에서만** 쓰이므로(확인함)
    `NEXT_PUBLIC_` 없는 시스템 변수를 그대로 읽어도 된다. 클라이언트에서 import 하게 되면
    그때는 `NEXT_PUBLIC_` 쪽만 살아남는다.
  - **공유 카드 제목만 `INSPLANET`, 브라우저 탭·검색결과는 `Insplanet — 디지털 프로덕트
    전문 기업`** (사용자 결정). 카드는 브랜드만, 검색결과는 무슨 회사인지 드러나야 클릭을
    받는다. `SITE_NAME_SHARE` 상수가 그 경계다.
  - ⚠️ 상세 description 에 **한글 조사(을/를, 와/과)를 쓰지 말 것** — 고객사·프로젝트명이
    영문이라 받침으로 조사를 고를 수 없다("BizPay과 함께한" 이 실제로 나왔다).
    "고객사 BizPay." 처럼 명사만 나열한다.
  - 상세에 **프로젝트별 JSON-LD(`CreativeWork`)** 를 붙였다 — 본문이 iframe 안이라
    크롤러가 못 읽으므로, 숨긴 텍스트보다 이쪽이 강한 신호다. `creator`/`isPartOf` 로
    루트의 Organization·WebSite `@id` 를 참조한다.
  **2026-08-26 · 상세 텍스트를 상세 HTML 에서 뽑아 쓴다 (`lib/portfolioDetail.ts`)**

  - 상세 본문은 iframe 안이라 크롤러가 못 읽는데, **필요한 문장은 이미 그 파일 안에
    구조화돼 있었다** — 퍼블리셔가 `<project-detail>` 속성에 적어 둔다. 37개 전수 조사:
    `client`·`launch`·`overview-title`·`overview-text` 는 **37/37**, `ko`/`en` 은 21/37.
    → 새로 글을 쓸 필요 없이 서버에서 읽어 description·JSON-LD·sr-only 헤더에 쓴다.
  - ⚠️ **파싱 전에 HTML 주석을 지울 것.** 각 문서 첫머리 주석에 `<project-detail>` 이라는
    문자열이 또 있어서, 그냥 찾으면 속성이 없는 그 가짜가 먼저 잡힌다(실제로 이걸로
    "0/37" 이 나와 "속성이 비어 있다" 고 오판할 뻔했다).
  - ⚠️ **Vercel 은 public/ 을 서버 번들에 안 넣는다.** 정적 에셋은 CDN 에서만 서빙되므로
    람다에서 `fs` 로 못 읽는다. `next.config.ts` 의 `outputFileTracingIncludes` 가 짝이다 —
    **지우면 조용히 실패한다**(화면은 멀쩡하고 description 만 일반 문구로 되돌아감).
    실패 시 `console.warn` 을 남기게 해 뒀다. 배포 후 상세 한 곳의 description 을 확인할 것.
  - ⚠️ **`/portfolio/<폴더>/index.html` 은 그 자체로 크롤 가능한 주소다.** robots.txt 는
    `/admin`·`/api` 만 막고 구글은 iframe 의 src 를 따라간다. 그런데 37개 중 **32개의
    `<title>` 이 템플릿 그대로 `Work Container - 프로젝트명`** 이라, 색인되면 같은 제목의
    페이지가 무더기로 뜬다. → `headers()` 에서 `X-Robots-Tag: noindex`.
    **robots.txt 로 막으면 안 된다** — 크롤 자체가 막히면 noindex 를 읽지 못해 오히려
    "설명 없음" 으로 색인될 수 있다.
  - ⚠️ **`portfolios.client` 와 상세 HTML 의 `client` 가 36/37 에서 어긋난다.**
    HTML 쪽이 맞다(신한금융그룹·KB국민은행·LG CNS·완주군…). DB 는 대부분 비어 있고
    일부는 오입력이다(CastingN → "중개 플랫폼", BizPay → "BizPay"(실제 고객사는 유니코어)).
    상세 페이지는 HTML 값을 우선한다 — 그 페이지 히어로에 실제로 보이는 값이라
    "화면에 없는 걸 구조화 데이터에만 넣었다" 는 문제도 없다.
    ℹ️ **DB 의 `client` 는 홈 메인 슬라이드의 Client 칸에 그대로 나온다** — 어드민에서
    채워 넣어야 할 값이다(지금 메인 3건만 영향).
  - **남은 것**: 상세의 **눈에 보이는** 서버 렌더 텍스트. 지금 문서에 남는 것은 sr-only
    헤더(제목·부제·고객사·분류·오픈·개요 전문)와 JSON-LD 다. 화면에 무엇을 어떻게
    드러낼지는 디자인 결정이 필요해 손대지 않았다(사용자가 디자인 변경을 원치 않음).

- **방문자 분석을 옛 사이트에서 이식했다** (`/admin/analytics`).
  - ⚠️ **기록은 우리 코드가 하지 않는다** — Supabase Edge Function `track` 이 service_role 로
    넣는다. 그 함수가 요청 IP 를 보고 사무실 IP(`internal_ips`)면 기록하지 않는다(IP 는 비교에만
    쓰고 저장하지 않음). **함수는 Supabase 에 배포돼 있어 저장소를 갈아끼워도 남는다** —
    옛 저장소(`Develop/Company/official`)에 소스가 있다.
  - ⚠️ **배포된 함수가 옛 저장소 소스보다 새롭다** — 로컬 소스에 없는 봇 필터가 있다
    (curl 로 부르면 `{"skipped":"bot"}`). 함수를 고칠 일이 생기면 대시보드의 배포본을 먼저 볼 것.
  - ⚠️ 집계는 서버가 아니라 브라우저에서 센다(REST 에 group by 가 없다). 지금 865건이라
    괜찮지만 수만 건이 되면 RPC 로 옮겨야 한다.
  - `lib/analytics.ts` + `Analytics.tsx`(루트 레이아웃)가 pathname 변화마다 기록한다.
    같은 경로 연속 기록은 막는다 — 시트를 닫으면 `/projects` 로 돌아오는데 그것까지 세면
    목록 조회수가 부풀려진다.
  - 회사소개서 링크 4곳에 `trackDownload('brochure')` 를 붙였다. 안 붙이면 그 수치가 계속 0 이다.
  - **확인함**: 브라우저에서 `track` 호출이 실제로 나가고 visitor_id 가 생성됨.
    **확인 못 함**: 어드민 화면의 실제 렌더 — 세션이 없어 게이트를 못 넘는다.
    또 사무실 IP(115.91.159.217)가 `internal_ips` 에 등록돼 있어 이 자리에서는 기록이 안 남는다
    (의도된 동작).

- **옛 사이트 테이블 정리(017)** — `contacts`(테스트 2건뿐) · `brochure_history` 삭제.
  ⚠️ **도메인 교체 뒤에 실행할 것** — 지금 라이브 사이트가 `contacts` 에 쓰고 있다.
  `pageviews` · `internal_ips` · `downloads` 는 **남긴다**(위 분석 화면이 쓴다).

- **Supabase 무료 플랜 실측** (전송량 5GB/월 기준):
  홈 0.23MB(21,800회) · `/projects` 1.02MB(5,000회) · 재방문 0바이트(304) · 소개서 13.9MB(368회).
  ⚠️ **원본 URL 로 재면 안 된다** — DB 의 `object/public/...` 은 5K PNG(17.8MB)이고, 페이지는
  `render/image/...?width=..` 리사이즈 URL 을 쓴다(`lib/images.ts`). 게다가 `Accept: image/webp`
  를 안 보내면 PNG 776KB 가 오는데 브라우저는 WebP 35KB 를 받는다. 처음에 이 둘을 다 틀리게 재서
  "홈이 43MB" 라는 잘못된 경고를 했다.
  ⚠️ 이미지 변환은 유료 기능이고 폴백이 없다 — 막히면 이미지가 커지는 게 아니라 **안 나온다.**
- **Vercel cron `/api/keepalive`** — 무료 Supabase 는 7일간 요청이 없으면 일시정지되고
  **자동으로 안 깨어난다**(대시보드에서 사람이 재개). 하루 한 번 DB 를 찌른다.
  ⚠️ 정적 응답만 돌려주면 의미가 없다 — 실제 DB 조회를 해야 한다.

**리크루트관리 ↔ Careers 입사지원 연동 (2026-08-26, `018_recruits.sql`)**

- Contact > Join us > 채용확인 > Careers 팝업의 **입사지원** 버튼이 이제 실제로 접수한다.
  PC 모달(`RecruitModal`)과 모바일 시트(`MobileRecruitModal`)가 **같은 `submitRecruit`**
  (`lib/recruits.ts`)을 쓴다 — 두 트리는 폭으로만 갈릴 뿐 접수 규칙이 다를 이유가 없다.
  어드민 `/admin/recruit` 목록·조회가 그 행을 읽는다.

- **컬럼은 폼이 받는 것만 만들었다** (사용자 결정: "어드민보다 Careers 입사지원 폼이 우선").
  기획서 35p 목록의 **기술등급 · 경력 · 재직상태는 만들지 않았다** — 폼이 안 받으므로
  필터를 걸면 항상 0건인 죽은 조건이고, nullable 로 미리 만들어 두면 영영 `-` 만 나오는
  빈 칸이 된다. `adminOptions.ts` 의 `RECRUIT_GRADE`/`RECRUIT_CAREER_FILTER`/
  `RECRUIT_EMPLOYMENT` 도 같이 지웠다. 되살리려면 **폼 → 018 → adminOptions → 두 화면**
  순서로 같이 늘릴 것.
- **지원분야(`field`)는 칩의 한글 문자열 그대로** 다 — `quotes.project_fields` 와 같은 규칙.
  어드민 필터는 `RECRUIT_ROLES`(`data/contact.ts`)에서 파생시킨다. 영문 슬러그로 따로
  정의하면 필터가 아무것도 못 거른다(견적문의에서 이미 밟은 지뢰).

- ⚠️ **첨부파일 버킷 `recruit` 는 비공개다**(`public=false`). portfolio·brief 와 반대다 —
  이력서는 개인 자료라 URL 을 아는 사람이 받을 수 있으면 안 된다. 어드민 조회 화면이
  **누를 때마다** `createSignedUrl` 로 새 주소를 만든다(화면 열 때 한 번 만들어 두면
  오래 열어 둔 탭에서 만료된 주소를 누르게 된다). `FileLink` 에 `onClick`/`busy` prop 을
  추가한 이유가 이것이다.
- ⚠️ **테이블 RLS 도 portfolios 와 반대다** — 공개 페이지가 **쓰기만** 하고 **읽지 않는다.**
  anon 에게 select 를 열면 이름·연락처·이메일이 REST 로 통째로 새어 나간다.
  insert 는 anon 에게 열려 있다(로그인 없이 지원한다) — 익명 업로드라 스팸 여지가 있고,
  버킷의 `file_size_limit`(50MB)이 사실상 유일한 방어선이다.
- ⚠️ **순서는 파일 업로드 → 행 insert** 다. 행을 먼저 넣고 경로를 채우려면 update 권한이
  필요한데 anon 에게는 없다(018 은 insert 만 연다). 그래서 `crypto.randomUUID()` 로 id 를
  만들어 `recruit/<id>/<파일명>` 에 올리고 그 id 로 행을 넣는다. insert 가 실패하면 파일이
  고아로 남는다(anon 은 delete 도 못 한다) — 어드민이 대시보드에서 정리한다.
  Storage 키는 안전한 문자로 눕히고(한글 파일명이 키로 못 쓰인다) 원래 파일명은
  `file_name` 에 따로 저장한다. 서명 URL 의 `download` 옵션이 그 이름으로 받게 한다.
- ⚠️ **접수 성공 뒤 비우는 순서는 `form.reset()` → `resetRecruit()` → `onClose()`** 다.
  닫히면서 도는 `useRecruitDraftSync` cleanup 이 **이미 비워진** DOM 을 담아야 값이 안
  되살아난다. `reset()` 은 파일 입력도 비우지만 파일명 칸은 안 따라오므로
  `change` 를 직접 쏜다(RecruitContext 의 복원 로직과 같은 이유).

- **확인함**: 타입체크 통과, dev(5599)에서 `/contact`·`/admin/recruit` 200.
  anon REST 로 `recruits` 가 아직 **404**(018 미실행)인 것도 확인했다.
  **확인 못 함**: 실제 접수 왕복(테이블이 없어 아직 못 넣는다)과 어드민 목록·조회·첨부
  다운로드 — 어드민 세션이 없어 게이트를 못 넘는다. **018 을 돌린 뒤 사람이 확인할 것.**

**이용약관 · 개인정보처리방침 팝업 (2026-09-01, `LegalModal`)**

- 정적 사이트가 최근에 붙인 두 팝업(`../insplanet` 커밋 `ca6747d`·`18af344`)을 옮겼다.
  Contact 동의 문구의 **이용약관 / 개인정보처리방침 링크**로 열리는 정적 문서 팝업이다.
- ⚠️ **여기만 트리가 한 벌이다.** 정적 사이트는 PC(`.tm-modal`)와 모바일(`.mt-popup`) 두 벌에
  같은 전문을 두 번 적어 뒀지만, 여기서는 `.tm-*` 한 벌을 `contact.css` 의 ≤1023 블록이
  풀스크린 시트로 바꾼다(카드→전체화면, 딤 제거, 타이틀 64→40, 소제목 18→16, 챕터 간격
  64→40, X 64→48 박스). 두 벌로 안 가른 이유 —
  ① 약관·방침 **전문**이라 두 벌이면 `/contact` 문서에 장문이 통째로 두 번 실린다
  ② 레거시 런타임(`public/js`)이 잡는 이름이 하나도 없는 새 마크업이라, 두 벌로 가를 때
  생기는 함정(전역 플래그 싸움·포탈된 쪽을 반대 폭에서 감추기)이 아예 없다.
  → 그래서 `RecruitModal` 이 필요로 했던 **open/active 구분도 여기서는 필요 없고**, 폭
  경계를 넘어도 열린 채로 그대로 있다(CSS 만 바뀐다).
- **본문은 `data/legal.ts` 데이터** 다(문단 배열 + `li`/`brk` 플래그). 정적 사이트 HTML 에서
  스크립트로 뽑아 옮겼으므로, 문구를 고칠 때는 정적 사이트도 같이 고쳐야 갈리지 않는다.
- ⚠️ **동의 문구의 링크는 `<label>` 안에 있다** — `preventDefault` 를 빠뜨리면 팝업을 여는
  동시에 동의 체크박스가 토글된다(라벨 활성화가 클릭의 기본 동작이다). 같은
  `preventDefault` 가 `main.js` 의 전역 링크 가로채기도 막아 준다(그쪽은 `href[0]==='#'`
  에서 이미 빠지므로 이중 안전망).
- 링크는 PC 폼·모바일 폼 두 곳에 있고 팝업은 하나라 열림 상태를 `LegalProvider` 가 든다
  (`RecruitProvider` 와 같은 이유). 링크 마크업 자체는 `ConsentLinks` 하나를 두 폼이 쓴다 —
  클래스를 안 달고 링크만 그리므로 `.ct-*`/`.mc-*` 프리픽스 관례를 깨지 않는다.
- ⚠️ **껍데기(`.tm-modal`)는 늘 그려 두고 본문만 처음 열 때 붙인다.** 껍데기가 미리 있어야
  `.is-open` 이 붙는 순간 opacity 0→1 트랜지션이 실제로 돈다 — 그 커밋에서 새로 만들어진
  요소는 시작 상태가 없어 트랜지션 없이 즉시 나타난다. 한 번 연 문서는 그대로 남긴다
  (닫는 0.4s 페이드 동안 글자가 먼저 사라지면 안 되므로 어차피 남아 있어야 한다).
- ⚠️ 모바일 X 는 96 뷰박스 SVG 를 48 박스에 넣은 것이라 선이 얇아진다 — `stroke-width:2.25`
  로 정적 사이트의 1.125px 굵기를 되돌린다(그래서 SVG 도 한 벌로 끝난다).
- 문장 **중간**에서 끊는 줄바꿈(약관 도입문)은 `.tm-br-pc` 로 ≤1023 에서 접는다. 접히는
  자리에 **공백을 남겨야 한다** — `display:none` 만 하면 앞뒤 단어가 붙는다.
- **확인함**(dev 5599, 브라우저 패널): 1440 에서 카드 1188px·라운드 46.9·타이틀 78.9px
  (`--v` 보간이 맞다), 390 에서 390×844 풀스크린·딤 없음·패딩 90/20/64·gap 40·X 48박스
  (16/12)·타이틀 40·소제목 16·본문 14, 두 문서 10/13개 조항 전부 렌더, 링크를 눌러도
  **동의 체크박스가 토글되지 않음**, ESC·X·카드 바깥 클릭으로 닫히고 카드 안쪽 클릭은
  안 닫힘, 열고 닫을 때 `rc-lock`/`lenis.isStopped` 가 켜졌다 꺼짐, 열어 둔 채 390↔1440 을
  오가도 **닫히지 않고 모습만 바뀜**, 콘솔 에러 없음(analytics CORS 는 기존 것).
  **확인 못 함**: 페이드/슬라이드 연출 자체 — 브라우저 패널은 rAF 가 멈춰 트랜지션이 안 돈다
  (트랜지션을 끄고 최종 상태만 확인했다). 사람이 실제 브라우저에서 볼 것.

**Careers 입사지원에 동의 절차 추가 (2026-09-02)**

- 사용자 요청: Contact 문의 폼의 "이용약관 및 개인정보처리방침에 동의합니다." 줄을
  **Careers 팝업의 [입사지원] 버튼 위에** 넣는다. 이력서는 사진·생년월일이 담기는 가장
  민감한 자료인데 수집 근거가 화면에 없던 것을 메운 것이기도 하다(보유기간 절의 미해결 항목).
- 마크업은 **문의 폼과 같은 것을 그대로 쓴다** — PC `.ct-consent`(40px 원), 모바일
  `.mc-consent`(24px 원), 문구는 두 곳 다 `ConsentLinks` 한 컴포넌트다. 새 클래스를
  만들지 않았다.
- **제출 게이팅에 넣었다** — 문의 폼과 같은 규칙(체크 전에는 버튼이 회색, 누르면 그 줄로
  튀고 원이 펄스). 아무것도 막지 않는 동의 체크는 법적으로 의미가 없다.
  ⚠️ 값은 **저장하지 않는다** — `recruits` 에 컬럼이 없고 `quotes` 도 마찬가지다
  (동의 사실을 남겨야 하면 두 테이블에 같이 붙일 것).
- ⚠️ **`.ct-rv` 리빌이 이 줄도 숨긴다.** `html.ct-rv` 는 `.ct-field/.ct-consent/.ct-submit`
  을 전부 `opacity:0` 으로 태어나게 하는데, 팝업은 그 IO 패스에 없어서 영영 `.in` 이 안
  붙는다(버튼이 이미 `.rc-footer .ct-submit` 로 예외 처리돼 있던 이유). 동의 줄에도 같은
  예외를 넣었다 — `.rc-modal .rc-footer .ct-consent` / `.ct-rv .mr-popup .mc-consent`.
  **팝업에 `.ct-*`/`.mc-*` 폼 요소를 새로 넣을 때마다 이 예외가 필요한지 볼 것.**

- ⚠️ **모달 위에 모달이 뜨면서 스크롤 잠금이 조용히 풀렸다 → `lib/scrollLock.ts` 로
  세어서 건다.** 동의 문구의 링크가 약관·방침 팝업(LegalModal)을 Careers 팝업 **위에**
  여는데, 세 모달이 각자 `html.rc-lock` 을 붙였다 떼는 구조라 약관 팝업을 닫는 순간
  Careers 는 그대로 떠 있는데 **뒤 페이지가 스크롤되기 시작한다.** `lockScroll()` 이
  깊이를 세고 마지막 하나가 빠질 때만 실제로 푼다. 세 모달(RecruitModal ·
  MobileRecruitModal · LegalModal)이 전부 이걸 쓴다.
  ⚠️ **새 모달을 만들면 `rc-lock` 을 직접 붙이지 말고 `lockScroll()` 을 쓸 것.**
- ⚠️ **겹친 모달은 ESC·바깥클릭을 위쪽에 양보해야 한다.** 두 recruit 모달의 ESC/바깥클릭
  effect 를 `legalDoc` 으로 막았다(`useLegal()` 로 읽는다). 안 막으면 —
  ① ESC 한 번에 **둘 다** 닫히고
  ② 약관 카드 안을 누른 것이 `.rc-card` 바깥이라 **PC Careers 팝업이 닫혀 버린다**
     (위 open/active 함정과 같은 뿌리 — `contains()` 는 겹친 다른 트리를 모른다).
  → 그래서 두 recruit 모달은 `LegalProvider` 안에 있어야 한다(지금 `/contact` 가 그렇다).
- 체크 상태도 **1024 경계를 넘어 옮겨 실린다** — `RecruitContext` 의 `Draft` 에
  `consent: boolean` 을 더했다. 체크박스도 uncontrolled 라 진실은 DOM 이다.
  ⚠️ 복원은 `checked` 를 직접 쓴다(`setValue` 는 `value` 용이라 체크박스에 안 먹는다).
- PC 레이아웃: `.rc-footer` 는 `[빈 슬롯][본문]` 인데 본문(`.rc-footer-main`)이 세로로
  `[동의][버튼]` 이 됐다. 빈 슬롯은 그대로 두 줄 모두를 `.rc-fields` 열에 맞춰 들여쓴다.
  모바일: `.mr-footer` 가 `flex-column`(gap 16)이 되고, 흰 페이드 푸터가 높아진 만큼
  `.mr-scroll` 의 `padding-bottom` 을 184→224 로 올렸다(바닥까지 스크롤했을 때의 여백
  64px 를 그대로 유지하는 값이다 — 푸터 높이를 바꾸면 여기도 같이 바꿀 것).

- ⚠️ **동의 줄을 얹으니 PC 모달이 확실히 스크롤됐다 → 세로 압축(`--sq`)을 넣었다.**
  사실 **원래부터 스크롤이었다** — 내용이 974px(1440 기준)이라 창 높이가 **1006px 이상**이어야
  스크롤이 안 났고(동의 줄이 붙어 1070px), 노트북에서는 사실상 항상 났다. 사용자 요청으로
  "한 화면에 들어가게" 로 방향을 정했다.
  - `--sq` 는 `--v`/`--g` 와 같은 방식의 보간값이다(0px = 원래 디자인, 1px = 최대 압축).
    `N * var(--sq)` 를 **빼는** 식으로 카드 세로 패딩·모달 여백·챕터 gap·`Careers` 제목 크기·
    리드 줄간격·칩 세로 간격을 줄인다. 컨트롤(입력·칩·버튼) 크기는 건드리지 않았다.
  - ⚠️ **필요한 압축량은 폭에 비례한다** — 폭이 넓으면 `--v`/`--g` 로 글자·여백이 같이 커지기
    때문이다. 그래서 압축 시작 높이에 `120 * var(--v) + 140 * var(--g)` 를 더한다.
    처음엔 폭과 무관한 식으로 넣었다가 **1920x1080 에서 28px, 2560x1080 에서 21px** 이 남았고,
    반대로 좁은 쪽에 맞추면 1024x900 이 과하게 눌렸다. 방향을 거꾸로(좁을수록 더 압축) 잡은
    시도도 있었는데 그건 **더 나빴다** — 1439 이하에서는 지원분야 칩이 2-up 으로 접혀 한 줄이
    더 생기므로 좁은 쪽도 압축이 꽤 필요하다.
  - ⚠️ **값을 손볼 때는 반드시 브라우저에서 `.rc-scroll` 의 `scrollHeight - clientHeight` 를
    0 으로 실측할 것.** 눈으로는 몇 px 넘치는 것이 안 보인다.
  - ⚠️⚠️ **`.tm-*`(약관 팝업) 규칙에 `var(--sq)` 를 넣지 말 것.** 변수는 `.rc-modal` 에만
    있으므로 그쪽에서는 선언이 통째로 무효(IACVT)가 되어 `gap`/`top` 이 초기값으로 튄다
    (1번 함정과 같은 계열). 실제로 이 작업 중 `.rc-close`/`.rc-scroll`/`.rc-eyebrow` 와
    **선언이 글자 단위로 똑같은** `.tm-close`/`.tm-scroll`/`.tm-title` 까지 일괄 치환돼
    약관 팝업이 조용히 망가졌다 — 되돌렸다. 두 블록은 값이 같으니 **치환은 반드시 `.rc-`
    구간으로 한정할 것.** 약관 팝업은 전문이 길어 **스크롤이 정상**이라 압축 대상이 아니다.
  - **확인함**(실측, `.rc-scroll` 오버플로 0): 1024x900 · 1024x768 · 1280x900 · 1280x800 ·
    1280x760 · 1440x900 · 1440x780 · 1440x1200 · 1600x1000 · 1700x900 · 1920x900 · 1920x1000 ·
    1920x1080 · 2200x1080 · 2560x1080 · 2560x1200 · 2560x1300 · 2560x1440.
    2560x1440 은 `--sq`=0 이라 **원래 디자인 그대로**다(패딩 96 · 제목 120px).
    1024x700 만 4px 남고, 창 높이 ~700 아래에서는 여전히 스크롤된다(그 아래는 포기).
    약관 팝업도 되돌린 뒤 원래 값 복귀 확인(1440 에서 close top 59.14 · gap 64 · 제목 78.86).

- **확인함**(dev 5599, 브라우저 패널): 1440 에서 동의 줄이 `.rc-fields` 와 같은 x(475)로
  버튼 위 24px 에 서고 한 줄에 들어감 · 390 에서 푸터 안 `[동의][버튼]`, 바닥까지 스크롤해도
  가림 없음(간격 64px) · **링크를 눌러도 체크박스가 토글되지 않고** 약관 팝업이 위에 뜸
  (`elementFromPoint` 가 `.tm-card`) · 그 카드 안 mousedown 으로 Careers 가 **안 닫힘** ·
  ESC 1회는 약관만, 2회째에 Careers (그동안 `rc-lock`/`lenis.isStopped` 가 계속 true,
  마지막에만 해제) · 게이팅(동의 전 `ct-submit`, 후 `ct-submit is-ready` + 배경 #3e3f44,
  해제 후 제출하면 `mc-flash`) · 1440↔390 왕복에 체크·이름·연락처·이메일·첨부가 그대로 ·
  닫았다 다시 열어도 유지 · 페이지 자체 동의 링크/팝업 회귀 없음 · 콘솔 에러 0.
  **확인 못 함**: 실제 접수 왕복(018 은 반영돼 있으나 눌러 보지 않았다)과 페이드 연출
  자체 — 브라우저 패널은 rAF 가 멈춰 트랜지션이 안 돈다(트랜지션을 끄고 최종값을 읽었다).

**Supabase 지역 이전 — 새 프로젝트로 갈아탐 (2026-09-01)**

지역을 바꾸려고 새 Supabase 프로젝트를 만들고 옮겼다.
`gepphbqhnuufnincxmor`(옛) → `sbukxdevjuplwjnbmvpy`(새).

⚠️ **핵심 교훈 — `public` 스키마의 테이블·데이터만 넘어오고 나머지는 안 넘어온다.**
검증은 anon/service_role 로 REST 를 직접 찔러서 했다(표나 대시보드를 믿지 말 것).
안 넘어온 것이 넷이고, **넷 다 빌드도 콘솔도 조용하다.**

1. **`auth` 스키마** — 계정 0개. 프로필(`admin_users`)만 2건 남아 **로그인 자체가 불가**.
   덤으로 `admin_users.id → auth.users(id)` **FK 도 유실**됐다. 데이터 임포트가
   `admin_users` 를 FK 없이 **먼저** 만들어서 001 의 `create table if not exists` 가
   통째로 건너뛰어진 것. 002 의 `on_auth_user_created` 트리거도 없다(계정을 새로
   만들어도 프로필이 자동 생성되지 않는 것으로 확인).
   → 대시보드에서 계정을 만든 뒤 `update admin_users set id = <새 uid>` 로 기존
   프로필에 이어 붙였다(권한 배열 보존).
   ⚠️ **Auto Confirm User 를 반드시 체크할 것** — 안 하면 `Email not confirmed` 로
   막히는데 무료 플랜은 확인 메일이 발송되지도 않아 영영 못 넘어간다.
   ℹ️ 로그인은 `login_id` 가 아니라 **이메일**이다(`signInWithPassword({ email })`).
   `admin_users.email` 은 표시용이고 **unique 제약이 없다**(`login_id` 에는 있다) —
   그래서 Auth 이메일을 옛 값에 맞출 필요가 없다. 실제로 `hello@` → `jh.lim@` 로 바뀌었다.

2. **Storage 버킷 3개 전부** — `GET /storage/v1/bucket` 이 `[]` 였다. `/brief.pdf` 가
   400, 첨부파일 업로드가 `NoSuchBucket`, 썸네일 업로드 불가.
   ⚠️ **새 프로젝트에서는 SQL Editor 의 `insert into storage.buckets` 가 안 먹는다** —
   006·016·018 을 돌려도 버킷이 안 생긴다. **Storage API 나 대시보드로 만들 것.**
   ⚠️ **016 의 60MB 는 만들어지지 않는다** — 프로젝트 전역 업로드 한도(50MB)를 넘어
   `413 EntityTooLarge` 가 난다. 50MB 로 낮췄다(실제 파일 18.7MB 라 여유가 있다).

3. **마이그레이션 파일이 없는 테이블의 RLS 정책** — `quotes` `pageviews` `downloads`
   `internal_ips`. 이 저장소에 정의가 없어서 "정책이 통째로 유실됐다" 고 판단했으나
   **그 부분은 오진이었다.** 옛 프로젝트에서 대시보드로 만들어 둔 정책이 그대로
   살아 있었다(`Anyone can submit a quote`, `authenticated can select downloads` 등).

   ⚠️⚠️ **오진의 원인 — `Prefer: return=representation` 으로 RLS 를 검증하지 말 것.**
   그걸 붙여 INSERT 하면 RETURNING 이 **SELECT 정책까지** 통과해야 하는데 anon 에게는
   SELECT 정책이 없어 `42501 new row violates row-level security policy` 가 난다.
   **쓰기는 성공하는데 읽기 권한이 없어서 나는 에러**인데 메시지는 쓰기가 막힌 것처럼
   보인다. 앱은 `supabase.from('quotes').insert(...)` 로 `.select()` 없이 부르므로
   `return=minimal` 이라 이 경로를 아예 안 탄다 — **Contact 문의하기는 처음부터 정상이었다.**
   실측: representation 붙이면 42501 → 떼면 `23502`(phone NOT NULL) → 채우면 **201**.

   → 019 는 그래도 의미가 있다. 이 넷의 **정본 정의**가 저장소에 생겼으니 다음에 또
   옮길 때 같이 돌리면 된다.
   ⚠️ **다만 019 의 정책은 레거시 정책과 나란히 붙는다.** permissive 는 **OR** 로
   합쳐지므로(8번 함정, 007 에서 이미 밟았다) `using true` 인 레거시가 하나라도
   남아 있으면 019 가 건 `has_admin_permission(...)` 게이팅은 **아무 효과가 없다.**
   `021` 이 레거시를 지워야 비로소 먹는다.

4. **Edge Function `track`** — 404. 방문자 분석이 기록되지 않았다.
   → 새 프로젝트에 배포 완료(2026-09-01).
   ⚠️ **CLAUDE.md 의 경고가 실제로 맞았다** — 옛 저장소(`../official`)의 소스에는
   **봇 필터가 없고**, 옛 프로젝트에 배포돼 있던 것에는 있었다. 그대로 배포했으면
   검색엔진 봇·소셜 링크 프리뷰가 조회수에 섞일 뻔했다.
   `functions download` 로 배포본을 받아 **그쪽을 정본으로 채택**했고,
   지금 `supabase/functions/track/index.ts` 가 그 내용이다(봇 UA 정규식 + `isBot`,
   `whoami` 는 봇/내부 판정보다 **앞**에 둬서 진단용으로 항상 답한다).
   ⚠️ 받은 파일이 **CRLF** 라 diff 가 전체 변경으로 보인다 — LF 로 정규화해서 넣었다.
   **확인함**: `whoami` → 사무실 IP(115.91.159.217) 반환, curl UA → `{"skipped":"bot"}`,
   브라우저 UA → `{"skipped":"internal"}`(사무실이라 정상 제외, 행 안 들어감).
   ℹ️ 그래서 **사무실에서는 아무리 눌러도 분석 수치가 안 오른다** — 고장이 아니다.

**이미지 89개** — DB 의 `thumb_pc`·`thumb_mobile`·`thumb_main`·`client_ci` 가 전부 옛
프로젝트 URL 이었다. **옛 프로젝트가 아직 살아 있어 화면은 멀쩡해 보였다** — 그래서
그냥 두면 옛 프로젝트를 지우거나 7일 미사용으로 일시정지되는 순간 전부 깨진다.
→ 공개 URL 로 내려받아 새 버킷에 올리고(138MB) DB URL 을 치환했다.
⚠️ **치환하면 `updated_at` 이 밀린다** — `portfolios_touch` 가 BEFORE UPDATE 라 목록의
수정일이 전부 오늘로 바뀐다. 스냅샷했다가 되돌렸다 — **`updated_at` 만 다른 UPDATE 는
012 의 WHEN 가드에 걸려 트리거가 안 탄다**. 그 성질을 이용한 것이라 원복 자체는 공짜다.
(014 처럼 트리거를 껐다 켜는 방법도 있지만 그건 SQL Editor 에서만 된다.)

**확인함**(2026-09-01, REST 실측): 버킷 3개 · 파일 89개(thumb-pc 37 / thumb-mobile 37 /
thumb-main 6 / client-ci 9) · brief PDF 18.7MB(`%PDF-`) · **옛 ref 참조 0건** ·
`updated_at` 어긋난 행 0 · `render/image` 변환 200(webp 25KB, 유료 기능이 켜져 있다) ·
CORS `*`(15번 canvas 오염 방지 성립) · anon 으로 미공개 포트폴리오 유출 0건 ·
`admin_users`/`recruits` anon 읽기 차단 · `reorder_portfolios`·`has_admin_permission` 존재 ·
012 INSERT 트리거 동작(`sort_order=0`) · dev 5599 에서 `/` `/projects` `/contact` 200 이고
옛 ref 0건 · `/brief.pdf` 206 · 타입체크 통과.
**019·021 실행 뒤 최종 확인**(2026-09-01, anon 키로 실측): 견적문의 접수 201 ·
입사지원 접수 201 · 이력서 첨부 업로드 200 · 포트폴리오 공개 조회 45건(미공개 15건 제외) ·
`quotes`/`recruits`/`admin_users`/`pageviews`/`downloads`/`internal_ips` 전부 `[]` 차단 ·
이력서 첨부 공개읽기 400 차단 · 행 수 무변동(60/2/3/2).
**확인 못 함**: 로그인한 어드민 화면의 실동작(포트폴리오 CRUD · 목록 드래그 순서 ·
견적문의 조회 · 첨부 다운로드 · 분석 화면 렌더) — 세션이 없어 게이트를 못 넘는다.
**Vercel 환경변수도 아직 안 바꿨다**(사용자가 마지막에 교체 예정).

ℹ️ **캐시는 회귀가 아니다** — 새 프로젝트 Storage 가 `cache-control: no-cache` 를 주는데
**옛 프로젝트도 똑같았다**(ETag 동일, 재요청 304 / 0바이트라 전송량 영향은 없다).
업로드 시 `cacheControl` 을 세 가지 방식(헤더 · multipart `3600` · multipart
`max-age=3600`)으로 줘 봤지만 **전부 무시된다.** `/brief.pdf` 의 CDN 캐시는
`next.config.ts` 의 `Vercel-CDN-Cache-Control` 이 담당한다(여전히 Vercel 에서 확인 필요).

⚠️ **`supabase` CLI 는 로그인돼 있지 않다** — `supabase login` 없이는 함수 배포도
`db push` 도 안 된다. 그래서 019 는 사람이 SQL Editor 에 붙여넣어야 한다.

⚠️ **Deno 함수를 저장소에 두면 `npm run typecheck` 가 깨진다** — `tsconfig.json` 의
`include` 가 `**/*.ts` 라 `supabase/functions` 까지 잡아 `Cannot find name 'Deno'` 가
난다. `exclude` 에 넣었다. 새 Edge Function 을 추가해도 같은 곳이 이미 막아 준다.

**견적문의 개인정보 통제 — 마스킹 · 열람기록 · 다운로드 사유 (2026-09-01, `020`)**

- 사용자 결정: ① 다운로드는 **조회 화면의 건별 CSV** 다(견적문의에는 원래 다운로드도
  첨부파일 컬럼도 없었다). 처음엔 목록 전체 내보내기로 만들었다가 **"전체 말고 건별로"** 로
  바꿨다 — 목록에는 버튼을 두지 않는다. 한 번에 수십 건이 빠져나가는 경로를 아예 안 만드는
  편이 통제에 맞다. (`buildQuotesCsv` 는 여러 행을 그대로 받으므로, 목록 일괄 내보내기가
  다시 필요해지면 목록 쪽에 버튼과 사유 모달만 붙이면 된다.)
  ② 조회 화면에서는 **원본을 다 보여주되 로그를 남긴다** ③ 로그는 **조회할 때와 다운로드할
  때** 남긴다 ④ 로그를 볼 **화면은 만들지 않는다**(대시보드에서 확인 — 나중에 붙이려면
  select 정책 하나만 열면 된다).
- **가리는 것은 기업명·신청인·연락처·이메일 넷**이다(`lib/mask.ts`).
  `인스플래닛 → 인스***` · `홍길동 → 홍*동` · `010-****-5678` · `ab****@x.co.kr`.
  규칙이 셋으로 갈리는 이유는 각 주석에 적어 뒀다 — 이름은 **가운데**를 가리고(끝 글자가
  식별에 덜 쓰인다), 기업명은 **앞 2자만** 남기며(뒤에 ㈜·Inc 꼬리가 붙어 끝을 남겨도
  소용없다), 연락처는 02 지역번호만 두 자리로 자른다(안 그러면 `021-***-5678` 로 보인다).
  두 글자짜리 이름·기업명은 한 글자만 남긴다 — 앞 2자를 남기면 통째로 드러난다.
  ⚠️ **목록의 검색은 원본으로 계속 돌아간다**(가려진 문자열이 아니라 `r.company`/`r.person`
  을 본다). 마스킹 규칙을 바꿔도 검색은 영향을 받지 않는다.
  ⚠️ **마스킹은 보호가 아니라 표시 제한이다.** 원본은 RLS 를 통과해 브라우저까지 내려오므로
  REST 를 직접 부르면 그대로 보인다. 실제 통제는 메뉴권한 RLS + 기록이다.
- ⚠️ **원본 노출을 로그 성공에 묶었다.** 조회 화면도 처음에는 넷 다 마스킹된 값으로 그려 놓고
  `quote_access_logs` insert 가 성공해야 원본으로 바꾼다. 실패하면(020 미실행·권한 없음)
  가린 채로 두고 띠 배너만 띄운다 — 화면을 통째로 막으면 마이그레이션 하나 때문에 업무가
  멈추고, 그냥 보여주면 "기록 없는 열람" 이 생긴다. CSV 도 같은 순서다:
  **사유 → 기록 성공 → 파일 생성.** 순서를 뒤집지 말 것.
- ⚠️ **로그 테이블은 append-only 다.** `insert` 정책만 만들고 select/update/delete 정책은
  **일부러 없다**(RLS on + 정책 0개 = 전면 차단). 기록을 남긴 사람이 그 기록을 지울 수
  있으면 감사 기록이 아니다. service_role(대시보드)만 읽는다.
  ⚠️ 그래서 `.insert()` 뒤에 **`.select()` 를 붙이면 안 된다** — supabase-js 의 insert 는
  기본이 `return=minimal` 이라 지금은 통과하지만, 붙이는 순간 권한 오류로 기록이 실패한다.
- 건별 다운로드는 `quote_id` 도 채운다 — 그래야 "이 문의를 누가 언제 받아 갔나" 를 view
  기록과 **같은 컬럼으로** 되짚을 수 있다(목록 단위면 target_ids 만 찬다).
- ⚠️ **행위자는 클라이언트가 보내지 않는다** — `stamp_quote_access_actor` 트리거가
  `auth.uid()` 로 덮어쓰고 `admin_users` 에서 이름·이메일을 **복사해 둔다**(조인이 아니다).
  계정이 지워져도 "누가 봤는지" 가 남아야 하기 때문이다. `quote_id` 에 FK 를 안 건 것도
  같은 이유(문의가 지워져도 기록은 남는다).
- ⚠️ 조회 로그는 **ref 로 한 번만** 쏜다. StrictMode 가 effect 를 두 번 돌리므로 state 가
  아니라 ref 여야 한다(재마운트에도 값이 유지된다).
- ⚠️ **사유 모달(`ReasonDialog`)을 body 로 포탈하지 않는다.** 어드민 토큰(`--surface`
  `--line` …)이 `theme.module.css` 의 `.theme` 루트에 있어 DOM 상속으로 내려오므로, 포탈로
  그 밖에 그리면 색이 통째로 사라진다(마케팅에서 `.mr-popup` 이 겪은 것과 같은 함정).
  어드민 본문에는 transform 걸린 조상이 없어 그 자리에서도 `position:fixed` 가 정상이다.
- CSV — 엑셀이 한글을 읽으려면 **BOM 이 필요하다**(빼면 깨진다). `=`·`+`·`-`·`@` 로 시작하는
  셀은 앞에 `'` 를 붙여 수식 실행(CSV 인젝션)을 막는다.
- **확인함 (019·020 실행 후, 2026-09-01)**:
  · `quote_access_logs` 존재 · 컬럼 11개 전부 · 사용자가 조회 화면에 들어간 **view 기록 3행이
    실제로 쌓였고**, 트리거가 `actor_id`/`actor_email`/`actor_name` 을 채운 것을 확인
    (클라이언트는 그 값을 보내지 않는다).
  · anon 은 로그를 **읽지 못하고(빈 배열) 쓰지도 못한다**(42501).
  · 사유 없는 download · 공백 사유 · 정의되지 않은 action 은 전부 **23514 로 거부**되고
    행 수는 그대로였다(제약이 실제 방어선임을 확인). `uuid[]`/`jsonb` 페이로드도 타입 오류
    없이 통과하는 것을 같은 방법으로 확인했다(사유만 비워 두면 아무것도 안 써진다).
  · 019 확인 — anon 이 `quotes` 에 **insert 201**(Contact 문의 접수 복구), select 는 여전히
    빈 배열. 테스트 행은 넣은 즉시 지웠고 남은 건 0이다.
  · 단위 테스트: `maskPhone`/`maskEmail`/`maskName`/`maskCompany` 13케이스, CSV 이스케이프(따옴표·쉼표·개행)·인젝션
    방어·파일명 라벨/금칙문자 제거. 타입체크 통과, `/admin/quotes`·`/admin/quotes/[id]` 200.
  **확인 못 함**: 어드민 화면에서의 **CSV 다운로드 왕복** — 세션이 없어 못 눌러 봤다
  (로그에도 아직 `download` 행이 없다). 사람이 조회 화면에서 한 번 받아 보고
  `action='download'` 행에 사유가 남는지 확인할 것.

**견적문의 목록 — 행 클릭으로 조회 (2026-09-01)**

- 행 아무 데나 눌러도 조회 화면으로 간다(전에는 굵은 기업명 링크만 눌렸다). 포트폴리오
  목록과 같은 방식이다 — `<tr>` 는 `<Link>` 로 감쌀 수 없어(테이블 안에서 `<a>` 가 행을
  감싸는 마크업은 스펙 위반이라 브라우저가 `<a>` 를 표 밖으로 끄집어낸다) `router.push` 를 쓴다.
- 기업명의 `<Link>` 는 그대로 둔다 — 키보드 포커스·스크린리더·새 탭으로 열기가 거기 달려 있다.
  ⚠️ `a, button, input, select, label` 안에서 시작한 클릭은 거른다 — **진행 상태 `<select>` 가
  여기 걸린다.** 안 거르면 상태를 바꾸려고 눌렀는데 상세로 튄다.
- 글자를 긁던 중(`getSelection()`)이면 이동하지 않고, ⌘/Ctrl 클릭은 새 탭으로 연다.

**견적문의 첨부파일 (2026-09-02, `023_quote_attachments.sql`)**

- Contact 문의 폼의 파일첨부 칸이 이제 실제로 파일을 보낸다. 예전엔 **칸은 있는데 그 파일이
  아무 데도 안 갔다** — `quotes` 에 컬럼이 없어 두 폼이 조용히 버렸다(에러도 안 났다).
  구성은 018(recruits)과 같다 — 컬럼 3개 + **비공개** 버킷 + "업로드 → insert" 순서
  (anon 에게 update 권한이 없으므로 id 를 클라이언트가 만들어 `quote/<id>/<파일명>` 에
  먼저 올린다). 어드민 `/admin/quotes/<id>` 조회 화면에서 서명 URL 로 내려받는다.

- **PC 폼과 모바일 폼이 같은 `submitQuote`(`lib/quotes.ts`)를 쓴다.** 예전엔 두 폼이 각자
  `supabase.from('quotes').insert(...)` 를 적고 있었다 — 첨부가 붙으면서 규칙이 갈릴 이유가
  없어 `submitRecruit` 과 같은 모양으로 모았다.

- ⚠️ **업로드가 실패해도 문의 접수는 막지 않는다.** 023 을 안 돌린 배포본에서는 버킷 정책이
  없어 anon 업로드가 403 인데, 거기서 에러를 반환하면 **첨부 하나 때문에 견적문의를 통째로
  잃는다.** 그래서 크기 초과(의뢰인이 고칠 수 있는 문제)만 알리고, 나머지 실패는
  `fileDropped` 로 돌려 "문의는 접수됐고 첨부만 저장되지 않았다" 고 알린다.
  같은 이유로 insert 가 PGRST204(컬럼 없음)면 `file_*` 를 빼고 한 번 더 넣는다.
  **확인함**(dev 5599, 023 실행 전): 한글 파일명으로 첨부해 제출 → 업로드 403 →
  문의는 접수되고 안내 문구가 뜸, 폼·파일명 칸까지 초기화됨. 테스트 행은 바로 지웠다.

- ⚠️ **첨부가 없으면 `file_*` 키를 아예 보내지 않는다** — 023 이전 DB 에 그 키를 보내면
  PGRST204 로 **모든 문의 접수가 실패한다**(예전에 실제로 밟았던 지뢰다).

- **다운로드는 열람 기록을 남긴다** — `quote_access_logs.action` 에 `'file'` 을 더했다(023).
  순서는 CSV 와 같다: **기록 성공 → 파일**. 기록이 실패하면 내려받지 않는다.
  ⚠️ 다만 **사유는 받지 않는다** — CSV 는 연락처·이메일이 원본 그대로 파일에 담기지만
  첨부는 의뢰인이 스스로 올린 그 한 건의 자료라 여는 빈도가 다르다. `reason` 제약은
  `action='download'` 에만 걸려 있어 상수만 늘리면 됐다.
  ⚠️ 023 의 action 제약 교체는 **이름이 아니라 정의로 찾아 지운다** — 020 의 검사가
  이름 없는 인라인 `check` 라 자동 생성 이름이 환경마다 다를 수 있다.

- ⚠️ **비공개 버킷 `quote` 는 023 이전에 이미 Storage API 로 만들어져 있었다**(50MB).
  새 프로젝트에서는 SQL 로 버킷이 안 만들어지므로(지역 이전 때 006·016·018 이 전부 그랬다)
  023 의 `insert into storage.buckets` 는 **갱신만** 한다. 버킷이 없는 환경이면 대시보드나
  Storage API 로 먼저 만들 것.

- **확인함 (023 실행 후, 2026-09-02, dev 5599 + REST 실측)**:
  · `quotes.file_path/file_name/file_size` 존재 · `quote` 버킷 비공개 50MB
  · anon 업로드 **200**, anon 의 공개 읽기·서명 발급은 **400 차단**
  · Contact 폼에서 한글 파일명 PDF 를 첨부해 접수 → 행에 `file_*` 3개가 다 차고
    버킷에 파일이 올라감 → 서명 URL 이 **`견적 요청서(테스트) 최종본.pdf`** 로 내려옴
    (`content-type: application/pdf`, 4096바이트)
  · `quote_access_logs` 가 `action='file'` 을 받고(201), 정의되지 않은 action 과
    사유 없는 download 는 여전히 **23514 로 거부**, anon 은 **42501 로 차단**
  · 테스트로 넣은 행 2건·파일 2건·로그 1행은 전부 지웠다(quotes 4행 · quote 버킷 0개로 복귀).
- **확인 못 함**: 어드민 조회 화면에서 사람이 실제로 눌러 받는 왕복 — 세션이 없어
  게이트를 못 넘는다. 다운로드 URL 자체는 어드민 코드와 **같은 방식으로 조립해** 확인했다.

**포트폴리오 분류를 다중 선택으로 (2026-09-02, `022_portfolio_categories.sql`)**

- 한 프로젝트에 분류를 하나만 걸 수 있던 것을 **체크박스 다중 선택**으로 바꿨다.
  "웹이면서 앱" 인 프로젝트가 `/projects` 필터에서 **Web 칩을 눌러도 Mobile 칩을 눌러도
  나와야 한다**(사용자 결정). 어드민 폼은 `Dropdown` → **`CheckGrid`** 로 교체했다 —
  메뉴권한이 쓰던 그 컴포넌트고 `allLabel="전체"` 만 넘기면 '전체' 체크박스가 딸려 온다
  (사용자 결정: 전체 항목을 둔다). 저장되는 값은 여전히 3종뿐이다.

- ⚠️ **읽는 쪽은 `row.categories` 를 직접 보지 말고 `categoriesOf(row)` 를 쓴다.**
  세 가지를 한 곳에서 흡수한다: ① **022 미실행 DB** — `select('*')` 결과에 그 키가
  아예 없으므로 옛 `category` 한 칸으로 물러난다(그래서 마이그레이션 전에도 화면이
  그대로다 — 실측 확인) ② DB check 가 `not valid` 라 옛 행에 남을 수 있는 엉뚱한 값을
  화이트리스트로 거른다 ③ **순서 고정** — 체크한 순서대로 두면 라벨이 'Mobile, Web' 이
  됐다 'Web, Mobile' 이 됐다 흔들리므로 늘 `CATEGORY_VALUES` 순으로 세운다.
  라벨은 `categoryLabel()` 하나로 만든다 — **쉼표 구분**(사용자 결정).

- ⚠️ **옛 `category` 컬럼을 지우지 않았고, `toRow` 가 `categories[0]` 을 거기 계속
  써 넣는다**(레거시 미러). 022 를 돌리기 전 코드로 되돌려야 할 때 분류가 통째로
  사라지지 않게 하려는 것이다. **읽는 곳은 한 군데도 없다** — 새로 읽지 말 것.
  미러를 지우기로 하면 `toRow` 와 022 의 컬럼 주석을 같이 손봐야 한다.

- **어드민 목록의 분류 칸은 배지를 개수만큼 그린다**(`CategoryCell`, 2026-09-01).
  `categoryLabel()` 로 이어 붙이면 `Web, Mobile` 이 **배지 하나**에 들어가 칸을 뚫는다.
  - **색을 셋으로 갈랐다** — Web=BLUE · Mobile=TEAL · Consulting=ORANGE(`CATEGORY_COLOR`).
    ⚠️ 옆 칸이 진행중=BLUE · 종료=GREEN 이고 [메인] 배지도 BLUE 라, **GREEN 은 피하고**
    RED(오류로 읽힌다)도 안 썼다. Web 의 BLUE 만 "진행중" 과 겹치는데 진행중인 행이 드물어
    나란히 보일 일이 거의 없다. 더 갈라 놓고 싶으면 분류 색을 바꾸지 말고 **진행 상태 쪽
    variant 를 solid 로** 올릴 것 — 분류는 셋 다 채워야 해서 쓸 수 있는 색이 더 적다.
  - ⚠️ **접지 않는다(`wrap="nowrap"`).** 접으면 그 행만 키가 커져 표의 가로선 간격이
    들쭉날쭉해진다(사용자 지적). 실측: wrap 이면 행 높이가 63/77 두 종류, nowrap 이면
    63 한 종류. nowrap 이면 이 칸의 min-content 폭이 "배지 3개 + gap" 으로 잡혀 브라우저가
    그보다 좁히지 못한다 — **폭을 픽셀로 맞출 필요가 없고** 분류가 늘어나도 알아서 넓어진다.
    ⚠️ `<th>` 의 `width` 는 **힌트일 뿐**이다. 이 표는 `table-layout:auto` 라 브라우저가
    내용에 맞춰 다시 나눈다(200 을 줬는데 실제로는 227px 이 됐다). 한 줄 보장은 오직
    nowrap 이 한다 — 폭 숫자를 만져서 맞추려 들지 말 것.
  ℹ️ `categoryLabel()` 은 그대로 쓴다 — `/projects` 카드 라벨·상세 조회·JSON-LD 는
  이어 붙인 문자열이 맞다. 배지로 쪼갠 건 어드민 목록 한 곳뿐이다.
- ⚠️ **`data-category` 는 이제 "공백으로 이어 붙인 목록"** 이다(`"web mobile"`).
  PC(`ProjectsExplorer`)·모바일(`MobileProjectsPage`) 둘 다 `pickFilter` 안에서
  `split(' ').includes(next)` 로 판정한다 — 예전처럼 `=== next` 로 비교하면 다중
  분류 카드에 리빌 클래스(`.in`)가 안 붙어 **필터로 들어온 카드가 opacity:0 으로 남는다.**

- ⚠️ **백필이 `updated_at` 을 밀지 않게 022 가 `portfolios_touch` 를 껐다 켠다**(014 와
  같은 이유). 012 의 WHEN 가드로는 못 막는다 — `categories` 값이 실제로 바뀌므로
  가드가 통과시킨다.

- ⚠️ 분류를 늘리면 **TS `CATEGORY_VALUES` 와 022 의 check 제약** 두 군데를 같이
  고쳐야 한다(`MAX_MAIN` 과 같은 성격의 이중 정의다).
- ℹ️ "하나 이상" 은 DB 제약으로 막지 않았다 — 백필로 `'{}'` 가 되는 옛 행(category 가
  NULL 이던 행)이 실제로 있고, 제약을 걸면 그 행은 **다른 필드 수정조차 못 하게 된다.**
  필수 여부는 어드민 `validate` 가 본다.
- ℹ️ GIN 인덱스는 만들지 않았다 — 분류 필터는 어드민 목록도 `/projects` 도 전부
  클라이언트에서 거른다(서버 쿼리에 category 조건이 없다). 서버 필터를 붙이면 그때 추가할 것.

- **확인함**(dev 5599, 022 **미실행** 상태):
  · 폴백 — `/projects` 카드 37장이 마이그레이션 전과 **동일하게** 렌더(라벨·필터·진행중 표).
  · 다중 분류 — 임시로 한 행에 `['Web','Mobile']` 을 넣어 실측: 카드 라벨 `Web, Mobile`,
    `data-category="web mobile"`, **Web 칩(20장)에서도 Mobile 칩(16장)에서도 보이고**
    Consulting 칩(2장)에서만 숨음, All 로 돌아오면 37장. 375 모바일 셀렉트도 동일하고
    필터 후 `.in` 이 붙는 것까지 확인. 콘솔 에러 0. (임시 패치는 되돌렸다.)
  · 단위 21케이스 — `categoriesOf`(폴백·정렬·화이트리스트) · `categoryLabel` ·
    `toRow`(정렬 저장 + 레거시 미러) · `validate`(0개 거부) · `toDraft` 왕복. 타입체크 통과.
  · 상세 `/projects/<id>` 200, sr-only `<dd>Web</dd>` + JSON-LD `"genre":"Web"`.
    (다중이면 `genre` 가 배열이 된다 — schema.org 에서 반복 가능한 속성이다.)
  **확인 못 함**: **어드민 폼의 실제 체크·저장 왕복** — 세션이 없어 게이트를 못 넘는다.
  022 를 돌린 뒤 사람이 ① 두 개 체크 → 저장 → 목록 배지가 `Web, Mobile` 인지
  ② `/projects` 에서 두 칩 모두에 나오는지 ③ '전체' 체크박스가 셋을 한 번에 켜고 끄는지
  확인할 것. **022 를 돌리기 전에 저장하면 PGRST204 로 실패한다** — `describeError` 가
  "최신 SQL 을 실행했는지 확인" 안내를 띄운다(막힌 것처럼 보이지만 정상 동작이다).

**메인 슬라이드 전용 제목 + 조회 화면에 메인 항목 노출 (2026-09-02, `026`)**

- **어드민 포트폴리오 조회 화면이 메인 관련 값을 다 보여 준다.** 예전에는 `썸네일 – 메인`
  하나만 나오고 Client·Launch 는 **[수정] 을 눌러야** 볼 수 있었다 — 조회만 해서는 무엇이
  메인에 나가는지 알 수 없었다(사용자 지적). 등록/수정 폼과 **같은 순서·같은 라벨**로 뒀다.
  `메인 - title` 은 줄바꿈이 실제로 어디서 걸리는지 보이도록 **줄 단위로** 그린다.

- **`main_title` 컬럼을 추가했다(026)** — 홈 "Our Projects" 슬라이드에 걸 제목.
  목록에 쓰기 좋은 이름과 슬라이드에 크게 거는 이름이 늘 같지는 않아서 따로 받는다.
  - **비어 있으면 `title` 로 되돌아간다**(`mainTitleOf`). 그래서 기존 행 백필이 필요 없고,
    **026 을 안 돌려도 홈 화면이 그대로다** — `select('*')` 결과에 그 키가 없으면 undefined 라
    폴백이 그대로 걸린다(실측 확인).
  - ⚠️ **`row.main_title` 을 직접 읽지 말 것** — 026 미실행 DB 에서는 키가 아예 없다.
    `mainTitleOf(row)` 한 곳에서 흡수한다(`categoriesOf` 와 같은 이유).
  - ⚠️ **줄바꿈 규칙은 `title` 과 똑같이 뒀다** — 한 줄 `<input>` 이라 사용자는 역슬래시+n
    두 글자를 치고 DB 에는 진짜 개행으로 저장한다(`toRow`/`toDraft` 가 경계에서 변환).
    사용자가 `|` 같은 다른 구분자도 제안했지만, 규칙이 둘이 되면 프로젝트명과 헷갈린다.
  - ⚠️ **026 을 돌리기 전에 저장하면 PGRST204 로 실패한다** — `toRow` 가 `main_title` 을
    항상 보내기 때문이다. 022 때와 같은 동작이고 `describeError` 가 "최신 SQL 을 실행했는지
    확인" 안내를 띄운다. **견적문의(023)처럼 키를 빼고 재시도하지 않는다** — 공개 폼은 접수를
    잃으면 안 되지만, 어드민 저장은 조용히 입력을 버리는 것보다 시끄럽게 실패하는 편이 낫다.
- **확인함**: `mainTitleOf` 폴백 4케이스(키 없음·null·공백만·두 줄), 폼 왕복
  (DB 개행 ↔ 역슬래시+n, 빈 값 → NULL), 026 미실행 상태에서 홈 슬라이드 3장이 예전과
  동일하게 렌더되고 콘솔 에러 0. 타입체크 통과.
  **확인 못 함**: 어드민 조회·수정 화면의 실제 렌더 — 세션이 없어 게이트를 못 넘는다.

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

⚠️ **2026-09-01 지역 이전으로 프로젝트가 통째로 바뀌었다.** 아래는 **새 프로젝트
(`sbukxdevjuplwjnbmvpy`) 기준**으로 REST 를 직접 찔러 다시 판정한 것이다. 옛 프로젝트
기준의 판정은 더 이상 의미가 없다.

| 파일                                     | 새 프로젝트 상태                                            |
| ---------------------------------------- | ----------------------------------------------------------- |
| `001_admin_users.sql`                    | ⚠️ **부분** — 테이블은 있으나 **FK 유실**. 019 가 복원      |
| `002_admin_users_sync.sql`               | ❌ **미반영** — `on_auth_user_created` 없음. 019 가 복원     |
| `003_fix_admin_users_rls_recursion.sql`  | ✅ `has_admin_permission` 존재 확인                          |
| `004_portfolios.sql`                     | ✅ RLS·`portfolios_touch` 동작 확인                          |
| `005_portfolios_seed.sql`                | ✅ (데이터 60행)                                             |
| `006_portfolio_storage.sql`              | ⚠️ **버킷은 코드가 API 로 생성**, 정책은 019 가 재적용       |
| `007_drop_legacy_portfolio_policies.sql` | ✅ anon 유출 0건으로 확인                                    |
| `008_portfolio_detail_html.sql`          | ✅                                                           |
| `009_portfolio_seed_thumbs.sql`          | ❌ 미실행 (썸네일이 이미 Storage URL 이라 불필요)            |
| `010_portfolio_main.sql`                 | ✅                                                           |
| `011_portfolio_main_meta.sql`            | ✅                                                           |
| `012_portfolio_sort_order.sql`           | ✅ INSERT 트리거·`reorder_portfolios` 동작 확인              |
| `013_drop_admin_main_permission.sql`     | ✅ 유령 권한 `'/admin/main'` 잔존 0건                        |
| `014_portfolio_html_folder.sql`          | ✅ 41행 전부 폴더명 표기, `bassId` 대소문자도 교정된 채 넘어옴 |
| `015_portfolio_main_limit.sql`           | ⚠️ **미확인** — 4건째를 넣어 봐야 알 수 있어 시도하지 않았다 |
| `016_brief_storage.sql`                  | ⚠️ **버킷은 코드가 API 로 생성(50MB)**, 정책은 019 가 재적용 |
| `017_drop_legacy_site_tables.sql`        | ⚠️ **부분** — `contacts` 는 없고 `brochure_history` 는 남음  |
| `018_recruits.sql`                       | ⚠️ **테이블·정책은 반영**(anon insert 201 확인), **버킷만 누락** → 코드가 생성 |
| `019_restore_after_region_move.sql`      | ✅ 사용자 실행 확인 (2026-09-01) — FK·Storage·분석 정책 반영 확인 |
| `021_drop_legacy_quote_analytics_policies.sql` | ✅ 사용자 실행 확인 (2026-09-01) — 남은 정책 5개 확인 |
| `020_quote_access_logs.sql`              | ✅ 테이블·제약·트리거·RLS 동작 확인 (view 기록 3행)          |
| `022_portfolio_categories.sql`           | ❌ **미실행** — 돌리기 전엔 어드민 분류 저장이 PGRST204 로 실패한다 |
| `023_quote_attachments.sql`              | ✅ 사용자 실행 확인 (2026-09-02) — 컬럼 3개·버킷·정책·`action='file'` 동작 확인 |
| `024_retention_purge.sql`                | ✅ 사용자 실행 확인 (2026-09-02) — `view/download/file/purge` 4값 통과, 그 밖은 23514 |
| `025_quotes_delete_policy.sql`           | ✅ 사용자 실행 확인 (2026-09-02) — 어드민 [삭제] 로 행·첨부 동시 삭제 확인 |
| `026_portfolio_main_title.sql`           | ❌ **미실행** — 돌리기 전엔 포트폴리오 저장이 PGRST204 로 실패한다 |

**실행 여부는 anon/service_role 키로 REST 를 찔러서 확인한다.** 컬럼은
`curl "$URL/rest/v1/<table>?select=<컬럼>&limit=1"`(없으면 42703), 테이블은 PGRST205,
함수는 `rpc/<이름>`(404 면 없음, 42501 이면 있음), 버킷은 `GET /storage/v1/bucket`.
**표를 믿기 전에 한 번 찔러 볼 것** — 이번에도 표와 실제가 여러 군데 어긋나 있었다.

⚠️ **`create table if not exists` 는 이전 시 함정이다.** 데이터 임포트가 제약 없는
테이블을 먼저 만들어 두면 원래 마이그레이션이 통째로 건너뛰어지고, **컬럼은 다 맞는데
FK·트리거만 빠진** 상태가 된다(001 이 실제로 그랬다). 컬럼 존재만으로 "실행됨" 이라고
판정하지 말 것 — 제약과 트리거를 따로 확인해야 한다.

---

## 다음에 할 일

### 검증 못 한 것 (먼저 확인 필요)

**Claude 는 아직 로그인한 어드민 화면을 직접 못 봤다** — 세션이 없어 게이트를 못 넘는다.
사용자가 확인한 것은 로그인·프로필 차단 화면·계정 등록 성공까지다. 아무도 확인하지 않은 것:

- 메뉴권한 차단 실동작 (로직만 유닛테스트 통과)
- Storage 업로드 왕복 (버킷·정책 존재만 확인, 실제 업로드 미시도)
- 어드민 포트폴리오 CRUD 화면 실동작
- **어드민 목록 드래그 앤 드롭 순서 변경** — 끌어 놓기·`reorder_portfolios` 저장·되읽기.
  DB 쪽 함수는 이미 존재하는 것을 확인했지만(anon 으로 호출 시 42501) **본문은 못 봤다** —
  012 를 돌려 이 저장소 기준 본문으로 맞춘 뒤 확인할 것.
- `/projects` 2행 이후 스크롤 reveal (브라우저 패널 IO/rAF 정지 한계로 첫 행만 확인)
- 견적문의 실제 렌더 (`quotes` 데이터 0건)
- **Careers 입사지원 실제 접수 왕복** — 018 미실행이라 아직 넣을 수 없다. 돌린 뒤
  ① 지원 → 어드민 목록에 뜨는지 ② 첨부파일 서명 URL 다운로드 ③ 권한 없는 계정에서
  빈 목록이 되는지 확인할 것
- 상세 iframe 안 폰트 렌더링, 진행 바 rAF 애니메이션, 모바일 홈 리빌 (전부 브라우저 패널
  백그라운드 한계 — 사람이 실제 브라우저에서 봐야 한다)
- **견적문의 첨부 — 어드민 쪽 왕복**. 공개 폼 → Storage → 서명 URL 까지는 023 실행 후
  실측으로 확인했지만(위 절 참고), 어드민 조회 화면에서 사람이 눌러 받는 것과 그때
  `action='file'` 행이 실제로 쌓이는 것은 세션이 없어 못 봤다
- **이력서 첨부 다운로드 파일명** — 코드 수정은 실제 Storage 응답 헤더로 확인했지만,
  어드민 화면에서 실제로 눌러 받아 보는 것은 세션이 없어 못 했다(20번 지뢰 참고)

### 기능 붙이기

| 메뉴           | 테이블           | 상태                                                      |
| -------------- | ---------------- | --------------------------------------------------------- |
| 포트폴리오관리 | `portfolios` ✅  | **연동 완료** — CRUD + Storage 업로드 + `/projects` 공개  |
| 사용자관리     | `admin_users` ✅ | **연동 완료** — 목록·상세·수정·등록·메뉴권한              |
| 견적문의관리   | `quotes` ✅      | **연동 완료** — 목록·필터·상태변경·상세·**첨부파일**(023 실행 필요) |
| 리크루트관리   | `recruits` ✅    | **연동 완료** — Careers 입사지원 접수 + 목록·조회 (018 실행 필요) |

**⚠️ `pageviews` 는 이 저장소와 무관한 고아 테이블이다** — 코드·마이그레이션·git 히스토리
어디에도 안 쓰인다. 삭제할지 방문 추적을 실제로 붙일지 결정 필요.

새 메뉴를 붙이는 순서는 스키마 설계 → 목록 조회 → 등록/수정 저장 → 삭제 → 필수값 얼랏이
자연스럽다. `src/lib/{quotes,portfolios}.ts` 처럼 타입·변환·검증을 한 파일에 모으고 화면은
그걸 쓰는 구조를 따라가면 된다.

### 첨부파일 저장소 — 용량과 대비 (2026-09-02 실측)

첨부(견적문의·이력서)는 **Supabase Storage** 의 비공개 버킷에 들어간다. 무료 플랜 상한과
지금 쓰는 양은 이렇다 — `node scripts/storage.mjs usage` 로 언제든 다시 잴 수 있다.

| 버킷        | 공개 | 파일 | 용량      | 무엇         |
| ----------- | ---- | ---- | --------- | ------------ |
| `portfolio` | ✅   | 89   | 131.63 MB | 썸네일·CI    |
| `brief`     | ✅   | 1    | 17.84 MB  | 회사소개서   |
| `recruit`   | ❌   | 1    | 0.03 MB   | 이력서       |
| `quote`     | ❌   | 0    | 0.00 MB   | 견적문의 첨부 |
| **합계**    |      | 91   | **149.50 MB** | 무료 1GB 의 14.6% |

무료 플랜: **파일 저장소 1GB · 월 전송량 5GB · DB 500MB · 파일 1개당 50MB · 7일 무요청 시
일시정지**. Pro($25/월)는 100GB · 250GB · 8GB 이고 초과분은 저장소 $0.021/GB ·
전송량 $0.09/GB. → 지금 여유는 **약 875MB**. 첨부가 평균 5MB 라면 175건쯤에서 찬다.

⚠️ **대비가 안 돼 있는 것 네 가지** (알고 있어야 할 것):

1. **Storage 파일은 어떤 플랜에서도 DB 백업에 안 들어간다** — 백업에는 메타데이터만
   담긴다(공식 문서 확인). 게다가 **무료 플랜은 자동 백업 자체가 없다.** 즉 이력서·견적
   첨부는 지금 **사본이 한 벌뿐**이고, 지우면 되돌릴 방법이 없다.
   → `node scripts/storage.mjs backup [폴더]` 로 비공개 첨부만 내려받는다(`--all` 이면
   포트폴리오·소개서까지). 산출물은 개인정보라 `.gitignore` 에 넣어 뒀다 — **커밋 금지.**
2. **1GB 를 넘어도 미리 알려 주지 않는다.** 넘으면 업로드가 실패하기 시작한다.
   → 주기적으로 `usage` 를 볼 것. 월 전송량(5GB)은 이 API 로 못 재니 대시보드 > Reports.
3. **익명 업로드라 스팸에 열려 있다** — 견적문의·입사지원 둘 다 로그인 없이 올린다.
   방어선은 버킷의 `file_size_limit`(50MB) 하나뿐이라, **20번만 올리면 1GB 가 찬다.**
   접수가 이상하게 늘면 ① 상한을 10~20MB 로 낮추거나 ② Edge Function 경유로 바꿔
   IP·빈도 제한을 걸 것.
4. **고아 파일이 쌓인다** — "업로드 → insert" 순서라 insert 가 실패하면 파일만 남는다
   (anon 은 delete 권한이 없어 스스로 못 지운다). `usage` 의 파일 수와 DB 의
   `file_path` 가 있는 행 수를 비교하면 드러난다. 정리는 어드민이 대시보드에서 한다.

ℹ️ 첨부를 오래 보관할 이유가 없다면 **보존 기간**을 정하는 것이 가장 확실한 대비다
(예: 접수 1년 뒤 파일만 삭제). 023·018 에 어드민 delete 정책이 이미 있어 화면이나
스크립트로 붙이면 된다.

### 개인정보 보유기간 파기 (2026-09-02, `024_retention_purge.sql`)

개인정보처리방침(`data/legal.ts`)이 **공개적으로 약속해 놓은 보유기간**을 실제로 지키게
만들었다. 예전에는 삭제 버튼조차 없어 방침과 구현이 어긋나 있었다 —
「개인정보 보호법」 제21조(지체 없이 파기)·제30조(방침대로 처리)에 걸리는 상태였다.

| 항목 | 방침 문구 | 구현 |
| --- | --- | --- |
| 견적 문의 | **접수 후 1년** | 어드민 [삭제] + `/api/retention` 자동 |
| 입사 지원 | **제출 후 3년** | 어드민 [삭제] + `/api/retention` 자동 |

⚠️ **숫자는 `lib/retention.ts` 한 곳에 있고 방침 문구를 주석에 그대로 적어 뒀다.**
바꾸려면 `data/legal.ts` 본문도 같이 고칠 것 — 두 곳이 갈리면 그 자체가 제30조 위반이다.

- ⚠️ **지울 대상이 DB 행과 Storage 파일 두 곳이다.** 행만 지우면 파일이 고아로 남고
  (용량도 차지만 무엇보다 **개인정보가 그대로 남는다**), 파일만 지우면 화면에 파일명이
  남아 누르면 400 이 난다. → `purgeTargets` 가 **파일 먼저, 행 나중** 으로 지운다.
  ⚠️ **파일 삭제가 실패하면 행을 지우지 않는다.** 행을 먼저 없애면 그 파일을 되짚을
  경로가 영영 사라져 "지웠다고 생각하는데 파일은 남아 있는" 최악의 상태가 된다.
  실패한 건은 그대로 두고 다음 실행이 다시 시도한다.
  ℹ️ 이미 없는 파일은 실패가 아니다 — 목적이 "그 파일이 없는 상태" 이므로 그대로 진행한다
  (지역 이전 때 파일만 유실된 이력서 2건이 실제로 이 경우다).

- **파기도 기록에 남는다** — 024 가 `quote_access_logs.action` 에 `'purge'` 를 더한다.
  순서는 **기록 → 파일 → 행**. 지우고 나서 기록에 실패하면 "기록 없이 사라진 개인정보" 가
  되어 되짚을 수 없지만, 기록만 남고 삭제가 실패하면 다음 실행이 다시 지우고 한 줄 더
  남길 뿐이다 — 그래서 기록이 먼저다.
  ⚠️ 리크루트에는 기록 테이블이 없어 이 단계가 없다(그래서 삭제 대화상자도 사유를 안 받는다 —
  `ReasonDialog` 에 `withReason={false}` 를 추가했다. 적어도 아무 데도 안 남기 때문이다).
  ⚠️ **cron 의 자동 파기는 세션이 없어 `actor_*` 가 전부 빈 채로 남는다.** 그것이 곧
  "사람이 아니라 시스템" 이라는 표시이고, `reason` 에 `보유기간 경과 자동 파기 — 접수 후 1년`
  처럼 규칙을 적어 구분을 확실히 한다.

- **`/api/retention`** (Vercel cron, `30 3 * * *`). ⚠️ **service_role 로 돈다** — 세션이
  없으므로 anon 으로는 delete 권한이 없다. `?dry=1` 이면 **지우지 않고 대상 건수만** 센다
  (처음 켤 때 반드시 이것부터 볼 것 — 오래된 데이터가 한꺼번에 사라진다).
  한 번에 500건까지만 처리하고 남으면 다음 실행이 이어서 지운다.
  ⚠️ **`CRON_SECRET` 을 반드시 설정할 것.** keepalive 와 달리 이 라우트는 **데이터를
  지운다** — 설정 전에는 주소를 아는 사람이 파기를 실행시킬 수 있다.
  ℹ️ Vercel Hobby 는 cron 이 **하루 한 번**만 되고 시각 정밀도가 ±59분이다(문서 확인).
  둘 다 지금 설정에 맞는다.

- ⚠️ **접속기록(`quote_access_logs`)은 파기하지 않는다.** 「개인정보의 안전성 확보조치
  기준」이 접속기록을 최소 1년 보관하도록 하고, 애초에 원본이 사라진 뒤에도 "누가 언제
  무엇을 했나" 가 남아야 의미가 있다(그래서 020 이 `quote_id` 에 FK 를 안 걸었다).

- ⚠️ **`scripts/storage.mjs backup` 산출물은 파기 대상에서 빠진다.** 로컬 사본도 법적으로
  같은 개인정보다 — 보관 위치와 파기 시점을 사람이 관리해야 한다.

- **확인함 (024 실행 전후 두 번, dev 5599, 2026-09-02)**:
  · 2024·2022년으로 만든 시험 행 + 첨부를 넣고 `?dry=1` → `due:1`/`due:1` 을 세고
    **아무것도 안 지움**
  · **024 실행 전**: 리크루트는 행·파일 둘 다 삭제됐고, 견적문의는 기록이 23514 로
    거부돼 **행·파일이 그대로 남고 `ok:false`** — 의도한 fail-safe 가 실제로 작동했다.
  · **024 실행 후**: 같은 시험 행이 `deleted:1` 로 지워지고 첨부도 사라짐(서명발급 400),
    `quote_access_logs` 에 파기 기록 1행이 남았다 —
    `actor_*` 는 **비어 있고**(= 시스템), `quote_id`·`target_ids` 가 차고
    reason 이 `보유기간 경과 자동 파기 — 접수 후 1년`.
  · 제약 재확인: `view/download/file/purge` 4값 모두 201, 그 밖의 값과 사유 없는
    download 는 **23514**, anon 은 **42501**.
  · 실데이터(quotes 4행 · recruits 3행)는 한 번도 건드려지지 않았다.
  ℹ️ 그때 남은 파기 기록 1행은 **시험 행을 지운 진짜 기록**이라 그대로 뒀다(append-only
    테이블이라 지우지 않는 것이 원칙이다). 대상 quote 는 실재하지 않는 시험 데이터였다.
- **확인함 (025 실행 후, 사용자가 직접 클릭, 2026-09-02)**: 첨부가 달린 시험 문의를 만들어
  어드민 조회 화면에서 [삭제] → **행과 첨부파일이 둘 다 사라졌고**(서명발급 400,
  quote 버킷 0개) `quote_access_logs` 에 파기 기록이 남았다 —
  `actor_email=test@test.com`, `reason='삭제요청'`. 실데이터 4건은 그대로다.
  → 수동 삭제(1번)와 자동 파기(2번)가 **양쪽 다 실동작까지 확인됐다.**
- ℹ️ 앞선 실패 시도 2행(`reason='삭제'`, 02:15)은 **행이 지워지지 않은 시도**의 기록이다.
  append-only 라 그대로 두었다 — 나중에 로그를 볼 때 헷갈리지 않도록 여기 적어 둔다.

⚠️ **`quotes` 에 DELETE 정책이 없어 견적문의 [삭제] 가 조용히 실패했다** (2026-09-02, `025`).
019 가 정의한 것은 insert(anon) · select · update 셋뿐이고, `recruits` 에만 018 이
`recruits_admin_delete` 를 만들어 뒀다 — **그래서 입사지원만 지워지고 견적문의는 안 지워졌다.**
사용자가 실제로 두 번 눌렀고, `quote_access_logs` 에 파기 기록 2행(사유 "삭제")은 남았는데
문의는 그대로였다. 다행히 그 문의에는 첨부가 없어 잃은 파일은 없다.
→ `025` 가 `quotes_admin_delete` 를 추가한다(첨부 쪽 정책은 023 이 이미 만들어 뒀다 —
**행과 파일 둘 다 열려 있어야 파기가 끝까지 간다**).
⚠️ `/api/retention` 은 **service_role 이라 RLS 를 우회해서** 이 구멍이 있어도 정상
동작했다 — 그래서 cron 검증만으로는 안 드러났다. **어드민 화면의 실동작을 따로 확인해야
하는 이유가 이것이다.**

ℹ️ **Careers 입사지원 폼의 개인정보 동의는 2026-09-02 에 붙였다** — 아래
「Careers 입사지원에 동의 절차 추가」 절 참고. 예전의 "동의 문구가 한 줄도 없다" 는
더 이상 유효하지 않다.

### 바로 이어서 할 만한 것

**지역 이전 마무리 (2026-09-01, 우선순위 순)**

- ✅ **`019` 실행 완료** (2026-09-01) — FK 복원(23503 확인) · Storage 정책
  (`recruit` anon 업로드 200, 비공개 읽기 차단) · 분석 정책 반영 확인.
- ✅ **`021` 실행 완료** (2026-09-01) — 레거시 정책 제거 후 남은 정책이 정확히 5개
  (`quotes_public_insert`/`quotes_admin_read`/`quotes_admin_update`/
  `pageviews_admin_read`/`downloads_admin_read`), `internal_ips` 는 0개.
  이제 메뉴권한 게이팅이 **실제로 먹는다.**
  ⚠️ 그래서 **권한이 없는 계정은 에러 없이 빈 화면**을 본다 — "목록이 안 나온다" 는
  문의가 오면 사용자관리에서 권한부터 확인할 것.
  ⚠️ `internal_ips` 는 정책이 0개다 — 나중에 사무실 IP 관리 화면을 만들면
  `has_admin_permission('/admin/analytics')` 정책을 그때 추가해야 한다.
- **Vercel 환경변수 교체 확인** — 로컬 `.env.local` 만 새 프로젝트로 바뀐 것을 확인했다.
  배포본이 아직 옛 프로젝트를 보고 있으면 **어드민 로그인이 안 되고**(옛 프로젝트에만
  계정이 있다) 이미지도 옛 쪽에서 나간다. `NEXT_PUBLIC_SUPABASE_URL` ·
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` 셋 다.
- ✅ **Edge Function `track` 배포 완료** (2026-09-01) — 봇 필터가 있는 배포본을
  정본으로 채택했다. 위 4번 항목 참고.
- **019 실행 뒤 사람이 확인할 것** — ① Contact 문의 접수 왕복 ② Careers 입사지원 +
  어드민 첨부 서명 URL 다운로드 ③ `/admin/analytics` 렌더 ④ `/admin/brief` PDF 교체.
- **옛 프로젝트(`gepphbqhnuufnincxmor`) 정리** — 위가 전부 확인된 뒤에 지울 것.
  지금은 아직 살아 있고, 이미지·PDF 원본이 거기 있다. **먼저 지우면 되돌릴 수 없다.**
  ⚠️ **2026-09-02 확인 — 라이브 도메인이 아직 옛 사이트다.** `insplanet.co.kr` → 308 →
  `www.insplanet.co.kr` 이 여전히 옛 Vue SPA 를 서빙하고, 그 번들 안의 Supabase URL 이
  **옛 프로젝트**다(번들에서 직접 확인). 그 사이트가 옛 프로젝트에서 쓰는 것은 둘 —
  `brochure_history` 테이블과 Storage `assets` 버킷의 `brochure/insplanet_brief.pdf` 다.
  지우면 **라이브 사이트의 회사소개서 링크가 깨진다**(코드가 `getPublicUrl()` 을 쓰는데
  이 함수는 파일 존재를 확인하지 않아 로컬 폴백이 안 걸린다). 도메인을 새 사이트로
  넘긴 뒤에 지울 것.
  ℹ️ 옛 번들에 `contacts`·`pageviews`·`downloads` 는 **0회** 등장한다 — 예전 메모의
  "라이브가 `contacts` 에 쓰고 있다" 는 이 번들 기준으로는 사실이 아니다.
  ⚠️ **이력서 첨부 3건 중 2건이 새 프로젝트에 안 넘어와 있다.** `recruits` 행은 전부
  넘어왔지만 Storage 는 포트폴리오 이미지 89개만 복사했다 — `295398ec…/logo_02.png` 와
  `04a40dce…/…Profile…pdf` 는 서명 URL 발급이 **400** 이다(파일 없음). 그 두 파일은
  **옛 프로젝트에만 있다** — 필요하면 지우기 전에 내려받을 것.
  ⚠️ `internal_ips` 의 사무실 IP 는 새 프로젝트로 넘어와 있다(2건).

**그 밖에**

- **실데이터 입력** — 담당자에게 실제 포트폴리오 목록과 이미지를 받아야 한다.
- **카드 클릭 → 상세 HTML 이동** — 컬럼은 있고 링크는 미연결(사용자가 "추후"로 보류)
- **"계정 프로필이 없습니다" 화면에 자가 생성 버튼** — 라우트의 부트스트랩 경로가 게이트에
  가려 못 쓰이는 문제 해소
- ℹ️ **`quotes` 메뉴권한 RLS 는 019 에서 해결됐다** — 예전 항목("아직 열려 있다")은
  더 이상 유효하지 않다. 이제 `/admin/quotes` 권한이 없으면 **빈 목록**이 온다.
- ℹ️ **`pageviews` 는 더 이상 고아 테이블이 아니다** — 방문자 분석이 실제로 쓴다(019 가
  정책을 정의한다). 예전의 "삭제할지 결정 필요" 항목은 해소됐다.

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
10. **⚠️ dev 서버가 떠 있는 동안 `next build` 를 돌리지 말 것** — 둘 다 같은 `.next` 를
    쓴다. 빌드가(또는 `rm -rf .next` 가) dev 의 작업 디렉터리를 갈아엎으면 dev 서버가
    **에러도 없이 응답만 멈춘다** — 포트는 LISTEN 중이라 살아 있는 것처럼 보이고,
    curl 이 그냥 타임아웃난다. 살리는 방법은 재시작뿐이다(`rm -rf .next && npm run dev`).
    2026-08-25 에 실제로 이걸로 "admin 이 안 된다" 를 만들었다.
    같은 디렉터리에서 dev 서버를 두 개 띄우는 것도 안 된다 — 두 번째가 조용히 죽는다.
    검증용으로 프로덕션 빌드를 띄워야 하면 **dev 를 먼저 끄고** `next build && next start
    -p <포트>` 를 쓰거나, `distDir` 를 갈라 놓을 것.
11. **`.next-buildcheck/` 가 git 에 커밋돼 있었다** — `tsconfig.json` 의 `include` 가
    `.next-buildcheck/types/**/*.ts` 를 잡고 있어서, 라우트를 지우면 **낡은 validator.ts**
    가 `TS2307: Cannot find module '.../page.js'` 를 낸다. **`next build` 는 멀쩡히
    통과하는데 `npm run typecheck` 만 실패**해서 원인을 엉뚱한 데서 찾기 쉽다.
    2026-08-25 에 `.gitignore` 에 넣고 `git rm -r --cached` 로 추적을 끊었다.
    같은 에러가 다시 보이면 그 폴더가 다시 생겼는지부터 볼 것 — 지우면 된다.
12. **불투명 출처(sandbox) iframe 에서는 폰트만 CORS 를 탄다** — 이미지·CSS·JS 는 멀쩡한데
    `@font-face` 만 조용히 폴백된다. 정적 에셋에 `Access-Control-Allow-Origin` 이 필요하다.
13. **⚠️ 다른 컴퓨터에서 LAN IP 로 dev 서버에 접속하면 화면만 뜨고 전부 죽는다** —
    `next dev` 는 이미 0.0.0.0 에 바인딩하므로 `http://<맥의 LAN IP>:5599` 로 HTML 은
    200 으로 잘 내려온다. 그런데 Next 16 은 localhost 가 아닌 host 로 들어온 `/_next/*`
    요청 중 **Origin 헤더가 붙는 것**(= HMR 웹소켓 업그레이드)을 403 으로 막는다
    (`server/lib/router-utils/block-cross-site-dev.ts`). 스크립트·CSS 는 GET 이라 Origin 이
    없어 전부 200 이고, **콘솔에 남는 건 `WebSocket connection ... failed` 한 줄뿐**인데
    Turbopack dev 런타임이 그 연결 위에서 앱 엔트리를 돌리기 때문에 하이드레이션이 끝나지
    않는다 → `LegacyRuntime` 의 useEffect 가 안 돌아 `/js/main.js` 가 아예 안 붙고,
    클릭·전체메뉴·스크롤 리빌이 전부 죽은 정적 화면이 된다.
    → `next.config.ts` 의 `allowedDevOrigins` 에 사설 IP 대역을 넣어 해결했다(dev 전용,
    배포 무관). **와일드카드는 점 단위 세그먼트 매칭이라 `192.168.**` 는 무효** —
    `192.168.*.*` 로 써야 한다. 다른 대역(예: 172.20.x.x)을 쓰는 망에 가면 거기도 추가할 것.
    증상 재현·수정 확인 완료(2026-08-25): 수정 전 `window.__insplanetRuntime === undefined`,
    수정 후 `[HMR] connected` + 전체메뉴 열림까지 LAN IP 로 확인.
14. **⚠️ 어드민에서 마케팅 페이지로 `next/link` 로 들어가면 화면이 죽는다** (2026-08-25 수정) —
    마케팅 런타임(`public/js/main.js`)은 **문서 로드당 한 번** 바인딩하는 구조고,
    `LegacyRuntime` 이 `window.__insplanetRuntime` 으로 재부팅을 막는다. 마케팅 페이지끼리는
    main.js 가 같은 출처 `<a>` 클릭을 전부 가로채 `location.href` 로 하드 내비게이션을 하므로
    문제가 없지만, main.js 가 없는 `/admin/*` 에서 `<Link href="/">` 로 들어오면:
    **1회차**는 effect 가 main.js 를 주입해 대체로 동작하고, **2회차부터**(뒤로가기로 어드민에
    갔다가 다시 누름) 같은 문서라 플래그가 true 로 남아 **main.js 를 다시 안 넣는다.**
    1회차 main.js 는 React 가 이미 버린 옛 DOM 에 붙어 있어서 히어로 `.in` 리빌·스크롤 스크럽·
    블롭·페이지 전환이 전부 죽는다 → **주소는 `/` 인데 헤더와 점 몇 개만 남은 화면.**
    "종종 그런다" 로 보이는 이유가 이 1회차/2회차 차이다.
    → 가드를 없애 재주입하면 전역 click/scroll 핸들러가 두 벌 붙어 더 나빠진다.
    **해결은 경계에서 문서를 새로 로드하는 것** — 어드민→사이트 링크는 맨 `<a href>` 나
    `<Button href reload>` 를 쓴다(`Button` 에 `reload` prop 을 추가했다: next/link 대신 맨 `<a>`).
    ⚠️ **어드민에 사이트로 가는 링크를 새로 만들 때 `next/link` 를 쓰지 말 것.**
    같은 이유로 어드민 헤더 로고는 `/` 가 아니라 **`/admin`** 으로 간다(사용자 요청).
    재현·수정 확인 완료: 수정 전 2회차에서 `main.js` 태그 1개 재사용 + `head-title` 에 `.in`
    없음(빈 화면), 수정 후 매번 새 문서 + `.in` 적용.
15. **⚠️ Our Projects 에서 헤더가 흰색으로 안 바뀌던 건 canvas 오염(taint)이었다** (2026-08-25 수정) —
    `main.js` 의 `sampleImg` 가 `.proj-img` 를 canvas 에 그려 우상단·우하단 밝기를 재고,
    그 결과로 `#lets-talk` `#full-menu` `#scroll-hint` `.proj-indicator` 에 `.on-dark` 를 건다.
    썸네일이 로컬 `/images/...` 에서 **Supabase Storage(다른 출처)** 로 바뀌면서 canvas 가
    오염돼 `getImageData` 가 `SecurityError` 를 던졌고, `catch(e){}` 가 그걸 삼켜
    **밝기가 전부 `false`** 로 남았다 — 콘솔 에러도, 빌드 실패도 없다.
    → `Projects.tsx` 의 `<img className="proj-img">` 에 **`crossOrigin="anonymous"`** 를 붙였다.
    Storage 는 `Access-Control-Allow-Origin: *` 를 준다(`render/image` 엔드포인트로 실측 확인).
    `sampleImg` 의 빈 catch 도 `console.warn` 으로 바꿨다 — **정적 사이트에서 `main.js` 를 다시
    가져오면 사라지는 수정 목록에 이것도 포함된다.**
    ⚠️ **다른 출처 이미지를 canvas 로 읽는 연출을 새로 만들면 `crossOrigin` 을 같이 챙길 것.**
    확인함(2026-08-25, dev 5599): 수정 전 `SecurityError`, 수정 후 3장 밝기 실측
    (top 88.5 / 157.1 / 5.4) → 어두운 3번째에서 잠기면 `lets-talk`·`full-menu`·`proj-indicator`·
    `scroll-hint` 에 `.on-dark`, 인트로에서는 해제되는 것까지 봤다.
    ℹ️ **로고(`#ci-logo`)는 원래 여기서 안 바뀐다** — 이미지가 오른쪽 절반만 덮고 로고는 밝은
    왼쪽 컬럼 위에 있어서, 로고는 통짜로 어두운 섹션(CTA)에서만 뒤집힌다(의도된 동작).
16. **⚠️ `.on-dark` 는 전역 플래그다 — 안 보이는 트리가 매 스크롤마다 남의 것을 지웠다**
    (2026-08-25 수정) — 반응형 전환(34번) 이후 PC 트리와 모바일 트리가 **항상 함께 마운트**되고
    폭으로만 갈린다. 그런데 스크롤 핸들러는 CSS 로 숨겨져도 계속 돈다. 숨은 쪽은 rect 가 0 이라
    "안 덮고 있다" 로 계산해 `classList.toggle('on-dark', false)` 를 쓰고, 그게 보이는 쪽이
    방금 켠 흰색 헤더를 지운다. **먼저 쓴 쪽이 지고, 순서는 리스너 등록 순서라 페이지마다 다르다.**
    실제 증상:
    - 홈 모바일 Insight("비즈니스의 본질을 읽고…")가 화면을 다 덮어도 헤더가 검정 그대로
      → `public/js/main.js` 의 `renderAf`(데스크톱 Our Projects 챕터)가 지우고 있었다.
    - `/about` 모바일 히어로·마무리 이미지도 같은 증상 → `public/js/about-hero.js` 의 두 IIFE.
    → **규칙: 자기 마크업이 실제로 그려져 있을 때만 전역 헤더 플래그를 쓴다.**
      `if(!<자기 섹션>.getClientRects().length) return;` 를 render 맨 앞에 둔다.
      (`getComputedStyle(el).display` 는 **안 된다** — 조상이 `display:none` 이어도 자기 값은
      `block` 으로 나온다. 실제로 `.about-hero` 가 그랬다.)
      네 곳에 넣었다: `main.js renderAf` · `about-hero.js` 히어로 render + 마무리 `setChrome`/render ·
      `MobileInsight` · `MobileAbout`(히어로·마무리). **`main.js`/`about-hero.js` 수정분은
      정적 사이트에서 다시 가져오면 사라진다 — 재적용 목록에 포함.**
    ⚠️ 새 모바일/PC 챕터가 `on-dark`(또는 다른 전역 플래그)를 쓰면 **양쪽 다** 이 가드를 넣을 것.
    한쪽만 넣으면 반대 방향에서 똑같이 깨진다.
    확인함(2026-08-25, dev 5599): 375 에서 홈 Insight·`/about` 히어로·마무리 이미지 전부
    덮는 구간에만 흰색, 벗어나면 복귀. 1280 에서 Our Projects·about 히어로·마무리 이미지도
    그대로 동작(회귀 없음), 콘솔 에러 없음.
    **같은 뿌리의 두 번째 증상 — 모바일 Say Hello 헤더가 검정** (2026-08-25 수정):
    PC 는 `renderAf` 가 `.contact-cta` 를 보고 헤더를 뒤집는데 ≤1023 에서는 그게
    `display:none` 이라 판정 자체가 성립하지 않았고, **모바일 `.m-cta` 쪽에는 그 코드가
    아예 없었다**(원래부터 없던 구멍이지, 위 가드 때문에 생긴 회귀가 아니다).
    → `MobileCta` 에 헤더 플립을 붙였다(밴드 수치는 `MobileInsight` 와 동일).
    ⚠️ 이때 **모바일 챕터끼리도 같은 충돌이 난다** — 멀리 지나온 `MobileInsight` 가 계속
    `false` 를 덮어 Say Hello 가 켠 것을 지웠다. 그래서 두 컴포넌트 모두 **자기 섹션이
    ±1뷰포트 안에 있을 때만** 쓴다(`MobileAbout` 이 이미 쓰던 방식). 1뷰포트 여유는 빠르게
    튕겨 스크롤할 때 "지우는 프레임" 을 건너뛰어 **흰 푸터 위에 흰 글자**가 남는 것을 막는다.
    375 전 구간 실측(2026-08-25): 흰색 구간은 3000~6000(Insight)·11400~11700(Say Hello)
    뿐이고 흰 푸터(12028~)에서는 정상 복귀. 1280 도 그대로 동작.
    ⚠️ **모바일에 새 어두운 챕터를 추가하면 헤더 플립을 직접 붙여야 한다** — PC 쪽 런타임이
    대신 해 주지 않는다.
    ℹ️ **덤으로 찾은 것(안 고침)**: 모바일에서 `#scroll-hint` 가 **항상 `is-hidden`** 이다.
    `main.js` 의 "푸터 보이면 SCROLL 숨김" IIFE 가 데스크톱 `.footer` 를 보는데 모바일에서는
    그게 `display:none` 이라 `rect.top=0` → 항상 숨김 판정. `.m-footer` 를 같이 봐야 한다.
17. **⚠️ iOS Safari 는 opacity 트랜지션이 도는 요소의 `visibility:hidden` 을 페인트에
    반영하지 않는다 — 실기기에서만 난다** (2026-08-26 수정) —
    모바일 홈 Our Projects 의 아래 정보(`.m-proj-slide` 3장)는 같은 그리드 칸에 쌓아 두고
    `.is-active` 만 보이게 하는 크로스페이드였다. 사용자 iPhone 15 Pro(iOS 18.7 / Safari 26.6)
    에서 **방금 떠난 슬라이드가 새 슬라이드 제목·Client 위에 그대로 겹쳐** 보였다.
    폰 화면에 계산값을 직접 찍어서 잡았다:

        #0 op=0          vis=hidden
        #1 op=0.459116   vis=hidden   ← 그런데 화면에 그려지고 있다
        #2 ACTIVE op=1 에 가까움 vis=visible

    `visibility:hidden` 이 **제대로 계산돼 있는데도 페인트에서 안 빠진다.** opacity 트랜지션이
    도는 동안 WebKit 이 그 요소를 가속 레이어로 올려 두고 visibility 를 무시하는 것으로 보인다.
    → **`.m-proj-slide` 에서 transition 을 아예 없앴다**(`opacity`+`visibility` 로 즉시 전환).
    애니메이션이 없으면 그 경로를 안 탄다 — 같은 React 렌더에서 함께 바뀌지만 트랜지션이 없는
    `.m-proj-dots` 는 폰에서도 내내 정상이었고, 그게 원인을 가른 결정적 단서였다.
    **확인함**: 사용자 실기기에서 정상 동작(2026-08-26). 크로스페이드는 사라지고 즉시 전환된다.
    ⚠️ **1차 시도(`visibility:hidden` 만 추가)는 실패했다** — 위 이유로 폰에서 안 먹는다.
    같은 패턴(한 칸에 겹쳐 두고 opacity 로 가르기)을 새로 만들 때는 **트랜지션을 걸지 말 것.**
    ⚠️ **데스크톱에서 멀쩡한 것을 근거로 삼지 말 것.** 데스크톱 Chrome·Safari 는 물론
    **iOS 시뮬레이터(iPhone 16 Pro / iOS 18.3)에서도 재현되지 않는다** — 진짜 터치 모멘텀
    스크롤이 아니기 때문이다. 시뮬레이터는 `xcrun simctl boot` 후 `open_url` 로 dev 서버
    (`http://<맥 LAN IP>:5599`)에 붙일 수 있어 레이아웃 확인에는 쓸모가 있지만, **이런 종류의
    합성/페인트 버그는 실기기가 아니면 못 잡는다.**
    ℹ️ **폰에서 원인을 잡은 방법** — 세션마다 다시 쓰게 될 것이다. `?debug=1` 일 때만 뜨는
    고정 패널을 임시로 붙여 뷰포트 폭·미디어쿼리 매치·`document.styleSheets` 에서 찾은 실제
    규칙 텍스트·각 요소의 computed opacity/visibility 를 화면에 찍었다. USB 원격 디버깅
    (아이폰: 폰 설정→Safari→고급→웹 속성 + 맥 Safari 개발 메뉴 / 안드로이드:
    `chrome://inspect`)보다 준비가 없고, 사용자가 스크린샷 한 장만 보내면 끝난다.
    ⚠️ **그때 dev 서버로 검증할 때 함정 하나** — 폰 탭이 Fast Refresh 로 살아 있으면
    **JS 만 새것이고 CSS 는 옛것인 상태**가 된다(새로고침을 눌러도 유지됐다). 규칙 텍스트를
    찍어 두지 않았으면 "고쳤는데 안 된다" 로 한참 헤맬 뻔했다. 폰 검증은 **탭을 닫고 새 탭
    (또는 시크릿 탭)** 에서 열 것. 배포본은 빌드마다 파일명이 바뀌므로 이 문제가 없다.
18. **⚠️ 리빌 대상(`.in`)의 className 을 React state 로 만들면 그 `.in` 이 지워진다**
    (2026-09-01 수정) — `revealOnScroll`(`lib/dom.ts`)은 `.in` 을 **classList 로 직접** 붙이고
    바로 `unobserve` 한다. 같은 요소의 className 을 JSX 에서 조건부로 넘기면, 그 조건이 처음
    바뀌는 순간 React 가 className 을 통째로 다시 써서 `.in` 을 날린다 — IO 는 이미 떠났으므로
    **영영 안 돌아온다.** 빌드·타입체크·콘솔 전부 조용하다.
    실제 증상: `/contact` 에서 **필수값을 다 채우는 순간 문의하기 버튼이 사라졌다**
    (`ready` → `className={ready ? 'ct-submit is-ready' : 'ct-submit'}` → `.in` 소멸 →
    `opacity:0; pointer-events:none`). PC `ContactForm` · 모바일 `MobileContactForm` 둘 다.
    → **className 은 상수 문자열로 두고 상태 클래스는 ref + `classList.toggle` 로 붙인다.**
    React 는 값이 안 바뀐 className 속성을 마운트 후 건드리지 않으므로 두 클래스가 공존한다.
    ℹ️ `ProjectsExplorer` 의 필터 바는 반대로 풀었다(리빌을 `barIn` state 로 올림) — 거기는
    칩·토글이 클릭마다 리렌더되므로 그쪽이 맞다. **둘 중 하나로 반드시 통일할 것.**
    ⚠️ 리빌 대상에 새 상태 클래스를 붙일 때마다 이 선택을 하고 지나가야 한다.
    확인함(dev 5599): 수정 전 재현(`className` 을 손으로 덮으면 `opacity:0`/`pointer-events:none`),
    수정 후 `ct-submit in is-ready` 공존 + `opacity:1` + 활성 배경(#3e3f44). 375 모바일도 동일.

19. **⚠️ `storageRender` 에 `width` 만 주면 Supabase 가 이미지를 잘라서 준다** (2026-09-01 수정) —
    비율을 지켜 주지 않는다. **원본 높이를 그대로 두고** 기본 `resize=cover` 로 **좌우를 잘라 낸다.**
    실측: 636x240 로고에 `?width=240` → **240x240**(가운데 정사각형만 남아 심볼과 뒷글자가
    통째로 사라짐), 5120x2880 썸네일에 `?width=1200` → 1200x2880 세로 띠.
    응답은 200 이고 화면도 멀쩡히 뜨므로 **"로고가 잘 안 보인다" 로만 드러난다.**
    → **height 를 반드시 같이 준다.** 로고처럼 잘리면 안 되는 것은 `resize:'contain'`
    (`LOGO_RENDER` 상수, `lib/images.ts` — PC 표·모바일 카드가 같이 쓴다).
    같이 고친 곳: `/projects` 진행중 표(`.pj-logo`)·모바일 카드(`.mp-ocard-logo`)·
    상세 JSON-LD 의 `image`(`width` 만 주고 있었다).
    ⚠️ **로고 상자의 `object-fit` 도 `cover` 가 아니라 `contain` 이어야 한다** — 사진은 잘려도
    되지만 로고는 글자가 없어져 못 읽는다. `.pj-logo` 는 `padding:12px` 까지 겹쳐 안쪽 비율이
    상자와 달라졌던 탓에(170/64 = 2.66 vs 146/40 = 3.65) 위아래가 4분의 1쯤 더 잘렸다 —
    패딩을 빼니 상자 비율이 실제 CI(636/240 = 2.65)와 같아져 **3배수 에셋이 그대로 들어맞는다.**
    확인함(dev 5599, 1440): 렌더 이미지 636x240, 상자 190x71 에 `object-fit:contain`, 패딩 0.

20. **⚠️ `object-position: left` 은 여백이 이미지 **안에** 박혀 있으면 아무 일도 하지 않는다**
    (2026-09-02 수정) — `/projects` 진행중을 모바일에서 보면 고객사 CI 가 카드마다 제각각
    들여쓰기된 것처럼 보였다. 원인은 CSS 가 아니라 **파일**이다: 올라온 CI 는 전부 636x240
    캔버스에 마크를 가운데 두고 좌우를 투명하게 비운 것이라 **왼쪽 여백이 파일마다
    42~168px(폭의 6.6%~26.4%)로 다르다.** 게다가 `object-fit:contain` 이 폭에 딱 맞게
    담으면(캔버스 2.65 > 상자 98/48 = 2.04) **좌우로 남는 여유가 0 이라 `object-position`
    자체가 쓰이지 않는다** — `left center` 를 이미 줘 놨는데도 안 붙던 이유다.
    → `lib/logoTrim.ts` 가 캔버스로 알파 여백을 재서 `object-position` 을 음수 px 로 민다
    (모바일 `.mp-ocard-logo` 에만 적용). 확대·축소가 없어 로고 크기감은 그대로다.
    ⚠️ **"그냥 여백 없는 이미지를 올리면 되지 않나" 는 이미 검토했고 더 나쁘다**(2026-09-02
    사용자와 확인). 그 여백은 실수가 아니라 **크기 조절 장치**다 — 모든 CI 가 같은 636x240
    캔버스라 전부 같은 배율로 축소된다(PC 0.267 · 모바일 0.154). 바짝 잘라 올리면 파일마다
    제 비율로 상자를 채워 배율이 흩어진다: 모바일 잉크 높이가 SR 1.16배 · KB 1.18배 ·
    GS/LG 1.57배 · **redcap 2.13배**(14.5 → 30.7px). **PC 표에서도 똑같이 일어나므로**
    (redcap 25.1 → 53.3px) "모바일만 고치는" 방법이 아예 못 된다.
    캔버스는 두고 **마크만 왼쪽에 붙여** 올리면 배율은 지켜지고 모바일도 JS 없이 붙지만,
    PC 상자 비율(170/64 = 2.66)이 캔버스와 같아 **그 여백이 곧 PC 의 가운데 정렬**이라
    PC 로고가 전부 왼쪽으로 쏠린다. PC 도 왼쪽 정렬로 가기로 결정되면 그때는 자산을 다시
    만들고 `logoTrim.ts` 를 통째로 지우는 쪽이 더 깔끔하다.
    ⚠️ 계산이 `object-fit: contain` 전제라, 그 CSS 를 바꾸면 값이 틀린다 — 그래서 contain 이
    아니면 아예 손대지 않는 가드가 `apply()` 에 있다.
    ⚠️ **화면에 있는 `<img>` 를 캔버스로 읽는 것은 조용히 실패할 수 있다 — 그것도 딱 한두 장만.**
    처음엔 그 방식만 썼다가 실제로 두 번 데었다(1차: 개발 브라우저에서 2장, 2차: 사용자 실기기에서
    GS건설 1장만 가운데). 원인이 둘이다 —
    ① **`decoding="async"` 인 이미지를 load 직후 `drawImage` 하면 빈 캔버스가 그려질 수 있다.**
       그러면 스캔이 아무것도 못 찾는데, 그걸 "여백 0" 으로 **성공 처리해 캐시**하면 그 한 장만
       영영 안 고쳐진다. **"못 찾음" 은 반드시 실패로 다룰 것** — 전부 투명한 CI 는 없다.
    ② 브라우저 캐시에 **CORS 가 아닌 응답**이 남아 있으면 `crossOrigin="anonymous"` 를 붙여도
       캔버스가 오염된다. 어느 파일이 캐시에 남아 있는지에 따라 기기마다 다른 장이 실패한다.
    → 그래서 지금은 2단이다: 빠른 길(`<img>` 캔버스, 비용 0)이 실패하면 **바이트를 직접 받아
      blob 으로 다시 디코딩해서** 잰다. blob 은 같은 출처라 오염될 수 없고 디코딩을 우리가
      기다리므로 빈 캔버스도 안 나온다. 오염된 상태를 재현해 8장 전부 복구되는 것을 확인했다.
    ⚠️ **`HTMLImageElement.decode()` 를 쓰지 말 것 — 숨겨진 문서에서는 영영 resolve 되지 않는다**
    (실측: 같은 탭에서 `createImageBitmap`·`onload` 는 되는데 `decode()` 만 무한 대기).
    중복 요청을 막는 inflight 플래그가 같이 잠겨 재시도까지 죽는다.
    ⚠️ **측정 실패를 캐시하지 말 것.** 실패는 3회까지 다시 잰다(성공만 주소 단위로 캐시).
    ⚠️ 측정은 상자가 실제로 그려진 뒤여야 한다 — 이 패널은 ≥1024 에서 `display:none`, 완료
    탭에서는 `hidden` 이라 `clientWidth` 가 0 인 때가 있다. 그래서 마운트 한 번으로 끝내지
    않고 패널이 열릴 때·폭이 바뀔 때·이미지 `load` 때 다시 부른다.
    확인함(dev 5599, 375): CI 8장 전부 잉크 왼쪽 끝이 상자 왼쪽에 **오차 0px** 로 붙음
    (적용된 offset -6.47 ~ -25.89px, blob 으로 다시 재서 검산). `<img>` 캔버스를 완전히
    막아 놓아도(SecurityError) 느린 길이 8장 전부 같은 값으로 복구한다. 1440 에서 PC
    `.pj-logo img` 는 `50% 50%` 그대로이고 모바일 트리는 `display:none` 이라 건드리지 않는다.
    콘솔 에러 0.

20. **⚠️ 첨부파일을 원래 이름으로 받으려면 서명 URL 의 `download` 를 손으로 붙여야 한다**
    (2026-09-02 수정) — 이력서를 내려받으면 **200자가 넘는 알아볼 수 없는 이름**이 나왔다.
    원인이 둘 겹쳐 있었다.
    ① **supabase-js 가 값을 두 번 인코딩한다.** `createSignedUrl(path, ttl, { download: name })`
       이 내부에서 `URLSearchParams` 로 `download=%EA%B0%9C…` 를 만든 다음 **URL 전체에
       `encodeURI()` 를 한 번 더** 건다(storage-js 2.111.0). `%` 가 `%25` 가 되므로 서버는
       한 번만 풀어서 `Content-Disposition: filename=%EA%B0%9C%EC%9D%B8…` 를 내려주고,
       브라우저는 그 퍼센트 문자열 **자체**를 파일명으로 저장한다.
       ⚠️ **ASCII 파일명에는 `%` 가 없어 멀쩡하다** — 영문 파일로 시험하면 절대 못 잡는다.
       → 옵션 없이 서명만 받고 `&download=encodeURIComponent(name)` 를 **한 번만** 붙인다
       (`lib/attachments.ts` 의 `signedDownloadUrl` — 이력서·견적문의가 같이 쓴다).
    ② **macOS 가 고른 한글 파일명은 NFD(자모 분리)로 온다.** `개` 가 `ᄀ`+`ᅢ` 로 저장돼
       macOS 에서는 합쳐 보이지만 **윈도우에서는 자모가 그대로 그려진다.** → 저장할 때와
       내려줄 때 둘 다 `normalize('NFC')` 한다(이미 NFD 로 저장된 옛 행도 다운로드
       시점에 고쳐진다).
    확인함: 고치기 전 `filename=%25E1%2584%2580…`(밑줄 28개 키 + 200자 이름),
    고친 뒤 `개인기술이력카드(이순이).xlsx` 로 내려온다(실제 Storage 응답 헤더로 확인).
    ⚠️ **Storage 키에서 확장자를 잃지 말 것** — 대시보드에서 파일을 직접 열어 볼 때
    그것만이 단서다. 그런데 **한글만으로 된 이름은 눕히면 몸통이 통째로 사라진다** —
    다듬기까지 하면 `.pdf` 처럼 **점으로 시작하는 키**가 나온다(실제로 한 번 그렇게
    올라갔다). `safeStorageName` 은 확장자와 몸통을 갈라 처리하고 몸통이 비면 `file` 로
    채운다 → `file.pdf`. 파일은 `<uuid>/` 폴더 하나에 하나뿐이라 이름이 겹칠 일이 없다.

21. **⚠️ RLS 로 막힌 DELETE 는 에러를 내지 않는다 — 0행이 지워지고 204 가 온다**
    (2026-09-02) — 그래서 `const { error } = await db.from(t).delete()...` 로 판정하면
    **화면은 "지웠다" 며 목록으로 돌아가는데 그 행이 그대로 남는다.** 콘솔도 조용하다.
    실측: anon 으로 `DELETE /rest/v1/quotes?id=eq.<id>` → `204 No Content`, 본문 `[]`,
    `error` 는 `null`. `Prefer: count=exact` 를 붙여야 `content-range: */0` 로 드러난다.
    → **삭제는 `delete({ count: 'exact' })` 로 실제 삭제 건수를 받아 확인한다**
    (`lib/retention.ts`). 요청한 건수보다 적으면 권한 문제로 보고 안내한다.
    ⚠️ INSERT/UPDATE 는 반대다 — RLS 에 걸리면 **42501 로 시끄럽게 실패**한다.
    조용한 쪽은 DELETE(와 조건이 안 맞는 UPDATE)뿐이라 더 잘 속는다.
    ⚠️ **service_role 은 RLS 를 우회하므로 cron·서버 라우트로는 이 구멍을 못 잡는다.**
    삭제 기능은 반드시 **로그인한 어드민 세션으로** 확인할 것.

22. **⚠️ 안드로이드 크롬은 주소창이 접혀도 레이아웃 뷰포트를 다시 재지 않는다 — 화면 밖으로
    치워 둔 `position:fixed` 레이어가 그만큼 아래에서 올라온다** (2026-09-03 수정) —
    사용자 안드로이드 폰에서 **`/` 와 `/projects` 를 스크롤해 내리면 X 버튼이 화면 맨 밑에**
    떴다. 그 X 는 상세 시트(`.ps-close`)다. 시트는 닫혀 있을 때 `position:fixed; inset:0` +
    `transform:translateY(100%)` 로 "자기 높이만큼" 아래로 치워 두는데, 크롬 안드로이드는
    스크롤로 주소창이 접힐 때 **보이는 영역만 Δ(≈56~115px) 커지고 레이아웃 뷰포트는 그대로**
    둔다. 그래서 시트 높이도 이동량도 옛(작은) 뷰포트에 묶여, 시트 윗머리가 딱 Δ 만큼 화면
    안으로 들어온다. 그 띠에 있는 것이 `.ps-close`(top:16px)라 **흰 배경은 흰 페이지에 묻히고
    어두운 X 만 보인다** — 그래서 "팝업도 없는데 X 만 뜬다" 로 보인다.
    → 두 겹으로 고쳤다. ① 안 쓰는 동안 `visibility` 로 끈다(`.ps-sheet.is-shown`)
    ② **X 자체를 미리 깔아 두지 않는다** — 아래 항목.
    ⚠️ **`visibility` 를 CSS 트랜지션(`visibility 0s linear 1.2s`)으로 늦추지 말 것** —
    처음엔 `#menu-overlay` 와 같은 그 방식으로 넣었는데, 트랜지션은 프레임이 돌아야 끝나므로
    **프레임이 멈춘 탭에서 닫으면 `visible` 인 채로 굳는다**(브라우저 패널에서 실측:
    닫고 2초 뒤에도 `visible`). 조용히 되살아나는 버그를 조용히 되살아나는 방법으로 막는 꼴이라,
    시트가 이미 갖고 있던 `SLIDE_MS` 타이머에 `setShown(false)` 를 얹어 확정적으로 끈다.
    ⚠️ **화면 밖으로 "치워 두는" 레이어를 새로 만들 때마다 이 함정이 있다** — 페이지 배경과
    같은 색이면 레이어 자체는 안 보이고 그 안의 진한 요소만 유령처럼 뜬다.
    확인함(dev 5599, 375×812): 닫힌 시트의 `.ps-close` 가 `y=828`(뷰포트 812 바로 아래)이라
    Δ 가 16px 만 넘으면 드러나는 것을 실측, 시트를 100px 낮춰 그 상황을 재현하면 수정 전에는
    X 가 실제로 그려지고(스크린샷) 수정 후에는 같은 자리(`y=728`)가 `visibility:hidden` 이라
    안 그려짐. 열기/닫기 왕복 4상태 전부 정상(`ps-sheet` → `is-shown is-open` → `is-shown` →
    `ps-sheet`), 콘솔 에러 0, 타입체크 통과.
    **확인 못 함**: 사용자 실기기에서의 재확인 — 브라우저 패널은 주소창이 없어 Δ 를 만들 수 없다.

23. **⚠️ 시트의 X(`.ps-close`)는 폴백이 아니라 "비상구" 다 — 필요할 때만 그린다**
    (2026-09-03) — 닫기 버튼이 둘인 구조다: 상세 문서가 자기가 그리는 `.pd-close`(**셰브론**,
    `_shared/works.js` 가 조건 없이 그린다)와 시트 껍데기의 `.ps-close`(**X**).
    **동시에 보이지는 않는다** — `bridge.js` 가 `pdReady{ownClose}` 로 알려 주면 X 를 감췄다.
    문제는 **기본값이 "아직 못 들었으니 일단 X 를 깔아 둔다"** 였다는 것이다. 그래서 아무
    상세도 안 연 상태의 시트에도 X 가 화면 밖에 대기했고, 22번 증상으로 새어 나왔다.
    → 기본값을 뒤집었다. 평소에는 **DOM 에 아예 없고**, 상세가 "내 닫기 없다" 고 답했거나
    (`ownClose:false`) 대답이 끝내 없을 때만 그린다.
    ⚠️ "대답 없음" 은 두 갈래이고 **둘 다 필요하다**: ① 8초 보호 타이머까지 `load` 가 안 옴
    (문서가 아예 안 뜸 — 경로 오타·404·네트워크) ② 문서는 떴는데 `ANSWER_MS`(1s) 안에
    `pdReady` 가 안 옴(`bridge.js`/`works.js` 가 안 돎, `<project-detail>` 을 안 쓰는 새 문서).
    ⚠️ **보호 타이머가 이미 대답한 상세를 덮으면 안 된다** — 문서는 떴는데 이미지 하나가
    안 끝나 `load` 만 늦는 경우가 있고, 그때 X 를 내걸면 셰브론과 둘이 된다(구현 중 실제로
    재현했다 — `answered.current !== detail` 가드로 막았다).
    ⚠️ **캐시 재오픈 때는 판정을 다시 하지 않는다** — 닫아도 iframe 을 버리지 않으므로
    같은 상세를 다시 열면 `pdReady` 가 새로 오지 않는다. 어느 상세가 답했는지(`answered` ref)를
    기억해 "무응답" 으로 오판하지 않게 한다.
    ℹ️ 현재 `public/portfolio/` 의 상세 **38개 전부**가 `<project-detail>` 을 쓰므로 정상
    동작에서 이 X 는 한 번도 안 나온다. `/projects/<id>` 단독 페이지(`DetailFrame`)에는 애초에
    폴백이 없어 셰브론 하나로만 돈다 — 이제 시트도 같은 모양이다.
    **확인함**(dev 5599): ① 페이지 로드 직후 `.ps-close` 가 DOM 에 **없음**(`/` `/projects` 둘 다)
    ② `pdReady{ownClose:true}` 를 받으면 보호 타이머가 지나도 안 생김 ③ 끝내 무응답이면 생기고
    보임 ④ `ownClose:false` 대답이면 생김. 타입체크 통과.

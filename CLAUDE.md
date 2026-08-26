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
  - ⚠️ **교차 출처에서는 `<a download>` 가 무시된다** — URL 의 `?download=` 파라미터가
    `Content-Disposition: attachment` 를 만든다. **빼면 다운로드가 아니라 PDF 가 열린다.**
  - ⚠️ 원본 194.6MB(5120x2880 무손실 PNG 168장)를 Ghostscript 로 **13.9MB** 로 줄였다
    (150dpi + JPEG QFactor 1.3). GitHub 은 100MB 넘는 파일을 거부하므로 압축이 필수였다.
    `/screen`(72dpi)은 같은 14MB인데 목업 안 작은 글씨가 뭉갠다 — 해상도를 낮추지 말고
    **JPEG 압축을 높이는 쪽**이 옳다.
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
  - **남은 것**: 프로젝트 상세가 sandbox iframe 안이라 크롤러가 거의 못 읽는다.
    `/projects/<id>` 에 서버 렌더 텍스트를 두는 작업이 필요하다.

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
| `009_portfolio_seed_thumbs.sql`          | ❌ **미실행** (썸네일이 이미 Storage URL 이라 사실상 불필요) |
| `010_portfolio_main.sql`                 | ✅ 사용자 실행 확인                          |
| `011_portfolio_main_meta.sql`            | ✅ **2026-08-25 확인** — `launch` 컬럼이 실제로 있다 |
| `012_portfolio_sort_order.sql`           | ✅ 사용자 실행 확인 (2026-08-25)             |
| `013_drop_admin_main_permission.sql`     | ❌ **미실행**                                |
| `014_portfolio_html_folder.sql`          | ✅ 사용자 실행 확인 (2026-08-25)             |
| `015_portfolio_main_limit.sql`           | ✅ 사용자 실행 확인 (2026-08-25)             |

**실행 여부는 anon 키로 REST 를 찔러서 확인한다** (`curl "$URL/rest/v1/portfolios?select=<컬럼>&limit=1"`
— 컬럼이 없으면 42703). 이 방법으로 011 이 "미실행" 이 아니라 이미 반영돼 있었음을 확인했다.
표를 믿기 전에 한 번 찔러 볼 것.

⚠️ **012 는 DB 가 코드보다 앞서 있었다.** `sort_order` 컬럼도, `reorder_portfolios(p_ids)`
함수도 마이그레이션 파일 없이 이미 들어가 있었다(대시보드에서 만든 것으로 보인다). 값도
`row_number() over (order by seq desc)` 그대로 1..41 이었다. 그래서 012 는 전부 멱등하게
썼다 — 컬럼은 `if not exists`, 백필은 `where sort_order is null`, 함수는 `drop … ; create`.
**012 를 돌려야 새로 얻는 것**: ① 등록 시 맨 위로 놓는 BEFORE INSERT 트리거(안 돌리면 새
포트폴리오의 `sort_order` 가 NULL 이라 목록 맨 아래로 간다) ② 순서만 바꿨을 때 `updated_at`
을 건드리지 않는 트리거 가드 ③ `not null` + 인덱스.

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
- **어드민 목록 드래그 앤 드롭 순서 변경** — 끌어 놓기·`reorder_portfolios` 저장·되읽기.
  DB 쪽 함수는 이미 존재하는 것을 확인했지만(anon 으로 호출 시 42501) **본문은 못 봤다** —
  012 를 돌려 이 저장소 기준 본문으로 맞춘 뒤 확인할 것.
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

**⚠️ `pageviews` 는 이 저장소와 무관한 고아 테이블이다** — 코드·마이그레이션·git 히스토리
어디에도 안 쓰인다. 삭제할지 방문 추적을 실제로 붙일지 결정 필요.

새 메뉴를 붙이는 순서는 스키마 설계 → 목록 조회 → 등록/수정 저장 → 삭제 → 필수값 얼랏이
자연스럽다. `src/lib/{quotes,portfolios}.ts` 처럼 타입·변환·검증을 한 파일에 모으고 화면은
그걸 쓰는 구조를 따라가면 된다.

### 바로 이어서 할 만한 것

- **`013` 실행** — 유령 권한(`/admin/main`) 정리. 남은 유일한 미실행 마이그레이션이다.
  (`012`·`014`·`015` 는 2026-08-25 사용자 실행 확인)
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

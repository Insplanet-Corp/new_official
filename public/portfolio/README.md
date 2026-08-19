# 프로젝트 상세화면 HTML

퍼블리셔가 만든 케이스 스터디 문서를 그대로 올려 두는 곳입니다.
`/projects` 의 카드를 누르면 이 문서가 시트로 올라오고, `/projects/<id>` 로
직접 들어와도 같은 문서가 뜹니다.

```
public/portfolio/
├─ _shared/                 모든 상세가 같이 쓰는 것 (여기만 한 벌)
│  ├─ fonts.css
│  ├─ style.css
│  ├─ project-detail.css    .pd-* 디자인 시스템 (kb-app 계열)
│  ├─ works.css             본문 좌우 거터 (문서별 한 줄씩)
│  ├─ works.js              <project-hero> 컴포넌트 — 히어로 + Overview + 버튼
│  └─ bridge.js             상세 ↔ 시트 다리
├─ kb-app/                  .pd-* 템플릿을 쓰는 문서 (자기 CSS 없음)
│  ├─ index.html
│  └─ img/
├─ onNuri/                  자기 CSS 를 갖는 문서
│  ├─ index.html
│  ├─ style.css             ← 문서 전용 (인라인 <style> 을 빼낸 것)
│  └─ img/
├─ shinhan/
├─ dap/
└─ <다음-프로젝트>/
```

## 새 프로젝트 추가하기

1. **폴더를 만든다** — `public/portfolio/<슬러그>/` 에 `index.html` 과 `img/` 를 통째로
   넣습니다. 문서 안에서 자기 이미지는 `./img/…` 로 부르면 됩니다.
   히어로 배경은 `img/hero-bg.jpg`(PC 가로)와 `img/m-hero-bg.png`(모바일 세로) 두 장.

2. **`<head>` 에 네 줄** — 순서가 중요합니다. 문서 고유 규칙이 마지막에 와야 이깁니다.
   ```html
   <link rel="stylesheet" href="../_shared/fonts.css" />
   <link rel="stylesheet" href="../_shared/project-detail.css" />
   <link rel="stylesheet" href="../_shared/works.css" />
   <link rel="stylesheet" href="./style.css" />
   ```

3. **`<body>` 첫머리에 `<project-hero>` 한 줄** — 히어로(배경·CI·닫기·제목·Client/Launch·
   SCROLL)와 Overview 카드(제목·본문·View Platform·Copy URL)가 통째로 나옵니다.
   ```html
   <project-hero
     ko="온누리 디지털상품권"
     en="Onnuri digital|gift card"
     client="신한은행"
     launch="Oct, 2022"
     hero="img/hero-bg.jpg"
     hero-mobile="img/m-hero-bg.png"
     overview-title="언제 어디서나 편리하게|혜택을 받으세요"
     overview-text="첫 줄|둘째 줄"
     platform="https://…"
   ></project-hero>
   ```
   - `|` 는 줄바꿈입니다. **제목(`ko`/`en`/`overview-title`)에서는 모바일에서만** 끊기고,
     `overview-text` 에서는 항상 끊깁니다.
   - `platform` 을 비우면 View Platform 버튼은 눌러도 아무 일이 없습니다(자리표시자).
   - `launch` 나 `client` 를 빼면 그 칸이 아예 안 나옵니다.

4. **`</body>` 앞에 두 줄**
   ```html
   <script src="/portfolio/_shared/bridge.js"></script>
   <script src="/portfolio/_shared/works.js"></script>
   ```
   ⚠️ `bridge.js` 를 빠뜨리면 닫기가 시트를 못 닫고 **iframe 안에서 목록 페이지가 열립니다.**
   커스텀 커서도 상세 위에서 멈춥니다.

5. **좌우 거터 한 줄** — `_shared/works.css` 아래쪽에 문서별 규칙이 있습니다.
   그 문서의 **배경이 걸린 요소**를 찾아 한 줄 추가하세요 (배경은 풀블리드로 두고 안쪽
   내용만 들여쓰기 위해서입니다).

6. **어드민에 등록한다** — 포트폴리오관리 > 상세화면 HTML 에 `<슬러그>/index.html`.

> 가장 빠른 길은 `onNuri/index.html` 을 복사해 문구만 바꾸는 것입니다.

## 지킬 것

- **사이트 공용 에셋은 절대경로로** — 로고·심볼 등은 `/assets/…` 입니다.
  `/ci_logo_white.svg` 처럼 루트에서 부르면 404 입니다.
- **CSS 안의 `url()` 도 확인** — HTML 의 `src`/`href` 만 보면 절반만 봅니다.
  실제로 `fonts.css` 의 웹폰트 7개가 `../assets/…` 라서 전부 404 였던 적이 있습니다.
- **`height:100vh` · `position:fixed` 를 마음껏 써도 됩니다** — iframe 이 화면 전체
  크기로 고정돼 있어서 상세 문서가 곧 뷰포트입니다. (내용 높이에 맞춰 늘리는 방식은
  `100vh` 가 자기 높이로 풀리면서 끝없이 자라기 때문에 쓰지 않습니다.)
- **닫기 버튼은 선택입니다.** 문서에 `.pd-close` 가 있으면 다리가 그것을 부모에게
  알려서 시트의 기본 X 를 숨깁니다(닫기가 두 개로 보이지 않게). `href` 는 `/projects`
  로 두세요 — 시트 안에서는 다리가 가로채고, 단독으로 열면 그 링크가 동작합니다.
  닫기가 없는 문서(onNuri·shinhan·dap)는 시트의 X 가 그대로 보입니다.

## 옮겨 온 산출물에서 자주 나오는 것

퍼블리셔 파일만 떼어 오면 **원래 얹혀 있던 스타일시트가 같이 오지 않습니다.**
실제로 겪은 것들:

- **이미지가 원본 크기로 펼쳐진다** — `img { max-width: 100% }` 가 빠진 경우입니다.
  문서 안에 `max-width: unset` 이 보이면 그 규칙을 전제하고 있다는 뜻입니다.
- **옆으로 스크롤된다** — 스크롤 인 연출이 요소를 오른쪽에 대기시켜 둡니다.
  `html { overflow-x: clip }` 로 막습니다. `body` 에 `overflow-x: hidden` 만으로는
  안 막힙니다(실제로 dap 이 120px 밀렸습니다).
- **`loading="lazy"` 인데 이미지에 `width`/`height` 가 없다** — 로드 전 높이가 0 이라
  섹션이 전부 0 으로 쌓입니다. 문서가 화면보다 조금만 길어져서 **스크롤로 이미지를
  화면 근처까지 데려갈 수가 없고 → 로드가 안 되고 → 높이도 안 생기는 교착**이 됩니다.
  실제로 kb-app 모바일에서 히어로 아래가 통째로 안 보였습니다.
  → **`<img>` 에 원본 픽셀 크기를 `width`/`height` 로 적으세요.** 자리도 미리 잡혀
  이미지가 뜰 때 화면이 밀리지 않습니다. (`bridge.js` 가 치수 없는 lazy 는 풀어 주지만
  그건 보험일 뿐, 자리 예약은 안 됩니다.)
  ⚠️ 단, 문서 CSS 가 그 이미지에 `height: auto` 를 주고 있어야 합니다. 없으면 속성의
  height 가 그대로 먹어 이미지가 늘어납니다.
- **이미지 파일명이 안 맞는다** — `cover_pc.png` 를 부르는데 폴더에는 `cover.jpg`
  같은 경우. 브라우저 콘솔이 아니라 네트워크 탭에만 404 로 남아 놓치기 쉽습니다.
- **웹폰트가 외부 CDN** — 지금 세 문서가 `cdn.jsdelivr.net` 에서 MICEGothic 을
  받습니다. 사이트의 나머지는 전부 자체 호스팅(`/assets/fonts/`)이라, CDN 이
  막히거나 느리면 이 문서들만 폰트가 바뀌며 레이아웃이 흔들립니다. 자체 호스팅으로
  옮길지는 아직 결정하지 않았습니다.

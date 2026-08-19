# 프로젝트 상세화면 HTML

퍼블리셔가 만든 케이스 스터디 문서를 그대로 올려 두는 곳입니다.
`/projects` 의 카드를 누르면 이 문서가 시트로 올라오고, `/projects/<id>` 로
직접 들어와도 같은 문서가 뜹니다.

```
public/portfolio/
├─ _shared/                 모든 상세가 같이 쓰는 것 (여기만 한 벌)
│  ├─ fonts.css
│  ├─ style.css
│  ├─ project-detail.css    .pd-* 디자인 시스템
│  └─ bridge.js             상세 ↔ 시트 다리
├─ heyyoung-1024/           프로젝트 하나 = 폴더 하나
│  ├─ index.html
│  └─ img/
└─ <다음-프로젝트>/          폴더를 하나 더 만들면 끝
   ├─ index.html
   └─ img/
```

## 새 프로젝트 추가하기

1. **폴더를 만든다** — `public/portfolio/<슬러그>/` 에 `index.html` 과 `img/` 를
   통째로 넣습니다. 문서 안에서 자기 이미지는 `./img/…` 로 부르면 됩니다.

2. **공용 CSS 를 연결한다** — `<head>` 에:
   ```html
   <link rel="stylesheet" href="../_shared/fonts.css" />
   <link rel="stylesheet" href="../_shared/style.css" />
   <link rel="stylesheet" href="../_shared/project-detail.css" />
   ```

3. **다리를 넣는다** — `</body>` 바로 앞에:
   ```html
   <script src="/portfolio/_shared/bridge.js"></script>
   ```
   ⚠️ 빠뜨리면 닫기 버튼이 시트를 닫지 않고 **iframe 안에서 목록 페이지를 열어
   버립니다.** 커스텀 커서도 상세 위에서 멈춥니다.

4. **어드민에 등록한다** — 포트폴리오관리 > 상세화면 HTML 에
   `<슬러그>/index.html` 을 적습니다.

## 지킬 것

- **사이트 공용 에셋은 절대경로로** — 로고·심볼 등은 `/assets/…` 입니다.
  `/ci_logo_white.svg` 처럼 루트에서 부르면 404 입니다.
- **CSS 안의 `url()` 도 확인** — HTML 의 `src`/`href` 만 보면 절반만 봅니다.
  실제로 `fonts.css` 의 웹폰트 7개가 `../assets/…` 라서 전부 404 였던 적이 있습니다.
- **`height:100vh` · `position:fixed` 를 마음껏 써도 됩니다** — iframe 이 화면 전체
  크기로 고정돼 있어서 상세 문서가 곧 뷰포트입니다. (내용 높이에 맞춰 늘리는 방식은
  `100vh` 가 자기 높이로 풀리면서 끝없이 자라기 때문에 쓰지 않습니다.)
- **닫기 버튼은 `.pd-close`** — `href` 는 `/projects` 로 두세요. 시트 안에서는
  다리가 가로채고, 단독으로 열었을 때는 그 링크가 그대로 동작합니다.

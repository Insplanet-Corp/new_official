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

```
components/admin/
  theme.module.css   디자인 토큰(--ink --line --radius …) + element 리셋
                     → 모든 루트가 composes 로 가져다 쓴다
  kit.module.css     페이지 공용 프리미티브 (btn card table toolbar badge chip seg)
  form.module.css    등록/조회/수정의 "라벨 | 컨트롤" 행, 라디오, 체크그리드,
                     파일찾기, 읽기전용 값, 섹션, 액션바
  AdminShell.module.css  헤더 · 탭바 · 본문 프레임
  ui.module.css      ui.tsx 가 렌더하는 조각들
app/admin/login/login.module.css
```

토큰은 CSS 커스텀 프로퍼티라 DOM 상속을 탄다 — 하위 모듈은 `theme.module.css`를 import하지
않아도 `var(--ink)`를 그대로 쓸 수 있다.

**⚠️ TS는 CSS Module 멤버를 `any`로 본다.** `kit.존재하지않는이름`을 써도 타입체크가 통과하고
런타임에 `undefined`가 className에 들어간다. 클래스명을 바꿀 때는 참조처를 직접 grep할 것.

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
`관리자시스템_화면설계서20260703.pptx` (45p) 기준. **화면 골격만** — 데이터 연동·저장·삭제·얼랏 없음.

라우트 17개:
```
/admin/main            /new  /[id]  /[id]/edit     메인관리 (A타입)
/admin/portfolio       /new  /[id]  /[id]/edit     포트폴리오관리
/admin/quotes                /[id]                 견적문의관리
/admin/recruit               /[id]                 리크루트관리
/admin/users           /new  /[id]  /[id]/edit     사용자관리
/admin/login                                       로그인
```

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

---

## 현재 상태

```
브랜치   refactor/css-modules   (main 미머지)
커밋     706e913 어드민 CSS Modules 전환   ← 원격에 푸시됨
         b44320b 어드민 화면 틀 추가       ← 로컬만, 미푸시
태그     backup/css-modules-full           ← 되돌린 전체 CSS 변환 (로컬만)
```

빌드·타입체크 통과. 마케팅 라우트는 초기 커밋과 **완전히 동일**(diff 0).

---

## 다음에 할 일

### 검증 못 한 것 (먼저 확인 필요)
**어드민 화면을 눈으로 본 적이 없다.** 로그인 게이트 뒤에 있어서 접근하면
`/admin/login`으로 리다이렉트되고, 계정 정보를 넣을 수 없다. 빌드·타입체크·CSS 참조
(223건, 불일치 0)는 확인했지만 **레이아웃(정렬·넘침·간격)은 미검증**이다.

견적문의는 한 걸음 더 미검증이다 — **`quotes` 테이블이 비어 있어 실제 렌더를 못 봤다.**
Contact 폼이 넣는 형태의 행으로 필터·표시 로직만 따로 검증했다. 실제 문의가 한 건이라도
들어오면 목록·상세를 먼저 확인할 것.

### 기능 붙이기

**연동 완료**: 견적문의관리(`quotes`) — 목록 조회 · 필터 · 진행 상태 변경 · 상세 조회

**남은 것** — 테이블이 없어서 못 붙인다:
| 메뉴 | 테이블 | 현재 |
|---|---|---|
| 리크루트관리 | `recruits` | 코드는 참조하나 테이블 없음 → "테이블 없음" 안내 |
| 사용자관리 | `admin_users` | 위와 같음. anon 키로는 Auth 사용자 목록 조회 불가(service-role 필요) |
| 메인관리 | 없음 | 스키마 설계부터 |
| 포트폴리오관리 | 없음 | 지금은 `src/data/projectsPage.ts` 정적 파일 |

순서는 **스키마 설계 → 목록 조회 → 등록/수정 저장 → 삭제 → 필수값 얼랏**이 자연스럽다.
견적문의를 붙인 방식(`src/lib/quotes.ts`에 타입·헬퍼를 모으고 화면은 그걸 쓰는 구조)을
그대로 따라가면 된다.

이미지 업로드(썸네일 PC/모바일, 고객사 CI)와 첨부파일은 **Supabase Storage**가 선행돼야 한다.

### 기획서에 물음표로 남은 것 (담당자 확인 필요)
- 메인관리 목록에 삭제 기능이 필요한가 (10p) — 현재는 조회 화면에만 삭제 배치
- 사용자 데이터 삭제 기능이 필요한가 (42p) — 현재는 수정/취소만
- 권한 없는 메뉴 처리 (44~45p) — 메뉴를 숨길지, 보여주되 클릭 시 얼랏을 띄울지 두 안 병기
- 상세화면 HTML 업로드 실제 경로 (25p) — 지금은 `/com/resource/content/portfolio/detail/` 임시값

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

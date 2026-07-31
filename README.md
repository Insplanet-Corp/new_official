# Insplanet — Next.js port

The static site (`../insplanet`, plain HTML + CSS + JS) rebuilt as a Next.js 16 App Router project
in TypeScript. Every page's markup is now TSX; the hand-tuned CSS and the WebGL / scroll runtime are
carried over unchanged so the site looks and behaves exactly as before.

## 시작하기

```bash
git clone https://github.com/Insplanet-Corp/new_official.git
cd new_official
npm install
cp .env.example .env.local   # 아래 "환경 변수 설정" 참고 — 값을 채워야 실행됩니다
npm run dev                  # http://localhost:5599
```

```bash
npm run dev      # http://localhost:5599
npm run build    # all 5 routes prerender as static content
npm run typecheck
```

## 환경 변수 설정 (필수)

이 프로젝트는 Supabase를 사용하므로 **환경 변수를 설정하지 않으면 실행되지 않습니다.**
보안상 실제 키 값은 저장소에 포함되어 있지 않습니다 (`.env*` 는 `.gitignore` 로 제외됨).

### 1. 파일 생성

저장소 루트에 `.env.local` 파일을 만듭니다. `.env.example` 을 복사하면 됩니다.

```bash
cp .env.example .env.local
```

### 2. 값 채우기

`.env.local` 을 열어 아래 두 값을 실제 값으로 교체합니다.

| 변수 | 설명 | 확인 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Project Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(public) 키 | Supabase 대시보드 → Project Settings → API → **anon public** |

```dotenv
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 3. 개발 서버 재시작

환경 변수는 서버 시작 시점에 읽히므로, 값을 바꾼 뒤에는 `npm run dev` 를 다시 실행해야 반영됩니다.

### ⚠️ 주의사항

- `.env.local` 은 **절대 커밋하지 마세요.** `.gitignore` 에 이미 등록되어 있습니다.
- 키 값을 Slack·이메일·이슈 등 공개된 채널에 붙여넣지 마세요.
- `NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저 번들에 포함됩니다. 서버 전용 비밀키
  (예: `service_role` 키)는 절대 이 접두사를 붙이지 마세요.

### 🔑 키 값 요청

**실제 환경 변수 값이 필요하신 경우, 저장소에 값을 요청하지 마시고 프로젝트 담당자에게 직접 문의해 주세요.**
Supabase 프로젝트 접근 권한과 함께 안전한 경로로 전달해 드립니다.

- 문의: 프로젝트 담당자 (Insplanet Corp. 개발팀)
- 연락처: `dev@insplanet.co.kr`

## Routes

| Route       | was            | notes |
|-------------|----------------|-------|
| `/`         | `index.html`   | phones (≤767px) are bounced to `/mobile` |
| `/about`    | `about.html`   | |
| `/projects` | `projects.html`| |
| `/contact`  | `contact.html` | |
| `/mobile`   | `mobile.html`  | desktop/tablet (≥768px) bounce back to `/` |

## Layout of the source

```
public/
  assets/ images/     copied as-is; every reference is now root-absolute (/assets/…)
  js/                 the legacy runtime, unchanged except for two index.html → "/" links in main.js
src/
  app/                one folder per route + the root layout
  components/
    PageShell.tsx     #page-root + chrome + footer + menu, and boots the legacy runtime
    LegacyRuntime.tsx replaces js/shared-ui.js: injects the pg-defer placeholders, then Lenis → main.js → page scripts
    chrome/           SiteChrome, SiteFooter, MenuOverlay, Cursor  (was the HTML strings in shared-ui.js)
    home/ about/ projects/ contact/ mobile/
  data/               copy + logo tables + the seeded dummy project list
  lib/                shared scroll/reveal helpers and the ported page hooks
  styles/             the original CSS, imported as global stylesheets
```

## How the legacy runtime is wired

`js/shared-ui.js` used to inject the shared markup and then append Lenis + `main.js`. The markup half
is now React (`SiteChrome` / `SiteFooter` / `MenuOverlay`), so only the script half remains, in
`LegacyRuntime`: after mount it inserts the `text/pg-defer` placeholders (main.js swaps them for real
scripts once the enter fade is done), then appends Lenis, `main.js` and any page scripts with
`async = false` so they execute in order. `main.js` therefore sees exactly the DOM it always did.

Because `main.js` owns the page transition (fade out, then `location.href`), the nav links are plain
`<a href="/about">` rather than `next/link` — every navigation is a full document load, which is what
re-arms the transition, the pinned sections and the WebGL canvases. Two `index.html` references
inside `main.js` were repointed at `/`.

## What was rewritten rather than carried over

The per-page inline scripts are now typed React code:

- **projects** — the seeded 40-card dummy grid is generated at module scope (deterministic, so SSR and
  the client agree); category filter + 완료/진행중 toggle are React state; the first-row load reveal,
  the scroll reveal and the magnetic card spring are hooks.
- **contact** — chips, consent and submit gating are React state; the character filters (연락처 digits
  only, 이메일/URL ASCII only), the file-attach value lock, the URL scheme prefill and
  jump-to-first-missing are ports that still drive the DOM directly, which is what keeps the caret and
  the IME behaviour intact. The Careers popup is portalled into `<body>` so it stays outside
  `#page-root`.
- **mobile** — the Beyond scrub, the Insight grow/step scrub and the two reveal observers are hooks on
  their sections; `MobileRuntime` loads the blob, Lenis and the Insight shader bundle.

Two small structural changes were needed for React:

- the per-page `<body class>` is applied by `BodyClass` (it only sets `background:#fff`);
- `ct-rv` (the contact page's pre-paint "hide the reveal areas" flag) is server-rendered on
  `<main class="contact ct-rv">` instead of being stamped on `<html>` by an inline script — every rule
  is a descendant selector, so the effect is identical without a hydration mismatch, and a `<noscript>`
  block unhides the form when scripts are off.

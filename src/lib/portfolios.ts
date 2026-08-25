/* 포트폴리오(portfolios) 도메인 — 어드민 CRUD 와 공개 /projects 가 함께 쓴다.
   스키마: supabase/migrations/004_portfolios.sql

   기획서의 진행 상태 규칙이 데이터에도 그대로 나타난다:
     ongoing(진행) → client_ci · 기간이 채워지고 썸네일/HTML 은 비어 있다
     done(종료)    → 썸네일 · html_file 이 채워지고 CI/기간은 비어 있다
   화면은 이 규칙을 강제하되, DB 는 NULL 을 허용한다(과거 데이터 보정 여지). */

/** 메인 노출 상한. 홈 "Our Projects" 슬라이드 수와 같은 값이다 (사용자 결정).

    한 곳에서만 정의한다 — 어드민 폼의 체크박스 비활성, 저장 직전 재확인,
    홈 쿼리의 limit(`MAX_SHOWCASE`), 015 의 DB 트리거가 전부 이 숫자를 뜻한다.
    ⚠️ 숫자를 바꾸면 `supabase/migrations/015_portfolio_main_limit.sql` 의
    상한도 같이 바꿔야 한다 — SQL 은 이 상수를 못 읽는다. */
export const MAX_MAIN = 3;

export type PortfolioCategory = "Web" | "Mobile" | "Consulting";
export type PortfolioStatus = "ongoing" | "done";

/* 004 의 체크 제약과 같은 값이어야 한다.
   validate 가 "비었나" 만 보면, 드롭다운 플레이스홀더 값처럼 비어 있지 않은
   엉뚱한 문자열이 통과해 저장 순간 23514 로 터진다. 화이트리스트로 막는다. */
export const CATEGORY_VALUES: PortfolioCategory[] = [
  "Web",
  "Mobile",
  "Consulting",
];
export const STATUS_VALUES: PortfolioStatus[] = ["ongoing", "done"];

export type Portfolio = {
  id: string;
  /** 등록 순번. `generated always as identity` 라 사람이 못 바꾼다 — 표시
      순서는 sort_order 가 정한다 */
  seq: number;
  /** 표시 순서(012). 작을수록 위/앞. 어드민 드래그 앤 드롭이 정하고
      /projects · 홈 메인 슬라이드가 같은 순서로 그린다.
      값이 연속이라는 보장은 없다 — 어드민 목록의 "No" 는 이 값이 아니라
      정렬한 뒤의 위치(1,2,3…)다 */
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** 프로젝트명. \n 이 있으면 그 자리에서 줄바꿈한다 */
  title: string;
  category: PortfolioCategory | null;
  status: PortfolioStatus | null;
  use_yn: "Y" | "N";
  award: boolean;
  thumb_pc: string | null;
  thumb_mobile: string | null;
  /** 메인 화면 노출 여부. true 면 thumb_main 이 반드시 있다 (010 의 check 제약) */
  is_main: boolean;
  /** 메인 화면용 썸네일. 카드용 thumb_pc 와 비율이 달라 따로 둔다 */
  thumb_main: string | null;
  /** 고객사명 텍스트 — 메인 슬라이드의 Client 칸 (011). client_ci 이미지와 다른 자리다 */
  client: string | null;
  /** 메인 슬라이드의 Launch 표기 (예: 'Jan, 2024') */
  launch: string | null;
  client_ci: string | null;
  /** 'YYYY-MM-DD' */
  started_on: string | null;
  ended_on: string | null;
  html_file: string | null;
};

/** 등록/수정 폼이 다루는 값 (DB 컬럼과 1:1 은 아니다 — 날짜가 YYYYMMDD 문자열) */
export type PortfolioDraft = {
  title: string;
  use_yn: "Y" | "N" | "";
  category: string;
  status: string;
  award: boolean;
  thumb_pc: string;
  thumb_mobile: string;
  is_main: boolean;
  thumb_main: string;
  client: string;
  launch: string;
  client_ci: string;
  /** YYYYMMDD (기획서 폼 형식) */
  startedAt: string;
  endedAt: string;
  html_file: string;
};

export const EMPTY_DRAFT: PortfolioDraft = {
  title: "",
  use_yn: "",
  category: "",
  status: "",
  award: false,
  thumb_pc: "",
  thumb_mobile: "",
  is_main: false,
  thumb_main: "",
  client: "",
  launch: "",
  client_ci: "",
  startedAt: "",
  endedAt: "",
  html_file: "",
};

/* ---- 상세화면 경로 ---------------------------------------------------------
   html_file 에 저장하는 값은 **폴더명 하나**다 (예: 'kb-app').
   파일명은 규칙으로 붙인다 — 상세는 언제나 그 폴더의 index.html 이다.

   예전에는 '/kb-app/index.html' 처럼 파일명까지 적어 저장했다(2026-08-25 이전
   37건이 전부 그 표기다). 읽는 쪽은 두 표기를 다 받아 준다 — 014 를 안 돌려도
   화면이 깨지지 않게 하기 위함이다. */

/** 상세 폴더 안의 진입 파일. 바꿀 일은 없지만 하드코딩을 한 곳에 모아 둔다 */
export const DETAIL_INDEX = "index.html";

/** 어떤 표기로 들어와도 폴더명만 남긴다. 쓸 수 없는 값이면 ''.

    ⚠️ DB 값을 그대로 iframe src 에 넣으면 외부 주소를 넣어 우리 페이지 안에 임의의
    사이트를 띄우는 통로가 된다(피싱). 그래서 여기서 **한 조각짜리 폴더명**만 통과시킨다 —
    절대 URL(스킴·프로토콜 상대)도, 상위 이동('..')도, 중첩 경로도 전부 막힌다. */
export const toDetailFolder = (value: string | null): string => {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  // 절대 URL(스킴 또는 프로토콜 상대)은 거부한다
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return "";

  /* 앞의 '/' 와 'portfolio/' 접두는 있어도 없어도 받아 준다 — 008 주석은
     '/portfolio/...' 로, 옛 어드민 폼 예시는 '/kb-app/index.html' 로 적혀 있어
     실제 DB 에 두 표기가 섞인다. */
  const parts = raw
    .replace(/^\/+/, "")
    .replace(/^portfolio\//, "")
    .split("/")
    .filter(Boolean);

  // 마지막 조각이 파일명이면 떼어 낸다 (옛 표기 '<폴더>/index.html')
  if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

  // 남는 것은 폴더명 하나여야 한다. 'index.html' 만 적었다면 여기서 걸린다
  if (parts.length !== 1) return "";
  const folder = parts[0];
  if (folder === "." || folder === "..") return "";
  return folder;
};

/** html_file -> iframe 에 넣을 사이트 내부 경로. 넣을 수 없으면 null.
    상세 라우트와 시트가 이 하나를 같이 쓴다. */
export const detailSrc = (htmlFile: string | null): string | null => {
  const folder = toDetailFolder(htmlFile);
  return folder ? `/portfolio/${folder}/${DETAIL_INDEX}` : null;
};

/* 기획서(25p)의 DETAIL_PATH(/com/resource/content/portfolio/detail/)는 없앴다.
   상세 HTML 은 이제 Storage 에 올리고 html_file 에 공개 URL 을 담는다 — 008 참고.
   웹서버 정적 디렉터리에 파일을 두는 방식은 Vercel 배포에서 성립하지 않는다. */

/* ---- 날짜 변환 -------------------------------------------------------------
   기획서 폼은 YYYYMMDD 로 받고 DB 는 date 다. 양방향 변환이 필요하다. */

/** '2025-10-15' -> '20251015' */
export const toFormDate = (iso: string | null): string =>
  iso ? iso.replaceAll("-", "") : "";

/** '20251015' -> '2025-10-15'. 8자리가 아니면 null (DB 에 넣지 않는다) */
export const toIsoDate = (form: string): string | null => {
  const d = form.trim();
  if (!/^\d{8}$/.test(d)) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
};

/** 조회 화면·공개 표의 기간 표기: '2025.10.15 ~ 2026.05.14' */
export const formatPeriod = (
  from: string | null,
  to: string | null,
): string => {
  const fmt = (s: string | null) => (s ? s.replaceAll("-", ".") : "");
  if (!from && !to) return "-";
  return `${fmt(from)} ~ ${fmt(to)}`;
};

/* ---- 표시 순서 -------------------------------------------------------------
   어드민·공개 화면이 모두 이 순서를 쓴다. sort_order 가 같으면(백필 전 데이터나
   동시 등록) 예전 기준인 seq 내림차순으로 갈라 목록이 흔들리지 않게 한다.

   ⚠️ Supabase 쿼리에도 같은 순서를 걸어야 한다(ORDER_SORT). 서버가 정렬해 주면
   클라이언트에서 다시 세울 필요가 없지만, 드래그 중에는 로컬 배열이 진실이라
   저장 후 되읽을 때 이 비교 함수로 맞춘다. */
export const bySortOrder = (a: Portfolio, b: Portfolio): number =>
  a.sort_order - b.sort_order || b.seq - a.seq;

/** 목록의 등록/수정일 */
export const formatDay = (ts: string): string => ts.slice(0, 10);

/* ---- 프로젝트명 ------------------------------------------------------------
   기본은 자동 줄바꿈이고, \n 을 넣으면 그 자리에서 끊는다 (사용자 합의).

   ⚠️ 두 가지 표현이 섞인다. 폼의 <input> 은 한 줄짜리라 진짜 개행을 담을 수
   없으므로, 사용자는 역슬래시+n 두 글자를 친다. DB 에는 진짜 개행으로 저장한다
   (시드도 E'...\n...' 로 넣었다). 그래서 경계에서 변환한다:
     저장 시  toRow   — 역슬래시+n  ->  개행
     편집 시  toDraft — 개행        ->  역슬래시+n
   titleLines 는 방어적으로 둘 다 끊는다. */
const LITERAL_NL = /\\n/g;

export const titleLines = (title: string): string[] =>
  title.replace(LITERAL_NL, "\n").split("\n");

/** 목록·표처럼 한 줄로 보여야 하는 곳 */
export const titleOneLine = (title: string): string =>
  titleLines(title).join(" ");

/* ---- 폼 <-> DB ------------------------------------------------------------ */

export const toDraft = (p: Portfolio): PortfolioDraft => ({
  // 한 줄 <input> 으로 편집하므로 개행을 다시 역슬래시+n 으로 되돌린다
  title: (p.title ?? "").replaceAll("\n", "\\n"),
  use_yn: p.use_yn,
  category: p.category ?? "",
  status: p.status ?? "",
  award: p.award,
  thumb_pc: p.thumb_pc ?? "",
  thumb_mobile: p.thumb_mobile ?? "",
  is_main: p.is_main ?? false,
  thumb_main: p.thumb_main ?? "",
  client: p.client ?? "",
  launch: p.launch ?? "",
  client_ci: p.client_ci ?? "",
  startedAt: toFormDate(p.started_on),
  endedAt: toFormDate(p.ended_on),
  /* 폼은 폴더명만 다룬다. 못 알아먹을 값이면 원본을 그대로 보여 준다 —
     조용히 지워 버리는 것보다 사용자가 보고 고치는 편이 낫다(validate 가 막는다) */
  html_file: toDetailFolder(p.html_file) || (p.html_file ?? ""),
});

/** 폼 값 -> insert/update 페이로드. 빈 문자열은 NULL 로 눕힌다 */
export const toRow = (d: PortfolioDraft) => {
  const nz = (s: string) => (s.trim() ? s.trim() : null);
  return {
    // 사용자가 친 역슬래시+n 을 진짜 개행으로 눕혀서 저장한다
    title: d.title.trim().replace(LITERAL_NL, "\n"),
    category: nz(d.category),
    status: nz(d.status),
    use_yn: d.use_yn === "N" ? "N" : "Y",
    award: d.award,

    /* 진행 상태와 무관하게 입력한 값을 그대로 다 저장한다.

       예전엔 상태에 맞지 않는 쪽을 NULL 로 눕혔는데, 그러면 "종료로 바꾸기 전에
       썸네일부터 올려 두는" 흐름에서 방금 올린 이미지가 저장 시점에 조용히
       버려진다. 어느 쪽을 보여줄지는 화면이 status 로 판단하므로(카드=종료,
       표=진행) 데이터를 지울 이유가 없다. */
    thumb_pc: nz(d.thumb_pc),
    thumb_mobile: nz(d.thumb_mobile),
    is_main: d.is_main,
    thumb_main: nz(d.thumb_main),
    client: nz(d.client),
    launch: nz(d.launch),
    // 폴더명만 저장한다. index.html 은 읽을 때 붙인다
    html_file: toDetailFolder(d.html_file) || null,
    client_ci: nz(d.client_ci),
    started_on: toIsoDate(d.startedAt),
    ended_on: toIsoDate(d.endedAt),
  };
};

/** 기획서의 필수값 규칙. 통과하면 null, 아니면 첫 오류 메시지 */
export const validate = (d: PortfolioDraft): string | null => {
  if (!d.title.trim()) return "프로젝트명을 입력해 주세요.";
  if (!d.use_yn) return "사용여부를 선택해 주세요.";
  if (!CATEGORY_VALUES.includes(d.category as PortfolioCategory))
    return "분류를 선택해 주세요.";
  if (!STATUS_VALUES.includes(d.status as PortfolioStatus))
    return "진행 상태를 선택해 주세요.";

  /* 메인 노출은 전용 썸네일이 있어야 한다. DB 에도 같은 규칙이 걸려 있지만
     (010 의 portfolios_main_thumb_chk), 여기서 먼저 막아야 사용자가 23514
     제약 위반 대신 읽을 수 있는 안내를 본다. */
  if (d.is_main && !d.thumb_main.trim())
    return "메인으로 노출하려면 썸네일 – 메인을 첨부해 주세요.";

  /* 적었다면 폴더명 하나로 해석돼야 한다. 여기서 안 막으면 toRow 가 NULL 로
     눕혀서 "저장은 됐는데 카드가 안 눌리는" 상태가 된다 */
  if (d.html_file.trim() && !toDetailFolder(d.html_file))
    return "상세화면 폴더명은 public/portfolio/ 아래 폴더 이름 하나만 적어 주세요 (예: kb-app).";

  if (d.status === "done") {
    if (!d.thumb_pc.trim()) return "종료 프로젝트는 썸네일 – PC 가 필요합니다.";
    if (!d.thumb_mobile.trim())
      return "종료 프로젝트는 썸네일 – 모바일이 필요합니다.";
    // if (!d.html_file.trim())
    //   return '종료 프로젝트는 상세화면 폴더명이 필요합니다.';
  }

  if (d.status === "ongoing") {
    if (!d.client_ci.trim())
      return "진행 프로젝트는 고객사 CI 이미지가 필요합니다.";
    if (!toIsoDate(d.startedAt) || !toIsoDate(d.endedAt))
      return "프로젝트 기간을 YYYYMMDD 8자리로 입력해 주세요.";
    if (d.startedAt > d.endedAt)
      return "프로젝트 기간의 시작일이 종료일보다 늦습니다.";
  }
  return null;
};

/* 포트폴리오(portfolios) 도메인 — 어드민 CRUD 와 공개 /projects 가 함께 쓴다.
   스키마: supabase/migrations/004_portfolios.sql

   기획서의 진행 상태 규칙이 데이터에도 그대로 나타난다:
     ongoing(진행) → client_ci · 기간이 채워지고 썸네일/HTML 은 비어 있다
     done(종료)    → 썸네일 · html_file 이 채워지고 CI/기간은 비어 있다
   화면은 이 규칙을 강제하되, DB 는 NULL 을 허용한다(과거 데이터 보정 여지). */

export type PortfolioCategory = "Web" | "Mobile" | "Consulting";
export type PortfolioStatus = "ongoing" | "done";

export type Portfolio = {
  id: string;
  /** 기획서 목록의 "No". id 가 uuid 라 따로 둔 순번 */
  seq: number;
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
  client_ci: "",
  startedAt: "",
  endedAt: "",
  html_file: "",
};

/** 상세화면 업로드 경로 — 실제 경로 확정되면 교체 (기획서 25p 9번) */
export const DETAIL_PATH = "/com/resource/content/portfolio/detail/";

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
  client_ci: p.client_ci ?? "",
  startedAt: toFormDate(p.started_on),
  endedAt: toFormDate(p.ended_on),
  html_file: p.html_file ?? "",
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
    html_file: nz(d.html_file),
    client_ci: nz(d.client_ci),
    started_on: toIsoDate(d.startedAt),
    ended_on: toIsoDate(d.endedAt),
  };
};

/** 기획서의 필수값 규칙. 통과하면 null, 아니면 첫 오류 메시지 */
export const validate = (d: PortfolioDraft): string | null => {
  if (!d.title.trim()) return "프로젝트명을 입력해 주세요.";
  if (!d.use_yn) return "사용여부를 선택해 주세요.";
  if (!d.category) return "분류를 선택해 주세요.";
  if (!d.status) return "진행 상태를 선택해 주세요.";

  if (d.status === "done") {
    if (!d.thumb_pc.trim()) return "종료 프로젝트는 썸네일 – PC 가 필요합니다.";
    if (!d.thumb_mobile.trim())
      return "종료 프로젝트는 썸네일 – 모바일이 필요합니다.";
    // if (!d.html_file.trim())
    //   return '종료 프로젝트는 상세화면 HTML 파일명이 필요합니다.';
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

/* Single source of truth for the shared chrome copy (footer + full menu). */

export const CONTACT = {
  address: "서울특별시 중구 퇴계로27길 49, 2층 (저동2가, 센트럴에스빌딩)",
  email: "hello@insplanet.co.kr",
  tel: "02.2088.5084",
  fax: "02.2088.5184",
  copyright: "Ⓒ 2026. Insplanet all right reserved.",
} as const;

/* 회사소개서 PDF. 전체메뉴(PC·모바일)와 Contact 히어로(PC·모바일) 네 곳이 같은 파일을 건다.

   ⚠️ 파일은 **저장소에 있지 저장소(repo)에 있지 않다** — Supabase Storage 의 `brief` 버킷,
   고정 경로 `brief/insplanet_brief.pdf` 다. 어드민 '회사소개서관리'(/admin/brief)에서 올리면
   그 자리에 덮어써지고, 경로가 안 바뀌니 이 상수도 그대로다(배포 불필요, 016 마이그레이션).

   ⚠️ **`?download=` 을 다시 붙이지 말 것** (2026-08-26 사용자 결정: 받아지지 말고 열려야 한다).
   Supabase 는 그 쿼리를 받으면 `Content-Disposition: attachment` 를 내려 주고, 그러면
   브라우저가 새 탭을 열자마자 닫으며 파일을 받아 버린다. 빼면 헤더가 아예 안 붙고
   `content-type: application/pdf` 만 남아 브라우저 뷰어로 열린다(실측 확인).

   사이트가 쓰는 주소는 **짧은 쪽**이다 — `next.config.ts` 의 rewrites 가 이 경로를
   Storage 원본으로 프록시한다. 리다이렉트가 아니라 프록시라 주소창에도 이 주소가 그대로
   남는다. ⚠️ 여기와 `next.config.ts` 의 rewrites/headers 가 짝이다 — 한쪽만 바꾸면 404 다.

   ⚠️ 링크 4곳(`ct-brief`·`mc-brief`·`brief-btn`·`m-menu-brief`)의 **`target="_blank"` 를
   빼지 말 것.** 짧은 주소로 바뀌면서 이 링크가 **같은 출처**가 됐다 — `main.js` 의 전역 링크
   가로채기(89행·342행)가 예전에는 "다른 출처라서" 자동으로 걸러 줬지만 이제는 아니다.
   지금 안 걸리는 유일한 이유가 `target==='_blank'` 검사이고, 그게 origin 검사보다 **앞**에
   있다. 빼는 순간 main.js 가 클릭을 가로채 페이지 전환 연출을 태우고 화면이 blank 가 된다.
   같은 이유로 `download` 속성도 다시 붙이지 말 것 — 같은 출처가 됐으니 이제는 실제로
   먹어서 조용히 "받기" 로 되돌아간다. */
export const BRIEF_PDF = "/brief.pdf";

/** 어드민이 덮어쓰는 고정 경로 — 어드민 화면과 이 상수가 같은 값을 봐야 한다 */
export const BRIEF_BUCKET = "brief";
export const BRIEF_PATH = "insplanet_brief.pdf";

export type NavItem = { href: string; label: string };

/* Projects 옆 배지 숫자는 여기 있지 않다 — 공개된 완료 프로젝트 수를 DB 에서 세어
   PageShell 이 MenuOverlay 에 내려준다(lib/projectCount.ts). 하드코딩된 '42' 가
   실제 건수와 오래 어긋나 있었다. */
export const MENU_NAV: NavItem[] = [
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const MENU_PRODUCTS = [
  {
    name: "RoAI",
    desc: "마케팅 온톨로지로 상품을 읽고, 콘텐츠로 완성하는 커머스 AI",
  },
  { name: "Inspick", desc: "맥락을 짚어 최적의 하나를 픽하는 AI 에이전트" },
  {
    name: "Archy",
    desc: "기획, 디자인, 코드가 하나의 언어로 동기화되는 AI 엔진",
  },
] as const;

export const FOOTER_LINKS = ["ROAI", "Inspick", "Archy"] as const;

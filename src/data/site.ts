/* Single source of truth for the shared chrome copy (footer + full menu). */

export const CONTACT = {
  address: '서울특별시 중구 퇴계로27길 49, 2층 (저동2가, 센트럴에스빌딩)',
  email: 'hello@insplanet.co.kr',
  tel: '02.2088.5084',
  fax: '02.2088.5184',
  copyright: 'Ⓒ 2026. Insplanet all right reserved.',
} as const;

/* 회사소개서 PDF. 전체메뉴(PC·모바일)와 Contact 히어로(PC·모바일) 네 곳이 같은 파일을 건다.

   ⚠️ 파일은 **저장소에 있지 저장소(repo)에 있지 않다** — Supabase Storage 의 `brief` 버킷,
   고정 경로 `brief/insplanet_brief.pdf` 다. 어드민 '회사소개서관리'(/admin/brief)에서 올리면
   그 자리에 덮어써지고, 경로가 안 바뀌니 이 상수도 그대로다(배포 불필요, 016 마이그레이션).

   ⚠️ **`?download=` 을 다시 붙이지 말 것** (2026-08-26 사용자 결정: 받아지지 말고 열려야 한다).
   Supabase 는 그 쿼리를 받으면 `Content-Disposition: attachment` 를 내려 주고, 그러면
   브라우저가 새 탭을 열자마자 닫으며 파일을 받아 버린다. 빼면 헤더가 아예 안 붙고
   `content-type: application/pdf` 만 남아 브라우저 뷰어로 열린다(실측 확인).

   ⚠️ 링크에는 `download` 대신 **`target="_blank"`** 를 쓴다. `main.js` 의 전역 링크
   가로채기는 `target==='_blank'` 와 `download` 를 **둘 다** 거르므로(89행·342행) 어느 쪽이든
   가로채기에서는 안전하다. 다만 `download` 를 남겨 두면 파일이 다시 같은 출처로 옮겨졌을 때
   조용히 "받기" 로 되돌아간다 — 그래서 지웠다. */
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const BRIEF_PDF = `${SUPABASE}/storage/v1/object/public/brief/insplanet_brief.pdf`;

/** 어드민이 덮어쓰는 고정 경로 — 어드민 화면과 이 상수가 같은 값을 봐야 한다 */
export const BRIEF_BUCKET = 'brief';
export const BRIEF_PATH = 'insplanet_brief.pdf';

export type NavItem = { href: string; label: string };

/* Projects 옆 배지 숫자는 여기 있지 않다 — 공개된 완료 프로젝트 수를 DB 에서 세어
   PageShell 이 MenuOverlay 에 내려준다(lib/projectCount.ts). 하드코딩된 '42' 가
   실제 건수와 오래 어긋나 있었다. */
export const MENU_NAV: NavItem[] = [
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export const MENU_PRODUCTS = [
  { name: 'RoAI', desc: '로아는 김은경님 부자만들어줄 AI입니다. 일껄요. 이어야해요.' },
  { name: 'Inspick', desc: '인스픽도 김은경님 부자만들어줄 AI입니다. 일껄요. 이어야해요.' },
  { name: 'Archy', desc: '아키도 김은경님 부자만들어줄 AI입니다. 일껄요. 이어야해요.' },
] as const;

export const FOOTER_LINKS = ['ROAI', 'Inspick', 'Archy'] as const;

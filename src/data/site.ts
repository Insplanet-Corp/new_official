/* Single source of truth for the shared chrome copy (footer + full menu). */

export const CONTACT = {
  address: '서울특별시 중구 퇴계로27길 49, 2층 (저동2가, 센트럴에스빌딩)',
  email: 'hello@insplanet.co.kr',
  tel: '02.2088.5084',
  fax: '02.2088.5184',
  copyright: 'Ⓒ 2026. Insplanet all right reserved.',
} as const;

/* 회사소개서 PDF. 전체메뉴(PC·모바일)와 Contact 히어로(PC·모바일) 네 곳이 같은 파일을 건다 —
   경로가 갈리지 않게 여기 한 곳에 둔다.
   ⚠️ 거는 <a> 에는 반드시 `download` 를 같이 붙일 것. public/js/main.js 가 같은 출처 <a> 클릭을
   전부 가로채 페이지 전환으로 바꾸는데(`exit()`), `download` 가 있는 링크만 그 가로채기에서
   빠진다(main.js 89행·342행 둘 다 `a.hasAttribute('download')` 로 거른다). 빠뜨리면 다운로드가
   아니라 PDF 로 페이지 이동을 시도한다. */
export const BRIEF_PDF = '/assets/pdf/insplanet_brief.pdf';

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

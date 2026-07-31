/* Single source of truth for the shared chrome copy (footer + full menu). */

export const CONTACT = {
  address: '서울특별시 중구 퇴계로27길 49, 2층 (저동2가, 센트럴에스빌딩)',
  email: 'hello@insplanet.co.kr',
  tel: '02.2088.5084',
  fax: '02.2088.5184',
  copyright: 'Ⓒ 2026. Insplanet all right reserved.',
} as const;

export type NavItem = { href: string; label: string; badge?: string };

export const MENU_NAV: NavItem[] = [
  { href: '/projects', label: 'Projects', badge: '42' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export const MENU_PRODUCTS = [
  { name: 'RoAI', desc: '로아는 김은경님 부자만들어줄 AI입니다. 일껄요. 이어야해요.' },
  { name: 'Inspick', desc: '인스픽도 김은경님 부자만들어줄 AI입니다. 일껄요. 이어야해요.' },
  { name: 'Archy', desc: '아키도 김은경님 부자만들어줄 AI입니다. 일껄요. 이어야해요.' },
] as const;

export const FOOTER_LINKS = ['ROAI', 'Inspick', 'Archy'] as const;

/* Single source of truth for the admin tab bar. Order here = order on screen. */

export type AdminTab = {
  href: string;
  /** main label in the tab bar */
  label: string;
  /** small pill after the label (포트폴리오 종료 / 진행) */
  sub?: string;
  /** page-head eyebrow */
  eyebrow: string;
  /** full page title */
  title: string;
  /** one-line page description */
  desc: string;
};

export const ADMIN_TABS: AdminTab[] = [
  {
    href: '/admin/portfolio/completed',
    label: '포트폴리오',
    sub: '종료',
    eyebrow: 'Portfolio · Completed',
    title: '포트폴리오 (종료)',
    desc: '종료된 프로젝트 카드입니다. 프로젝트 페이지의 카드 그리드에 노출됩니다.',
  },
  {
    href: '/admin/portfolio/ongoing',
    label: '포트폴리오',
    sub: '진행',
    eyebrow: 'Portfolio · Ongoing',
    title: '포트폴리오 (진행)',
    desc: '진행 중인 프로젝트입니다. 프로젝트 페이지 하단의 Ongoing 테이블에 노출됩니다.',
  },
  {
    href: '/admin/quotes',
    label: '견적문의관리',
    eyebrow: 'Inquiries',
    title: '견적문의관리',
    desc: 'Contact 페이지에서 접수된 견적 문의입니다. 진행 상태를 변경할 수 있습니다.',
  },
  {
    href: '/admin/recruit',
    label: '리크루트관리',
    eyebrow: 'Recruit',
    title: '리크루트관리',
    desc: 'Join us 모달로 접수된 지원서입니다. 포트폴리오 파일과 지원 직군을 확인합니다.',
  },
  {
    href: '/admin/users',
    label: '사용자관리',
    eyebrow: 'Users',
    title: '사용자관리',
    desc: '어드민에 접근할 수 있는 계정 목록입니다.',
  },
];

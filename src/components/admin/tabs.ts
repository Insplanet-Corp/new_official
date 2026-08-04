/* Single source of truth for the admin tab bar. Order here = order on screen.
   순서와 메뉴 구성은 기획서(관리자시스템_화면설계서) 3p 메뉴구조를 따른다. */

export type AdminTab = {
  href: string;
  /** main label in the tab bar */
  label: string;
  /** small pill after the label */
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
    href: '/admin/main',
    label: '메인관리',
    eyebrow: 'Main',
    title: '메인관리',
    desc: '홈페이지 메인에 노출할 포트폴리오를 관리합니다. 사용여부 Y 중 가장 최근 등록 건이 노출됩니다.',
  },
  {
    href: '/admin/portfolio',
    label: '포트폴리오관리',
    eyebrow: 'Portfolio',
    title: '포트폴리오관리',
    desc: '진행 중 · 종료된 프로젝트를 관리합니다. 분류 · 진행 상태 · 사용여부로 걸러 볼 수 있습니다.',
  },
  {
    href: '/admin/quotes',
    label: '견적문의관리',
    eyebrow: 'Inquiries',
    title: '견적문의관리',
    desc: 'Contact 페이지에서 접수된 견적 문의입니다. 기업명 · 신청인으로 조회합니다.',
  },
  {
    href: '/admin/recruit',
    label: '리크루트관리',
    eyebrow: 'Recruit',
    title: '리크루트관리',
    desc: 'Join us 화면으로 접수된 지원서입니다. 지원분야 · 기술등급 · 경력으로 조회합니다.',
  },
  {
    href: '/admin/users',
    label: '사용자관리',
    eyebrow: 'Users',
    title: '사용자관리',
    desc: '어드민에 접근할 수 있는 계정과 메뉴 권한을 관리합니다.',
  },
];

/* 메뉴권한 체크박스에 쓰는 목록 (사용자관리 등록/수정) */
export const MENU_PERMISSIONS = ADMIN_TABS.map((t) => ({ value: t.href, label: t.label }));

/* 경로가 속한 탭을 찾는다. 하위 경로도 그 탭의 것으로 친다 —
   /admin/users/new · /admin/users/:id/edit 는 모두 '/admin/users' 권한으로 판정한다.
   어느 탭에도 속하지 않으면 undefined (권한 판정 대상이 아니다). */
export const tabForPath = (pathname: string): AdminTab | undefined =>
  ADMIN_TABS.find(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  );

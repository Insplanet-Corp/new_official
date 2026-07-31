/* Projects page content.
   DUMMY data, exactly as in the static build: the publisher replaces this with the DB-driven,
   newest-first list — each card only needs a category + the same shape. */

export type Category = 'all' | 'web' | 'mobile' | 'consulting';

export const CATEGORIES: { filter: Category; label: string }[] = [
  { filter: 'all', label: 'All' },
  { filter: 'web', label: 'Web' },
  { filter: 'mobile', label: 'Mobile' },
  { filter: 'consulting', label: 'Consulting' },
];

const IMGS = [
  'proj-01', 'proj-02', 'proj-03', 'proj-04', 'proj-05', 'proj-06',
  'proj-07', 'proj-08', 'proj-09', 'proj-10', 'proj-11',
];

type PoolItem = { name: [string, string]; cat: 'Mobile' | 'Web' | 'Consulting' };

const POOL: PoolItem[] = [
  { name: ['신한 SoL증권', '모바일 웹 리뉴얼'], cat: 'Mobile' },
  { name: ['모바일 뱅킹 앱', 'UX 리뉴얼'], cat: 'Mobile' },
  { name: ['핀테크 간편결제', '서비스'], cat: 'Mobile' },
  { name: ['모빌리티 예약', '플랫폼'], cat: 'Mobile' },
  { name: ['O2O 서비스', '모바일 리뉴얼'], cat: 'Mobile' },
  { name: ['글로벌 이커머스', '브랜드몰 구축'], cat: 'Web' },
  { name: ['기업 브랜드', '사이트 구축'], cat: 'Web' },
  { name: ['라이프스타일', '커머스 플랫폼'], cat: 'Web' },
  { name: ['미디어 콘텐츠', '포털 리뉴얼'], cat: 'Web' },
  { name: ['교육 콘텐츠', 'LMS 구축'], cat: 'Web' },
  { name: ['AI 추천 커머스', '플랫폼 컨설팅'], cat: 'Consulting' },
  { name: ['물류 관리 시스템', '컨설팅'], cat: 'Consulting' },
  { name: ['헬스케어 데이터', '대시보드'], cat: 'Consulting' },
  { name: ['금융 데이터', '분석 플랫폼'], cat: 'Consulting' },
  { name: ['디지털 트랜스포메이션', '전략 컨설팅'], cat: 'Consulting' },
];

export type ProjectCard = {
  id: number;
  image: string;
  name: [string, string];
  cat: PoolItem['cat'];
  category: Exclude<Category, 'all'>;
  award: boolean;
};

/* 40 cards, randomly distributed with a Park-Miller seeded RNG so the layout is identical on the
   server and on every reload (the static build did this in an inline script). */
function buildCards(): ProjectCard[] {
  let s = 234567;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const cards: ProjectCard[] = [];
  for (let i = 0; i < 40; i++) {
    const img = IMGS[(rnd() * IMGS.length) | 0];
    const p = POOL[(rnd() * POOL.length) | 0];
    const award = rnd() < 0.22;
    cards.push({
      id: i,
      image: `/assets/projects/${img}.png`,
      name: p.name,
      cat: p.cat,
      category: p.cat.toLowerCase() as Exclude<Category, 'all'>,
      award,
    });
  }
  return cards;
}

export const PROJECT_CARDS = buildCards();

export type OngoingRow = {
  client: string;
  logo: string;
  project: string;
  category: string;
  period: string;
};

export const ONGOING_ROWS: OngoingRow[] = [
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: 'KB 직원용 단말화면 개선', category: 'Etc.', period: '2026.07.01~2027.07.01' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: 'KB스타뱅킹 앱 UX 고도화', category: 'Mobile', period: '2026.05.01~2026.12.31' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: '차세대 여신 시스템 구축', category: 'Consulting', period: '2026.03.15~2027.09.30' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: '통합 고객 포털 리뉴얼', category: 'Web', period: '2026.08.01~2027.02.28' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: 'AI 상담 챗봇 도입', category: 'Etc.', period: '2026.06.01~2027.06.01' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: '마이데이터 서비스 구축', category: 'Web', period: '2026.04.01~2026.11.30' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: 'KB증권 MTS 개선', category: 'Mobile', period: '2026.09.01~2027.03.31' },
  { client: 'KB국민은행', logo: '/assets/projects/table-logo.png', project: '임직원 교육 LMS 구축', category: 'Web', period: '2026.07.15~2027.07.15' },
];

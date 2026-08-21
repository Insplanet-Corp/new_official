/* Content for the main page (and reused by the mobile page). */

export type Service = {
  title: string;
  tags: string[];
  /** desktop copy, split at the manual <br> */
  desc: string[];
  /** mobile copy: same sentence, no manual break */
  descMobile: string;
  image: string;
  alt: string;
  /** mobile card title (a couple are shortened to fit 375) */
  titleMobile?: string;
};

const SERVICE_TAGS = ['UI/UX Design', 'Platform Operation', 'Service Renewal', 'QA & Publishing'];
const SERVICE_TAGS2 = ['UX Consulting', 'Service Strategy', 'UX Research', 'Information Architecture'];
const SERVICE_TAGS3 = ['SI Collaboration', 'Agile Delivery', 'System Integration', 'Project Management'];
const SERVICE_TAGS4 = ['Design System', 'AX Solution', 'Front-end Dev', 'R&D'];

export const SERVICES: Service[] = [
  {
    title: 'Mega Finance DNA',
    tags: SERVICE_TAGS,
    desc: [
      '신한 ‘슈퍼SOL’ 6년 전담 운영을 비롯해 KB·IBK·우리카드 등 제1금융권 핵심 플랫폼의 혁신을 주도해왔습니다. 가장 엄격한 금융의 기준 위에서 쌓아온 경험이, 어떤 프로젝트에서도 흔들리지 않는 완성도의 근거가 됩니다.',
    ],
    descMobile: '신한 ‘슈퍼SOL’ 6년 전담 운영을 비롯해 KB·IBK·우리카드 등 제1금융권 핵심 플랫폼의 혁신을 주도해왔습니다. 가장 엄격한 금융의 기준 위에서 쌓아온 경험이, 어떤 프로젝트에서도 흔들리지 않는 완성도의 근거가 됩니다.',
    image: '/images/service-mega-finance.png',
    alt: 'Mega Finance DNA',
  },
  {
    title: 'Cross-Industry Insight',
    tags: SERVICE_TAGS2,
    desc: ['금융의 정밀함부터 공공의 신뢰, 항공과 유통의 속도, 엔터프라이즈의 복잡함까지 — 산업마다 다른 본질을 이해하는 것에서 출발합니다. 경계를 넘어 축적한 인사이트로 어떤 비즈니스에도 최적의 답을 제시합니다.'],
    descMobile: '금융의 정밀함부터 공공의 신뢰, 항공과 유통의 속도, 엔터프라이즈의 복잡함까지 — 산업마다 다른 본질을 이해하는 것에서 출발합니다. 경계를 넘어 축적한 인사이트로 어떤 비즈니스에도 최적의 답을 제시합니다.',
    image: '/images/service-cross-industry.png',
    alt: 'Cross-Industry Insight',
  },
  {
    title: 'SI Synergy & Partnership',
    tags: SERVICE_TAGS3,
    desc: [
      'LG CNS, 신한DS의 공식 협력사로서 대형 SI 프로젝트의 복잡한 협업 구조를 누구보다 잘 이해합니다. 주사업자와의 완벽한 시너지로 일정과 품질을 지키며, 규모가 큰 프로젝트일수록 인스플래닛의 진가가 드러납니다.',
    ],
    descMobile: 'LG CNS, 신한DS의 공식 협력사로서 대형 SI 프로젝트의 복잡한 협업 구조를 누구보다 잘 이해합니다. 주사업자와의 완벽한 시너지로 일정과 품질을 지키며, 규모가 큰 프로젝트일수록 인스플래닛의 진가가 드러납니다.',
    image: '/images/service-si-synergy.png',
    alt: 'SI Synergy & Partnership',
  },
  {
    title: 'AX Tech & Design System',
    titleMobile: 'AX Tech & Design Sys.',
    tags: SERVICE_TAGS4,
    desc: [
      '고유 디자인 시스템으로 일관된 품질을, 자체 AX 솔루션 R&D로 압도적인 생산성을 만듭니다. 기술과 디자인이 서로를 가속하는 구조가 프로젝트의 속도와 완성도를 동시에 끌어올립니다.',
    ],
    descMobile: '고유 디자인 시스템으로 일관된 품질을, 자체 AX 솔루션 R&D로 압도적인 생산성을 만듭니다. 기술과 디자인이 서로를 가속하는 구조가 프로젝트의 속도와 완성도를 동시에 끌어올립니다.',
    image: '/images/service-ax-tech.png',
    alt: 'AX Tech & Design System',
  },
];

/** Partner logos. --lw/--lh are the Figma intrinsic sizes the grid scales from. */
export type PartnerLogo = { src: string; lw: number; lh: number };

export const PARTNERS: PartnerLogo[] = [
  { src: '/images/partners/partner-01.png', lw: 96, lh: 24 },
  { src: '/images/partners/partner-02.png', lw: 92, lh: 24 },
  { src: '/images/partners/partner-03.png', lw: 137, lh: 24 },
  { src: '/images/partners/partner-04.png', lw: 156, lh: 24 },
  { src: '/images/partners/partner-05.png', lw: 50, lh: 16 },
  { src: '/images/partners/partner-06.png', lw: 134, lh: 24 },
  { src: '/images/partners/partner-07.png', lw: 102, lh: 24 },
  { src: '/images/partners/partner-08.png', lw: 111, lh: 24 },
  { src: '/images/partners/partner-09.png', lw: 63, lh: 24 },
  { src: '/images/partners/partner-10.png', lw: 117, lh: 30 },
  { src: '/images/partners/partner-11.png', lw: 66, lh: 24 },
  { src: '/images/partners/partner-12.png', lw: 105, lh: 24 },
  { src: '/images/partners/partner-13.png', lw: 31, lh: 24 },
  { src: '/images/partners/partner-14.png', lw: 74, lh: 24 },
  { src: '/images/partners/partner-15.png', lw: 109, lh: 20 },
  { src: '/images/partners/partner-16.png', lw: 71, lh: 24 },
  { src: '/images/partners/partner-17.png', lw: 139, lh: 20 },
  { src: '/images/partners/partner-18.png', lw: 63, lh: 18 },
  { src: '/images/partners/partner-19.png', lw: 62, lh: 24 },
  { src: '/images/partners/partner-20.png', lw: 67, lh: 32 },
  { src: '/images/partners/partner-21.png', lw: 106, lh: 32 },
  { src: '/images/partners/partner-22.png', lw: 80, lh: 24 },
  { src: '/images/partners/partner-23.png', lw: 49, lh: 36 },
  { src: '/images/partners/partner-24.png', lw: 113, lh: 30 },
];

export const PARTNERS_DESC = [
  '고객이 지향하는 브랜드 철학의 본질을 심도 있게 분석하여 최선의 결과물을 만들어냅니다.',
  '브랜드의 메시지가 사용자에게 가장 친밀하게 전달되고 사람들의 마음속에 깊은 영감으로 남을 수 있도록, 보이지 않는 디테일까지 끊임없이 고민합니다.',
];

/** The three cross-fading slides of the "Our Projects" showcase. */
export const SHOWCASE = [
  {
    name: ['신한 SoL증권', '모바일 웹 리뉴얼 1'],
    client: '신한투자증권',
    launch: 'Jan, 2024',
    image: '/images/projects/dm1.png',
    background: '#1D53F1',
  },
  {
    name: ['신한 SoL증권', '모바일 웹 리뉴얼 2'],
    client: '신한투자증권',
    launch: 'Feb, 2024',
    image: '/images/projects/dm2.png',
    background: '#E5392F',
  },
  {
    name: ['신한 SoL증권', '모바일 웹 리뉴얼 3'],
    client: '신한투자증권',
    launch: 'Mar, 2024',
    image: '/images/projects/dm3.png',
    background: '#F5B400',
  },
] as const;

/** The 3 pinned Insight steps (shared by the desktop and mobile chapters). */
export const INSIGHT_STEPS = [
  {
    eyebrow: 'Insight',
    title: ['비즈니스의', '본질을 읽고,', '더 깊은 아이디어를', '제안합니다.'],
    num: '/assets/insight-num-01.svg',
    numAlt: '01',
  },
  {
    eyebrow: 'Interest',
    title: ['끊임없는', '트렌드 탐구를 통해', '남다른 사용자 경험을', '설계합니다.'],
    num: '/assets/insight-num-02.svg',
    numAlt: '02',
  },
  {
    eyebrow: 'Innovation',
    title: ['검증된', '프로젝트 노하우로', '완벽한 디지털 전환을', '실현합니다.'],
    num: '/assets/insight-num-03.svg',
    numAlt: '03',
  },
] as const;

export const INSIGHT_TAGLINE = '새롭고 독창적인 탐색, 인스플래닛은 경험을 만들어 갑니다.';

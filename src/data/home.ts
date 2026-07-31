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

const SERVICE_TAGS = ['UI/UX Design', 'Online Promotion', 'SNS Event', 'Total Campaign'];

export const SERVICES: Service[] = [
  {
    title: 'Mega Finance',
    tags: SERVICE_TAGS,
    desc: [
      '신한 ‘슈퍼SOL’ 6년 전담 운영 및 차세대 통합 기획 등',
      '제1금융권 핵심 플랫폼의 혁신을 주도해왔습니다.',
    ],
    descMobile: '신한 ‘슈퍼SOL’ 6년 전담 운영 및 차세대 통합 기획 등 제1금융권 핵심 플랫폼의 혁신을 주도해왔습니다.',
    image: '/images/service-mega-finance.png',
    alt: 'Mega Finance',
  },
  {
    title: 'Mobility & Enterprise',
    tags: SERVICE_TAGS,
    desc: ['대규모 모빌리티 플랫폼 구축 및 기술 시각화 노하우로', '차세대 비즈니스를 지원합니다.'],
    descMobile: '대규모 모빌리티 플랫폼 구축 및 기술 시각화 노하우로 차세대 비즈니스를 지원합니다.',
    image: '/images/service-mobility.png',
    alt: 'Mobility & Enterprise',
  },
  {
    title: 'SI Synergy & Partnership',
    tags: SERVICE_TAGS,
    desc: [
      'LG CNS, 신한DS의 공식 협력사로서 대형 SI 주사업자와의',
      '완벽한 시너지로 프로젝트의 성공을 이끕니다.',
    ],
    descMobile: 'LG CNS, 신한DS의 공식 협력사로서 대형 SI 주사업자와의 완벽한 시너지로 프로젝트의 성공을 이끕니다.',
    image: '/images/service-si-synergy.png',
    alt: 'SI Synergy & Partnership',
  },
  {
    title: 'AX Tech & Design System',
    titleMobile: 'AX Tech & Design Sys.',
    tags: SERVICE_TAGS,
    desc: [
      '고유 디자인 시스템과 자체 AX 솔루션 R&D를 통해',
      '프로젝트 생산성과 기술 경쟁력을 극대화합니다.',
    ],
    descMobile: '고유 디자인 시스템과 자체 AX 솔루션 R&D를 통해 프로젝트 생산성과 기술 경쟁력을 극대화합니다.',
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

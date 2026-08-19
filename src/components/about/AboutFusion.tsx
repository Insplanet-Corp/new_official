import AboutGallery from '@/components/about/AboutGallery';
import Lines from '@/components/Lines';

/* 04 Experience — Cormorant headline, bold statement, 4 capability cards, then the auto-marquee
   photo band as the section's LAST child (no separate section / top padding for the band).

   The band used to be its own <section class="about-gallery"> below this one; it now sits inside
   .about-fusion, so AboutGallery is rendered from here and NOT from the page. */
const CORE_VALUES = [
  {
    icon: 'icon-mega-finance',
    title: 'Mega Finance DNA',
    desc: [
      '신한 ‘슈퍼SOL’ 6년 전담 운영을 비롯해 KB·IBK·우리카드 등',
      '핵심 플랫폼의 혁신을 주도해온 검증된 전문성을 갖췄습니다.',
    ],
  },
  {
    icon: 'icon-cross-industry',
    title: 'Cross-Industry Insight',
    desc: [
      '금융, 공공, 항공, 유통, 엔터프라이즈까지 산업의 경계를 넘어 축적한 경험으로 어떤 비즈니스에도 최적의 답을 제시합니다.',
    ],
  },
  {
    icon: 'icon-si-synergy',
    title: 'SI Synergy & Partnership',
    desc: [
      'LG CNS, 신한DS의 공식 협력사로서 대형 SI 주사업자와의',
      '완벽한 시너지로 프로젝트의 성공을 이끕니다.',
    ],
  },
  {
    icon: 'icon-ax-tech',
    title: 'AX Tech & Design System',
    desc: [
      '고유 디자인 시스템과 자체 AX 솔루션 R&D를 통해',
      '프로젝트 생산성과 기술 경쟁력을 극대화합니다.',
    ],
  },
];

export default function AboutFusion() {
  return (
    <section className="about-fusion">
      <div className="about-inner">
        <h2 className="about-fusion-title">Experience</h2>
        <p className="about-headline about-exp-copy">
          산업의 본질을 꿰뚫는 인사이트에
          <br />
          디자인의 정교함을 더해,
          <br />
          세상에 없던 경험을 연결합니다.
        </p>

        <ul className="core-values">
          {CORE_VALUES.map((value) => (
            <li className="core-value" key={value.title}>
              <span className="core-value-icon">
                <img src={`/assets/about/${value.icon}.svg`} alt="" aria-hidden="true" />
              </span>
              <h3 className="core-value-title">{value.title}</h3>
              <p className="core-value-desc">
                <Lines text={value.desc} />
              </p>
            </li>
          ))}
        </ul>
      </div>

      <AboutGallery />
    </section>
  );
}

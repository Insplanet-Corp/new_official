import Lines from '@/components/Lines';

/* 04 finance × mobility fusion + core values list. */
const CORE_VALUES = [
  {
    title: 'Mega Finance DNA',
    desc: [
      '신한 ‘슈퍼SOL’ 6년 전담 운영 및 차세대 통합 기획 등',
      '제1금융권 핵심 플랫폼의 혁신을 주도해왔습니다.',
    ],
  },
  {
    title: 'SI Synergy & Partnership',
    desc: [
      'LG CNS, 신한DS의 공식 협력사로서 대형 SI 주사업자와의',
      '완벽한 시너지로 프로젝트의 성공을 이끕니다.',
    ],
  },
  {
    title: 'Mobility & Enterprise Insight',
    desc: ['대규모 모빌리티 플랫폼 구축 및 기술 시각화 노하우로', '차세대 비즈니스를 지원합니다.'],
  },
  {
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
        <header className="about-fusion-head">
          {/* 3 lines @1920, 2 @2560 (br-1920 hidden there) */}
          <h2 className="about-headline">
            정교한 금융의 깊이에 <br className="br-1920" />
            모빌리티의 확장성을 더해,
            <br />
            세상에 없던 가치를 연결합니다.
          </h2>
          {/* 234x114 art, <1472px */}
          <img
            className="about-fusion-graphic about-fusion-graphic--1024"
            src="/assets/about/finance-graphic-1024.svg"
            alt=""
            aria-hidden="true"
          />
          {/* 312x252 art, >=1472px */}
          <img
            className="about-fusion-graphic about-fusion-graphic--desk"
            src="/assets/about/finance-graphic-2560.svg"
            alt=""
            aria-hidden="true"
          />
          <p className="about-paragraph">
            우리는 숫자 속에 담긴 금융의 본질을 꿰뚫고, 대규모 모빌리티 플랫폼이 지닌
            <br />
            무한한 연결성을 탐구합니다. 단순히 두 산업을 결합하는 기술력을 넘어, 그 접점에서 피어나는
            <br />
            새로운 비즈니스 가능성을 발견하고 이를 고객의 실질적인 가치로 증명해 나갑니다.
          </p>
        </header>

        <ul className="core-values">
          {CORE_VALUES.map((value) => (
            <li className="core-value" key={value.title}>
              <div className="core-value-head">
                <span className="core-value-icon">
                  <img src="/assets/about/corevalue-icon-66bec6.png" alt="" aria-hidden="true" />
                </span>
                <h3 className="core-value-title">{value.title}</h3>
              </div>
              <p className="core-value-desc">
                <Lines text={value.desc} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

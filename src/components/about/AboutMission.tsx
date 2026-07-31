/* 03 mission & vision + the three I's (Insight / Interest / Innovation).
   .br-desk / .br-1024 are the breakpoint-specific line breaks from the Figma frames. */
export default function AboutMission() {
  return (
    <section className="about-mission">
      <div className="about-inner">
        <header className="about-mission-head">
          <p className="about-eyebrow-serif">Mission &amp; Vision</p>
          <h2 className="about-headline">
            기술에 가치를 더해,
            <br />
            내일의 설렘을 완성합니다.
          </h2>
          <p className="about-paragraph">
            우리는 차가운 기술 그 자체가 아닌, 그 기술이 비즈니스와 일상에서 만들어낼
            <br />
            본질적인 가치에 집중합니다. 정교한 분석과 끊임없는 고민으로 기술에 생명력을 불어넣고,
            <br />
            고객이 꿈꿔온 미래를 가장 기분 좋은 설렘으로 마주할 수 있도록 완벽한 디지털 경험을
            설계합니다.
          </p>
        </header>

        <ul className="value-cards">
          <li className="value-card">
            <span className="value-pill">Insight</span>
            <h3 className="value-card-title">데이터 너머의 본질을 봅니다.</h3>
            <p className="value-card-body">
              단순히 현상을 관찰하는 것에 그치지 않고,
              <br />
              깊이 있는 분석을 통해 비즈니스가 나아가야 할
              <br />
              숨겨진 가치와 정답을 찾아냅니다.
            </p>
          </li>
          <li className="value-arrow" aria-hidden="true">
            <img src="/assets/about/value-arrow.svg" alt="" />
          </li>
          <li className="value-card">
            <span className="value-pill">Interest</span>
            <h3 className="value-card-title">사람을 향한 호기심에서 시작합니다.</h3>
            {/* 1024 breaks "모두가" onto line 2 (Figma official_03_about_1024) */}
            <p className="value-card-body">
              기술이 일상에 자연스럽게 스며들 수 있도록
              <br />
              사용자의 작은 목소리에도 귀를 기울이며, <br className="br-desk" />
              모두가 <br className="br-1024" />
              즐겁게 누릴 수 있는 최적의 경험을 탐구합니다.
            </p>
          </li>
          <li className="value-arrow" aria-hidden="true">
            <img src="/assets/about/value-arrow.svg" alt="" />
          </li>
          <li className="value-card">
            <span className="value-pill">Innovation</span>
            <h3 className="value-card-title">당연함을 의심하며 내일을 앞당깁니다.</h3>
            {/* 1024 breaks "상상이" onto line 2 (Figma official_03_about_1024) */}
            <p className="value-card-body">
              익숙한 방식에 안주하지 않고
              <br />
              가장 진보된 기술을 유연하게 도입하여, <br className="br-desk" />
              상상이 <br className="br-1024" />
              현실이 되는 새로운 디지털 기준을 세워갑니다.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

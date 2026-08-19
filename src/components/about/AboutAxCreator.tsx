/* 06 Beyond UX / The AX Creator + key stats.
   Line breaks differ between the 1024 and 1920+ frames: .br-1024 shows below 1472px, .br-desk above. */
export default function AboutAxCreator() {
  return (
    <section className="about-axcreator" data-rv>
      <div className="about-inner about-axcreator-grid">
        <h2 className="about-display">
          <span className="line-1">Beyond UX</span>
          <span className="line-2">The AX Creator</span>
        </h2>

        {/* right column (698 wide, Figma frame 1216117569): copy, then the stats, 160 apart */}
        <div className="about-axcreator-right">
          <div className="about-axcreator-copy">
            <p className="about-lead">
              단순한 경험의 개선을 넘어, 기술이 스스로 <br className="br-1024" />
              가치를 창출하는 시대를 엽니다.
            </p>
            <p className="about-paragraph">
              우리는 기존의 사용자 경험(UX)이라는 틀에 안주하지 않습니다.
              <br />
              인스플래닛의 사고방식은 고도화된 AI 기술을 비즈니스 본질에 이식하여,{' '}
              <br className="br-1024" />
              스스로 진화하고 <br className="br-desk" />
              최적의 해답을 제시하는 AX(AI Experience)를 <br className="br-1024" />
              설계하는 데 있습니다.
            </p>
            <p className="about-paragraph">
              우리는 고객의 요청을 구현하는 것에 그치지 않고,
              <br />
              데이터 너머의 맥락을 읽어내어 비즈니스의 다음 차원을 창조합니다.
            </p>
          </div>

          <dl className="about-stats" data-rv>
            <div className="about-stat">
              <dt className="about-stat-label">Projects done</dt>
              <dd className="about-stat-num">
                <img src="/assets/about/stat-projects.svg" alt="100+" />
              </dd>
            </div>
            <div className="about-stats-row">
              <div className="about-stat">
                <dt className="about-stat-label">Years of experience</dt>
                <dd className="about-stat-num">
                  <img src="/assets/about/stat-years.svg" alt="8+" />
                </dd>
              </div>
              <div className="about-stat">
                <dt className="about-stat-label">Team members</dt>
                <dd className="about-stat-num">
                  <img src="/assets/about/stat-team.svg" alt="30+" />
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

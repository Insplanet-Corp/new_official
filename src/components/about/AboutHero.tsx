/* 01 hero — PINNED EXPANSION: symbol + "Who / We Are" + intro, with the black-hole card resting
   as a wide strip at the bottom. Scrolling scrubs the card up & out until it covers the viewport
   (text flips light), reverse on scroll-up. Geometry driven by public/js/about-hero.js, the card
   itself rendered by public/js/about-blackhole.js. */
export default function AboutHero() {
  return (
    <section className="about-hero">
      <div className="about-hero-pin">
        <div className="about-inner about-hero-inner">
          <img className="about-hero-symbol" src="/assets/symbol.svg" alt="" aria-hidden="true" />
          <h1 className="about-hero-title">
            <span className="line-1">Who</span>
            <span className="line-2">
              We Are
              <i className="about-hero-dot" aria-hidden="true" />
            </span>
          </h1>
          <div className="about-hero-intro">
            <p className="about-hero-lead">새롭고 독창적인 탐색, 인스플래닛은 경험을 만들어 갑니다.</p>
            <p className="about-hero-body">
              인스플래닛은 고객이 생각하는 그 이상을 연구하고 고민합니다.
              <br />
              고객의 가치실현을 위한 신뢰할 수 있는 파트너로 함께 성장하고 있습니다.
            </p>
          </div>
        </div>
        {/* the live WebGL black-hole card */}
        <div className="about-banner">
          <canvas id="about-blackhole" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

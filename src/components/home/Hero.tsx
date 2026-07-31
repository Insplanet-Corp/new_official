/* Hero stage: WebGL blob (public/js/blob.js draws into #blob) + the intro copy.
   #head-title / #sub-title get `.in` from main.js once the webfonts are ready (blur reveal),
   and the whole stack is parallaxed on scroll by main.js. */
export default function Hero() {
  return (
    <div id="stage">
      <canvas id="blob" width={1920} height={1080} />

      <div className="content">
        <div id="left-block">
          <img id="symbol" src="/assets/symbol.svg" alt="" />

          <div id="head-title">
            <span className="line-1">We Are</span>
            <span className="line-2">Insplanet</span>
          </div>

          <div id="sub-title">
            <span className="subtitle-head">호기심이 가득한 오늘, 무한한 가능성의 내일.</span>
            <span className="subtitle-body">
              인스플래닛은 조금 더 즐겁고 진화된
              <br className="sb-br-m" /> 디지털 경험을 만들기 위해 새로움을 고민합니다.
              <br className="sb-br-d" />
              <span className="sb-rest">
                본질에 대한 이해와 넓은 시야로 누구나 공감할 수 있는 가치를 만듭니다.
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

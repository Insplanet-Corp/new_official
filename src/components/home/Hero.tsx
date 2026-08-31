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

          {/* ⚠️ h1 이다 — 홈에 h1 이 하나도 없어서 바꿨다(2026-08-26).
              레거시 main.js 는 이 요소를 getElementById 로만 잡으므로(3곳) 태그가
              바뀌어도 무관하고, CSS 도 전부 #head-title 선택자다. UA 기본 스타일은
              style.css 의 `* { margin:0; padding:0 }` 과 #head-title 의
              font-size/weight/family 가 이미 전부 덮는다. */}
          <h1 id="head-title">
            <span className="line-1">We Are</span>
            <span className="line-2">Insplanet</span>
          </h1>

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

/* Chapter 07: "Say Hello!" contact CTA. Black screen with a purple horizon glow at the bottom
   (public/js/cta-glow.js renders into .cta-glow); centred big title + a row beneath. */
export default function ContactCta() {
  return (
    <section className="contact-cta">
      {/* ⚠️ 이 캔버스는 사이트에 **하나뿐**이어야 한다 — cta-glow.js 가 querySelector 로
          첫 번째만 잡아 WebGL 컨텍스트를 만든다. 모바일 CTA(.m-cta)도 같은 글로우를 쓰지만
          노드를 따로 두지 않고, ResponsiveSlot(app/page.tsx)이 폭에 따라 이 노드를 옮긴다. */}
      <canvas id="cta-glow" className="cta-glow" aria-hidden="true" />
      <div className="cta-inner">
        <h2 className="cta-title">Say Hello!</h2>
        <div className="cta-row">
          <p className="cta-sub">우리와 어떤 프로젝트를 함께 하고 싶으세요?</p>
          <a className="cta-arrow" href="/contact" aria-label="Contact us">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12h15M13 6l6 6-6 6"
                stroke="#3E3F44"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

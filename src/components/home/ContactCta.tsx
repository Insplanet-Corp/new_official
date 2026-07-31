/* Chapter 07: "Say Hello!" contact CTA. Black screen with a purple horizon glow at the bottom
   (public/js/cta-glow.js renders into .cta-glow); centred big title + a row beneath. */
export default function ContactCta() {
  return (
    <section className="contact-cta">
      <canvas className="cta-glow" aria-hidden="true" />
      <div className="cta-inner">
        <h2 className="cta-title">Say Hello!</h2>
        <div className="cta-row">
          <p className="cta-sub">우리와 어떤 프로젝트를 함께 하고 싶으세요?</p>
          <a className="cta-arrow" href="#" aria-label="Contact us">
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

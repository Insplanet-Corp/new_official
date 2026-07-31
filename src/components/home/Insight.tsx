import Lines from '@/components/Lines';
import { INSIGHT_STEPS, INSIGHT_TAGLINE } from '@/data/home';

// Phrase repeated so the peeking edges never reveal a gap as the marquee drifts.
const TAGLINE = Array.from({ length: 3 }, () => INSIGHT_TAGLINE).join('\u00A0\u00A0');

/* Chapter 03: "Insight" — pinned glass card. Scrolling through the pin swaps the foreground steps
   (01 Insight, 02 Interest, 03 Innovation) over the same card, while the faint oversized tagline
   auto-scrolls (top left / bottom right). The card background is the fluted-glass shader bundle
   (public/js/insight-background.bundle.js), which self-mounts into #insight-shader. */
export default function Insight() {
  return (
    <section className="pin-insight">
      <div className="pin-insight-stage">
        <div className="insight-board">
          <span className="insight-tagline insight-tagline-1">{TAGLINE}</span>
          <span className="insight-tagline insight-tagline-2">{TAGLINE}</span>

          {/* card frame: a centered box sized per breakpoint (the mask shape). Card + steps + dots
              live inside it and track its size. */}
          <div className="insight-frame">
            <div className="insight-card">
              <div id="insight-shader" />
            </div>

            {/* foreground steps, swapped by scroll — each overlays the card at the same spot */}
            <div className="insight-steps">
              {INSIGHT_STEPS.map((step, i) => (
                <div className="insight-step" data-step={i} key={step.eyebrow}>
                  <p className="insight-eyebrow">{step.eyebrow}</p>
                  <h2 className={i === 0 ? 'insight-title' : 'insight-title insight-title--wide'}>
                    <Lines text={step.title} />
                  </h2>
                  <img
                    className={i === 0 ? 'insight-num' : `insight-num insight-num--0${i + 1}`}
                    src={step.num}
                    alt={step.numAlt}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>

            {/* step progress indicator: 3 dots right of the card, filled by main.js */}
            <div className="insight-indicator" aria-hidden="true">
              {INSIGHT_STEPS.map((step, i) => (
                <span className={i === 0 ? 'insight-dot is-active' : 'insight-dot'} key={step.eyebrow} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

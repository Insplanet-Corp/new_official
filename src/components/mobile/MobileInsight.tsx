'use client';

import { useEffect, useRef } from 'react';
import Lines from '@/components/Lines';
import { INSIGHT_STEPS } from '@/data/home';
import { bindScroll, clamp01, prefersReducedMotion } from '@/lib/dom';

/* Chapter 03 (mobile): Insight — pinned 3-step swap on the dark shader bg (Figma 1932:30194).
   While the ch.02 statement is still pinned behind, the dark frame grows from a point at the
   viewport centre (clip-path window) to full-bleed; growth ends exactly as ch.02 unpins. Text and
   dots appear only after the growth; then steps 01→02→03 swap. The header flips white while the
   dark frame actually covers it. The full-bleed #insight-shader is the desktop shader bundle,
   which self-mounts into it. */
export default function MobileInsight() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const chapter = ref.current;
    if (!chapter) return;
    const stage = chapter.querySelector<HTMLElement>('.m-insight-stage');
    const frame = chapter.querySelector<HTMLElement>('.m-insight-frame');
    const steps = [...chapter.querySelectorAll<HTMLElement>('.m-insight-step')];
    const dots = chapter.querySelector<HTMLElement>('.m-insight-dots');
    const dotEls = [...chapter.querySelectorAll<HTMLElement>('.m-insight-dots span')];
    if (!stage || !frame) return;

    const tops = ['ci-logo', 'lets-talk', 'full-menu']
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const scrollHint = document.getElementById('scroll-hint');

    if (prefersReducedMotion()) {
      frame.style.clipPath = 'none';
      steps.forEach((s, i) => {
        s.style.opacity = i === 0 ? '1' : '0';
      });
      return;
    }

    return bindScroll(() => {
      const scrub = chapter.offsetHeight - innerHeight;
      const p = scrub > 0 ? clamp01(-chapter.getBoundingClientRect().top / scrub) : 0;
      // grow: p 0→0.2, eased; window inset 50%→0 (zero-size centre → full-bleed)
      const g = clamp01(p / 0.2);
      const gs = g * g * (3 - 2 * g);
      const ins = (50 * (1 - gs)).toFixed(2);
      const rad = (24 * (1 - gs)).toFixed(1);
      frame.style.clipPath = gs >= 1 ? 'none' : `inset(${ins}% ${ins}% round ${rad}px)`;
      // text gate: nothing shows until the frame is full
      const gate = clamp01((p - 0.22) / 0.06);
      if (dots) dots.style.opacity = gate.toFixed(3);
      // steps: af 0→2 across the remaining scrub (hold at the end)
      const af = clamp01((p - 0.3) / 0.58) * 2;
      const active = Math.max(0, Math.min(2, Math.round(af)));
      dotEls.forEach((d, i) => d.classList.toggle('is-active', i === active));
      steps.forEach((s, i) => {
        const d = af - i;
        const ad = Math.abs(d);
        s.style.opacity = (gate * clamp01(1 - ad)).toFixed(3);
        s.style.filter = `blur(${(ad * 10).toFixed(2)}px)`;
        const rise = d < 0 ? -d : 0;
        s.style.transform = `translateY(${(rise * 40).toFixed(1)}px)`;
      });
      // header contrast: white only while the dark frame actually covers the zones
      const r = stage.getBoundingClientRect();
      const covered = gs >= 0.9;
      const topOn = covered && r.top <= 40 && r.bottom >= 40;
      const botOn = covered && r.top <= innerHeight - 90 && r.bottom >= innerHeight - 90;
      tops.forEach((el) => el.classList.toggle('on-dark', topOn));
      scrollHint?.classList.toggle('on-dark', botOn);
    });
  }, []);

  return (
    <section className="m-insight-pin" ref={ref}>
      <div className="m-insight-stage">
        <div className="m-insight-frame">
          <div id="insight-shader" />
        </div>
        {INSIGHT_STEPS.map((step, i) => (
          <div className="m-insight-step" key={step.eyebrow}>
            <p className="m-insight-eyebrow">{step.eyebrow}</p>
            <h2 className="m-insight-title">
              <Lines text={step.title} />
            </h2>
            <img
              className={i === 0 ? 'm-insight-num' : `m-insight-num m-insight-num--0${i + 1}`}
              src={step.num}
              alt={step.numAlt}
              aria-hidden="true"
            />
          </div>
        ))}
        <div className="m-insight-dots" aria-hidden="true">
          {INSIGHT_STEPS.map((step, i) => (
            <span className={i === 0 ? 'is-active' : undefined} key={step.eyebrow} />
          ))}
        </div>
      </div>
    </section>
  );
}

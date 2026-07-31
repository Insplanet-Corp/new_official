'use client';

import { useEffect, useRef } from 'react';
import { bindScroll, clamp01, prefersReducedMotion } from '@/lib/dom';

const setBlur = (el: HTMLElement, s: number) => {
  el.style.opacity = s.toFixed(3);
  el.style.filter = `blur(${(16 * (1 - s)).toFixed(2)}px)`;
};

/* Chapter 02 (mobile): Beyond UX — pinned swap in ONE viewport (Figma 1807:26605 / 1817:23457).
   Both texts overlap in the same centred spot inside a sticky stage; scrolling through the tall
   track scrubs Beyond out and the statement in.
   Constants = the desktop timings ×0.615 (track 260vh→360vh keeps the felt pacing; the statement
   completes by p≈0.5 then HOLDS while the Insight window grows over it). */
export default function MobileBeyond() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const chapter = ref.current;
    if (!chapter) return;
    const bLines = [
      ...chapter.querySelectorAll<HTMLElement>('.m-beyond-title .line-1,.m-beyond-title .line-2'),
    ];
    const fLines = [...chapter.querySelectorAll<HTMLElement>('.m-beyond-statement span')];

    if (prefersReducedMotion()) {
      bLines.forEach((l) => setBlur(l, 0));
      fLines.forEach((l) => setBlur(l, 1));
      return;
    }
    return bindScroll(() => {
      const scrub = chapter.offsetHeight - innerHeight;
      const p = scrub > 0 ? clamp01(-chapter.getBoundingClientRect().top / scrub) : 0;
      bLines.forEach((l, i) => {
        const o = i * 0.037;
        setBlur(l, clamp01(p < 0.203 ? (p - o) / 0.123 : 1 - (p - 0.277 - o) / 0.092));
      });
      fLines.forEach((l, i) => setBlur(l, clamp01((p - 0.381 - i * 0.037) / 0.111)));
    });
  }, []);

  return (
    <section className="m-beyond-pin" ref={ref}>
      <div className="m-beyond-stage">
        <h2 className="m-beyond-title">
          <span className="line-1">Beyond UX</span>
          <span className="line-2">The AX Creator</span>
        </h2>
        <p className="m-beyond-statement">
          <span>기술에 가치를 더해,</span>
          <span>내일의 설렘을 완성합니다.</span>
        </p>
      </div>
    </section>
  );
}

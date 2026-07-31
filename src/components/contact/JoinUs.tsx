'use client';

import { useEffect, useRef } from 'react';
import { bindScroll, clamp01, prefersReducedMotion } from '@/lib/dom';

const SIDE = 44.61; // inset each side at the slit: (2560-276)/2 / 2560

/* 03 Join Us — recruit.
   The bg image opens like doors from a centre slit (276px @2560 = 10.78%) to full, scrubbed by
   scroll as the section enters; heading/copy/button fade up once it's fully open (.joined).
   Reduced motion -> open. */
export default function JoinUs({ onOpenRecruit }: { onOpenRecruit: () => void }) {
  const secRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const sec = secRef.current;
    const bg = bgRef.current;
    if (!sec || !bg) return;
    if (prefersReducedMotion()) {
      sec.classList.add('joined');
      return;
    }
    return bindScroll(() => {
      const vh = innerHeight;
      const top = sec.getBoundingClientRect().top;
      // 0 = section top at 0.85vh (a bit in, so it opens later) -> 1 at 0.18vh
      const p = clamp01((0.85 * vh - top) / (0.67 * vh));
      const side = (SIDE * (1 - p)).toFixed(2);
      bg.style.clipPath = `inset(0 ${side}% 0 ${side}%)`;
      sec.classList.toggle('joined', p >= 1);
    });
  }, []);

  return (
    <section className="ct-join" ref={secRef}>
      <img
        className="ct-join-bg"
        src="/assets/contact/joinus-bg-3443cd.png"
        alt=""
        aria-hidden="true"
        ref={bgRef}
      />
      <div className="ct-join-inner">
        <h2 className="ct-join-title">Join Us.</h2>
        <p className="ct-join-sub">당신의 가능성이 인스플래닛의 미래가 됩니다.</p>
        <p className="ct-join-desc">
          우리는 기술과 사람 사이의 가장 완벽한 연결을 고민합니다.
          <br />
          인스플래닛이라는 무대 위에서 당신의 가치를 마음껏 증명해 보세요.
        </p>
        <a
          className="ct-join-btn"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onOpenRecruit();
          }}
        >
          <span>채용확인</span>
          <span className="ct-arrow" aria-hidden="true">
            <img src="/assets/icon_arrow.svg" alt="" />
          </span>
        </a>
      </div>
    </section>
  );
}

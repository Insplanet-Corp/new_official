'use client';

import { useEffect, useRef } from 'react';
import { bindScroll, clamp01, prefersReducedMotion } from '@/lib/dom';

const SIDE = 44.61; // inset each side at the slit: (2560-276)/2 / 2560 — same math as PC JoinUs

/* 03 Join Us — recruit (mobile-contact.html). Same door-open scrub as PC's JoinUs.tsx, ported to
   the .mc-join-* classes; heading/copy/button fade up once fully open (.joined). */
export default function MobileJoinUs({ onOpenRecruit }: { onOpenRecruit: () => void }) {
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
      const p = clamp01((0.85 * vh - top) / (0.67 * vh));
      const side = (SIDE * (1 - p)).toFixed(2);
      bg.style.clipPath = `inset(0 ${side}% 0 ${side}%)`;
      sec.classList.toggle('joined', p >= 1);
    });
  }, []);

  return (
    <section className="mc-join" ref={secRef}>
      <img
        className="mc-join-bg"
        src="/assets/contact/joinus-bg-3443cd.png"
        alt=""
        aria-hidden="true"
        ref={bgRef}
      />
      <div className="mc-join-inner">
        <h2 className="mc-join-title">Join Us.</h2>
        <p className="mc-join-sub">당신의 가능성이 인스플래닛의 미래가 됩니다.</p>
        <p className="mc-join-desc">
          우리는 기술과 사람 사이의 가장 완벽한 연결을 고민합니다. 인스플래닛이라는 무대 위에서
          당신의 가치를 마음껏 증명해 보세요.
        </p>
        <a
          className="mc-join-btn"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onOpenRecruit();
          }}
        >
          <span>채용확인</span>
          <span className="mc-arrow" aria-hidden="true">
            <img src="/assets/icon_arrow.svg" alt="" />
          </span>
        </a>
      </div>
    </section>
  );
}

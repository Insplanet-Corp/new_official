'use client';

import { useEffect, useRef } from 'react';
import { revealOnScroll } from '@/lib/dom';

/* Chapter 07 (mobile): Say Hello CTA — 검은 전체 화면 + PC 와 같은 WebGL 지평선 글로우.
   글로우는 public/js/cta-glow.js 가 canvas.cta-glow 를 찾아 그린다 (PageShell 이 지연 로드). */
export default function MobileCta() {
  const ref = useRef<HTMLElement>(null);

  // 섹션이 20% 보이면 .in — 제목/부제/화살표가 CSS 의 transition-delay 로 차례로 뜬다
  useEffect(() => (ref.current ? revealOnScroll([ref.current], 0.2) : undefined), []);

  return (
    <section className="m-cta" ref={ref}>
      <canvas className="cta-glow" aria-hidden="true" />
      <div className="m-cta-inner">
        <h2 className="m-cta-title">Say Hello!</h2>
        <p className="m-cta-sub">우리와 어떤 프로젝트를 함께 하고 싶으세요?</p>
        <a className="m-cta-arrow" href="/contact" aria-label="Contact us">
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
    </section>
  );
}

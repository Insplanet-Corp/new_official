'use client';

import { useEffect, useRef } from 'react';
import { revealOnScroll } from '@/lib/dom';

/* Chapter 07 (mobile): Say Hello CTA — 검은 전체 화면 + PC 와 같은 WebGL 지평선 글로우. */
export default function MobileCta() {
  const ref = useRef<HTMLElement>(null);

  // 섹션이 20% 보이면 .in — 제목/부제/화살표가 CSS 의 transition-delay 로 차례로 뜬다
  useEffect(() => (ref.current ? revealOnScroll([ref.current], 0.2) : undefined), []);

  return (
    <section className="m-cta" ref={ref}>
      {/* ⚠️ canvas.cta-glow 를 여기에 두지 않는다 — cta-glow.js 는 querySelector 로 **첫
          번째** 캔버스 하나만 잡는다. 두 벌을 두면 스크립트가 PC 쪽을 잡고, 폭이 좁아져
          .contact-cta 가 display:none 이 되는 순간 그 캔버스가 0×0 이 되어 글로우가 사라지고
          (여기 있는 캔버스는 렌더러가 없어 검은 배경만 남는다). 노드는 PC 쪽에 한 번만 두고
          ResponsiveSlot(app/page.tsx)이 폭에 따라 옮긴다 — #insight-shader 와 같은 방식. */}
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

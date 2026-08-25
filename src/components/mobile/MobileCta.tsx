'use client';

import { useEffect, useRef } from 'react';
import { bindScroll, revealOnScroll } from '@/lib/dom';

/* Chapter 07 (mobile): Say Hello CTA — 검은 전체 화면 + PC 와 같은 WebGL 지평선 글로우. */
export default function MobileCta() {
  const ref = useRef<HTMLElement>(null);

  // 섹션이 20% 보이면 .in — 제목/부제/화살표가 CSS 의 transition-delay 로 차례로 뜬다
  useEffect(() => (ref.current ? revealOnScroll([ref.current], 0.2) : undefined), []);

  /* 고정 헤더를 흰색으로 — 이 섹션은 통짜 #141414 라 로고·Let's Talk·햄버거가 그 위에 얹힌다.

     PC 는 main.js 의 renderAf 가 .contact-cta 를 보고 같은 일을 하는데, ≤1023 에서는
     .contact-cta 가 display:none 이라 그쪽 판정이 성립하지 않는다 — 그래서 모바일은
     여기서 직접 건다(PC/모바일이 서로의 마크업을 보지 않는 기존 관례 그대로).

     ⚠️ 화면 근처일 때만 쓴다. `.on-dark` 는 MobileInsight 등과 **같은 전역 플래그**라
        멀리 있는 챕터가 매 스크롤마다 false 를 덮으면 서로 지운다(지뢰 16번).
        ±1뷰포트 여유를 두는 것은 빠르게 튕겨 스크롤할 때 "지우는 프레임"을 건너뛰어
        흰 푸터 위에 흰 글자가 남는 것을 막기 위해서다. */
  useEffect(() => {
    const sec = ref.current;
    if (!sec) return;
    const tops = ['ci-logo', 'lets-talk', 'full-menu']
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const scrollHint = document.getElementById('scroll-hint');

    return bindScroll(() => {
      if (!sec.getClientRects().length) return; // ≥1024: 이 트리는 display:none
      const vh = innerHeight;
      const r = sec.getBoundingClientRect();
      if (r.bottom <= -vh || r.top >= vh * 2) return; // 멀리 있으면 손대지 않는다
      // 밴드 위치는 MobileInsight 와 같다 — 375 헤더는 y 16~64, SCROLL 힌트는 아래에서 24px
      tops.forEach((el) => el.classList.toggle('on-dark', r.top <= 40 && r.bottom >= 40));
      scrollHint?.classList.toggle('on-dark', r.top <= vh - 90 && r.bottom >= vh - 90);
    });
  }, []);

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

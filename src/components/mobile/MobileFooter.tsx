'use client';

import { useEffect, useRef } from 'react';
import { CONTACT } from '@/data/site';
import { FOOTER_PLANET_PATH, FOOTER_WORDMARK_PATHS } from '@/data/footerLogo';
import { revealOnScroll } from '@/lib/dom';

/* Chapter 08 (mobile): 푸터.

   ⚠️ 로고는 PC 와 같은 path 를 쓰지만 클래스가 다르다(.m-footer-ci-*).
      PC 의 .footer-wordmark/.footer-planet 을 그대로 쓰면 그쪽 스크롤 리빌 규칙이 걸려
      기본이 opacity:0 인데, 그 규칙은 PC 챕터의 .footer.in 에 매달려 있어 이 페이지에서는
      영영 켜지지 않는다 — 푸터가 통째로 안 보인다. */
export default function MobileFooter() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => (ref.current ? revealOnScroll([ref.current], 0.18) : undefined), []);

  return (
    <footer className="m-footer" ref={ref}>
      <div className="m-footer-ci">
        <svg
          className="m-footer-ci-wordmark"
          viewBox="0 0 576 179"
          fill="#3E3F44"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {FOOTER_WORDMARK_PATHS.map((d, i) => (
            <path d={d} key={i} />
          ))}
        </svg>
        <svg
          className="m-footer-ci-planet"
          viewBox="0 0 576 179"
          fill="#3E3F44"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d={FOOTER_PLANET_PATH} />
        </svg>
      </div>
      <address className="m-footer-info">
        <p>{CONTACT.address}</p>
        <p>E&nbsp;&nbsp;{CONTACT.email}</p>
        <p className="m-footer-tf">
          <span>T&nbsp;&nbsp;{CONTACT.tel}</span>
          <span>F&nbsp;&nbsp;{CONTACT.fax}</span>
        </p>
      </address>
      <p className="m-footer-copy">{CONTACT.copyright}</p>
    </footer>
  );
}

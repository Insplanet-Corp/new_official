'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { PARTNERS, PARTNERS_DESC } from '@/data/home';
import { revealOnScroll } from '@/lib/dom';

// 3-col grid: the PC logos at 0.64 scale, chunked into rows so each row can rise in as a unit
const ROWS = Array.from({ length: Math.ceil(PARTNERS.length / 3) }, (_, i) =>
  PARTNERS.slice(i * 3, i * 3 + 3),
);

/* Chapter 05 (mobile): Our Partners — 3-col logo grid (Figma 1949:30363).
   Heading/desc then the logo rows rise in as they enter (stagger via CSS delay). */
export default function MobilePartners() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const items = [
      ...(ref.current?.querySelectorAll('.m-partners-heading,.m-partners-desc,.m-partner-row') ??
        []),
    ];
    return revealOnScroll(items, 0.2);
  }, []);

  return (
    <section className="m-partners" ref={ref}>
      <h2 className="m-partners-heading">Our Partners</h2>
      <p className="m-partners-desc">{PARTNERS_DESC.join(' ')}</p>
      <div className="m-partner-grid">
        {ROWS.map((row, i) => (
          <div className="m-partner-row" key={i}>
            {row.map((logo) => (
              <span key={logo.src}>
                <img
                  src={logo.src}
                  style={{ '--lw': logo.lw, '--lh': logo.lh } as CSSProperties}
                  alt=""
                  loading="lazy"
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

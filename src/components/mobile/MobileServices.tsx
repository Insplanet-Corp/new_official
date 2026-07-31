'use client';

import { useEffect, useRef } from 'react';
import { SERVICES } from '@/data/home';
import { revealOnScroll } from '@/lib/dom';

/* Chapter 04 (mobile): Our Services — stacked cards (Figma 1944:30210).
   Banners reuse the PC images (cover-cropped). Each card rises in once as it enters the viewport. */
export default function MobileServices() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const cards = [...(ref.current?.querySelectorAll('.m-svc-card') ?? [])];
    return revealOnScroll(cards, 0.15);
  }, []);

  return (
    <section className="m-svc" ref={ref}>
      <h2 className="m-svc-heading">Our Services</h2>
      <div className="m-svc-cards">
        {SERVICES.map((svc) => (
          <article className="m-svc-card" key={svc.title}>
            <h3 className="m-svc-title">{svc.titleMobile ?? svc.title}</h3>
            <ul className="m-svc-tags">
              {svc.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <p className="m-svc-desc">{svc.descMobile}</p>
            <div className="m-svc-media">
              <img src={svc.image} alt={svc.alt} loading="lazy" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

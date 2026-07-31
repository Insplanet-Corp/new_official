import type { CSSProperties } from 'react';
import Lines from '@/components/Lines';
import { PARTNERS, PARTNERS_DESC } from '@/data/home';

/* Chapter 05: "Our Partners". Static header (big title + intro line) above a full-width 5-column
   logo grid. Pinned interaction (main.js): title+desc reveal, then on scroll the logo rows rise in
   row-by-row; once settled the pin releases and the whole section scrolls. */
export default function Partners() {
  return (
    <section className="partners">
      <div className="partners-pin">
        <div className="partners-inner">
          <h2 className="partners-title">Our Partners</h2>
          <p className="partners-desc">
            <Lines text={PARTNERS_DESC} />
          </p>
          <div className="partner-grid">
            {PARTNERS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                style={{ '--lw': logo.lw, '--lh': logo.lh } as CSSProperties}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

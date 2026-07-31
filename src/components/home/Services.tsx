import Lines from '@/components/Lines';
import { SERVICES } from '@/data/home';

/* Chapter 04: "Our Services". The big title shrinks to the small top-left label as you scroll
   (main.js), then stays fixed (sticky) while ONLY the right card column scrolls; each card rises
   in with an elastic ease. Banners are single content images. */
export default function Services() {
  return (
    <section className="services">
      <div className="services-title-wrap">
        <div className="services-inner">
          <h2 className="services-title">Our Services</h2>
        </div>
      </div>
      <div className="services-cards-wrap">
        <div className="services-inner">
          <div className="services-cards">
            {SERVICES.map((svc) => (
              <article className="svc-card" key={svc.title}>
                <h3 className="svc-title">{svc.title}</h3>
                <ul className="svc-tags">
                  {svc.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                <p className="svc-desc">
                  <Lines text={svc.desc} />
                </p>
                <div className="svc-media">
                  <img src={svc.image} alt={svc.alt} loading="lazy" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

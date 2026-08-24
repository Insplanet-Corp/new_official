import Lines from '@/components/Lines';
import type { ShowcaseItem } from '@/data/home';

/* Chapter 06: "Our Projects". The big title shrinks to the small top-left label (Services pattern),
   then a split showcase pins — left: project info, right: the visual panel. main.js drives the
   input-snapped swap through the 3 projects and samples each image to flip the header controls
   white over dark artwork. */
export default function Projects({ items }: { items: ShowcaseItem[] }) {
  return (
    <section className="projects">
      <div className="projects-pin">
        {/* starts big & centered-left, shrinks to the small top-left label on scroll */}
        <h2 className="projects-title">Our Projects</h2>

        {/* right visual panel — 3 stacked layers cross-fade as you scroll-swap projects */}
        <div className="proj-visual">
          {items.map((p, i) => (
            <div className="proj-vis" style={{ background: p.background }} key={i}>
              {/* src="" 는 현재 페이지를 다시 받아온다 — 비어 있으면 아예 그리지 않는다 */}
              {p.image ? (
                <img className="proj-img" src={p.image} alt="" loading="lazy" />
              ) : null}
            </div>
          ))}
          {/* step indicator (same as Insight): 3 dots, active fills as you swap projects */}
          <div className="proj-indicator" aria-hidden="true">
            {items.map((_, i) => (
              <span className={i === 0 ? 'proj-dot is-active' : 'proj-dot'} key={i} />
            ))}
          </div>
        </div>

        {/* left info — the 3 slides cross-fade in place; the label + See More stay put */}
        <div className="proj-info">
          {items.map((p, i) => (
            <article className="proj-slide" key={i}>
              <h3 className="proj-name">
                <Lines text={p.name} />
              </h3>
              {/* 값이 없으면 <dt>만 남아 "Client" 라벨이 덩그러니 보이므로 줄째로 뺀다 */}
              <dl className="proj-meta">
                {p.client ? (
                  <>
                    <dt>Client</dt>
                    <dd>{p.client}</dd>
                  </>
                ) : null}
                {p.launch ? (
                  <>
                    <dt>Launch</dt>
                    <dd>{p.launch}</dd>
                  </>
                ) : null}
              </dl>
            </article>
          ))}
          <a className="proj-more" href="/projects">
            <span>See More Projects</span>
            <span className="proj-more-ico">
              <img src="/assets/icon_arrow_more.svg" alt="" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

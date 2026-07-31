import Lines from '@/components/Lines';
import { SHOWCASE } from '@/data/home';

/* Chapter 06: "Our Projects". The big title shrinks to the small top-left label (Services pattern),
   then a split showcase pins — left: project info, right: the visual panel. main.js drives the
   input-snapped swap through the 3 projects and samples each image to flip the header controls
   white over dark artwork. */
export default function Projects() {
  return (
    <section className="projects">
      <div className="projects-pin">
        {/* starts big & centered-left, shrinks to the small top-left label on scroll */}
        <h2 className="projects-title">Our Projects</h2>

        {/* right visual panel — 3 stacked layers cross-fade as you scroll-swap projects */}
        <div className="proj-visual">
          {SHOWCASE.map((p) => (
            <div className="proj-vis" style={{ background: p.background }} key={p.image}>
              <img className="proj-img" src={p.image} alt="" loading="lazy" />
            </div>
          ))}
          {/* step indicator (same as Insight): 3 dots, active fills as you swap projects */}
          <div className="proj-indicator" aria-hidden="true">
            {SHOWCASE.map((p, i) => (
              <span className={i === 0 ? 'proj-dot is-active' : 'proj-dot'} key={p.image} />
            ))}
          </div>
        </div>

        {/* left info — the 3 slides cross-fade in place; the label + See More stay put */}
        <div className="proj-info">
          {SHOWCASE.map((p) => (
            <article className="proj-slide" key={p.image}>
              <h3 className="proj-name">
                <Lines text={p.name} />
              </h3>
              <dl className="proj-meta">
                <dt>Client</dt>
                <dd>{p.client}</dd>
                <dt>Launch</dt>
                <dd>{p.launch}</dd>
              </dl>
            </article>
          ))}
          {/* placeholder link, as in the static build — wired up by the publisher */}
          <a className="proj-more" href="#">
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

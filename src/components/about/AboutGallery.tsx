/* Photo band inside the Experience section (04): 4 cards + one aria-hidden duplicate set
   (8 total) so the CSS marquee loops seamlessly. Rendered by AboutFusion, not by the page. */
const PHOTOS = ['gallery-1', 'gallery-2', 'gallery-3', 'gallery-4'];

export default function AboutGallery() {
  return (
    <div className="about-gallery">
      <div className="about-gallery-track">
        {PHOTOS.map((name) => (
          <figure className="about-gallery-item" key={name}>
            <img src={`/assets/about/${name}.jpg`} alt="" decoding="async" />
          </figure>
        ))}
        {/* duplicate set — the half the loop scrolls into, never announced */}
        {PHOTOS.map((name) => (
          <figure className="about-gallery-item" aria-hidden="true" key={`dup-${name}`}>
            <img src={`/assets/about/${name}.jpg`} alt="" loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </div>
  );
}

/* 05 image gallery: three rounded portrait images (+ a 4th card that reuses the 3rd image,
   per Figma; hidden on mobile). */
export default function AboutGallery() {
  return (
    <section className="about-gallery">
      <div className="about-inner about-gallery-grid">
        {['gallery-1', 'gallery-2', 'gallery-3'].map((name) => (
          <figure className="about-gallery-item" key={name}>
            <img src={`/assets/about/${name}.jpg`} alt="" loading="lazy" decoding="async" />
          </figure>
        ))}
        <figure className="about-gallery-item about-gallery-item--extra">
          <img src="/assets/about/gallery-3.jpg" alt="" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>
  );
}

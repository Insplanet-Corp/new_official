import { CONTACT, FOOTER_LINKS } from '@/data/site';
import { FOOTER_PLANET_PATH, FOOTER_WORDMARK_PATHS } from '@/data/footerLogo';

/* Site footer (was the FOOTER string in js/shared-ui.js). Normal flow, so it must be the LAST
   block of #page-root, after the page content. public/js/main.js reveals it via `.in` on scroll. */
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-logo" role="img" aria-label="Insplanet">
        <svg
          className="footer-wordmark"
          viewBox="0 0 576 179"
          fill="#3E3F44"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {FOOTER_WORDMARK_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
        <svg
          className="footer-planet"
          viewBox="0 0 576 179"
          fill="#3E3F44"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d={FOOTER_PLANET_PATH} />
        </svg>
      </div>
      <div className="footer-bottom">
        <div className="footer-left">
          <nav className="footer-links">
            {FOOTER_LINKS.map((label) => (
              <a key={label} href="#">
                {label}
              </a>
            ))}
          </nav>
          <p className="footer-copy">{CONTACT.copyright}</p>
        </div>
        <div className="footer-contact">
          <p>{CONTACT.address}</p>
          <p>E&nbsp;&nbsp;{CONTACT.email}</p>
          <p className="footer-tf">
            <span>T&nbsp;&nbsp;{CONTACT.tel}</span>
            <span>F&nbsp;&nbsp;{CONTACT.fax}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

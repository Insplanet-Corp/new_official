'use client';

import { usePathname } from 'next/navigation';
import { CONTACT, MENU_NAV, MENU_PRODUCTS } from '@/data/site';

/* Full-screen menu overlay (was the MENU string in js/shared-ui.js).
   Open/close, the halftone reveal and the close-then-navigate behaviour all live in
   public/js/main.js — this component only owns the markup and the `is-current` marking.
   On the main page nothing is marked (you haven't gone anywhere, so the menu stays all white). */
export default function MenuOverlay() {
  const pathname = usePathname();
  const onSubPage = pathname !== '/';

  return (
    <div id="menu-overlay" aria-hidden="true">
      <canvas id="menu-dots" />
      <div id="menu-panel" />
      <div className="menu-scroll" data-lenis-prevent="">
        <div className="menu-inner">
          <div className="menu-col menu-col-left">
            <nav className="menu-nav">
              {MENU_NAV.map((item) => (
                <a
                  key={item.href}
                  className={
                    onSubPage && item.href === pathname ? 'menu-item is-current' : 'menu-item'
                  }
                  href={item.href}
                >
                  <span className="menu-label">{item.label}</span>
                  {item.badge ? <span className="menu-badge">{item.badge}</span> : null}
                </a>
              ))}
            </nav>
            <p className="menu-copy">{CONTACT.copyright}</p>
          </div>
          <div className="menu-col menu-col-right">
            <ul className="project-list">
              {MENU_PRODUCTS.map((p) => (
                <li key={p.name}>
                  <span className="project-head">
                    <span className="project-name">{p.name}</span>
                    <span className="project-arrow">
                      <img src="/assets/icon_arrow_round.svg" alt="" />
                    </span>
                  </span>
                  <span className="project-desc">{p.desc}</span>
                </li>
              ))}
            </ul>

            <a className="brief-btn" href="#">
              Company Brief Download
              <span className="download-icon">
                <img src="/assets/icon_download.svg" alt="" />
              </span>
            </a>

            <div className="menu-contact">
              <p className="contact-addr">{CONTACT.address}</p>
              <p className="contact-email">E&nbsp;&nbsp;{CONTACT.email}</p>
              <p className="contact-tf">
                <span>T&nbsp;&nbsp;{CONTACT.tel}</span>
                <span>F&nbsp;&nbsp;{CONTACT.fax}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <img id="menu-logo" src="/assets/ci_logo_white.svg" alt="Insplanet" />
      <button id="menu-close" type="button" aria-label="메뉴 닫기">
        <img src="/assets/menu_close.svg" alt="" />
      </button>
    </div>
  );
}

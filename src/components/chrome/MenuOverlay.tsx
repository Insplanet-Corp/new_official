'use client';

import { usePathname } from 'next/navigation';
import { trackDownload } from '@/lib/analytics';
import { BRIEF_PDF, CONTACT, MENU_NAV, MENU_PRODUCTS } from '@/data/site';

/* Full-screen menu overlay (was the MENU string in js/shared-ui.js).
   Open/close, the halftone reveal and the close-then-navigate behaviour all live in
   public/js/main.js — this component only owns the markup and the `is-current` marking.
   On the main page nothing is marked (you haven't gone anywhere, so the menu stays all white). */
/** 배지가 붙는 유일한 메뉴 항목 */
const BADGE_HREF = '/projects';

type Props = {
  /** 공개된 완료 프로젝트 수 — PageShell 이 서버에서 세어 넘긴다(lib/projectCount.ts).
      조회가 실패하면 null 로 오고, 그때는 배지를 아예 안 그린다 (틀린 숫자보다 낫다). */
  projectCount?: number | null;
};

export default function MenuOverlay({ projectCount }: Props) {
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
                  {item.href === BADGE_HREF && projectCount ? (
                    <span className="menu-badge">{projectCount}</span>
                  ) : null}
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

            <a
              className="brief-btn"
              href={BRIEF_PDF}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void trackDownload('brochure')}
            >
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
      {/* 모바일(≤1023) 메뉴 — Figma offiofficial_02_fmenu2_375 (2477:46857).
          데스크톱 2단 .menu-inner 과 내용이 다르다(패밀리는 설명 없이 이름+화살표만, 주소/연락처
          대신 Company Brief + 카피라이트). 두 트리를 항상 함께 그리고 폭으로만 가른다 — 34번의
          responsive 패턴. 리빌 원(#menu-panel/#menu-dots)·로고·닫기 버튼은 PC 와 공유한다. */}
      <div className="m-menu-scroll" data-lenis-prevent="">
        <nav className="m-menu-nav">
          {MENU_NAV.map((item) => (
            <a
              key={item.href}
              className={
                onSubPage && item.href === pathname ? 'm-menu-item is-current' : 'm-menu-item'
              }
              href={item.href}
            >
              <span>{item.label}</span>
              {item.href === BADGE_HREF && projectCount ? (
                <span className="m-menu-badge">{projectCount}</span>
              ) : null}
            </a>
          ))}
        </nav>

        <ul className="m-menu-family">
          {MENU_PRODUCTS.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              <span className="m-menu-fam-ico">
                <img src="/assets/icon_arrow_round.svg" alt="" />
              </span>
            </li>
          ))}
        </ul>

        <div className="m-menu-bottom">
          <a
            className="m-menu-brief"
            href={BRIEF_PDF}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void trackDownload('brochure')}
          >
            Company Brief Download
            <span className="m-menu-brief-ico">
              <img src="/assets/icon_download.svg" alt="" />
            </span>
          </a>
          <p className="m-menu-copy">{CONTACT.copyright}</p>
        </div>
      </div>

      <img id="menu-logo" src="/assets/ci_logo_white.svg" alt="Insplanet" />
      <button id="menu-close" type="button" aria-label="메뉴 닫기">
        <img src="/assets/menu_close.svg" alt="" />
      </button>
    </div>
  );
}

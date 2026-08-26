'use client';

import { useRef } from 'react';
import { trackDownload } from '@/lib/analytics';
import { BRIEF_PDF } from '@/data/site';
import useHeroReveal from '@/lib/hooks/useHeroReveal';

/* 01 hero — "Hello / Build your value" + intro + Company Brief Download. */
export default function ContactHero() {
  const ref = useRef<HTMLElement>(null);
  useHeroReveal(ref);

  return (
    <section className="ct-hero" ref={ref}>
      <div className="ct-inner">
        <img className="ct-symbol" src="/assets/symbol.svg" alt="" aria-hidden="true" />
        <div className="ct-hero-body">
          <div className="ct-hero-head">
            <div className="ct-hero-title-row">
              <h1 className="ct-hero-title">
                <span className="line-1">Hello</span>
                <span className="line-2">
                  Build your value
                  <i className="ct-dot" aria-hidden="true" />
                </span>
              </h1>
            </div>
            <div className="ct-hero-subrow">
              <div className="ct-hero-sub">
                <p className="ct-hero-lead">프로젝트 및 견적 문의를 남겨주세요.</p>
                <p className="ct-hero-desc">
                  비즈니스의 본질을 꿰뚫는 통찰과 정교한 기술력으로 당신의 아이디어를
                  <br />
                  현실로 만듭니다. 인스플래닛의 전문가 그룹이 프로젝트의 시작부터 <br />
                  가치 실현의 순간까지 가장 든든한 파트너가 되어드리겠습니다.
                </p>
              </div>
              <a className="ct-brief" href={BRIEF_PDF} download onClick={() => void trackDownload('brochure')}>
                <span>Company Brief Download</span>
                <span className="ct-brief-ico" aria-hidden="true">
                  <svg width="11.31" height="11.31" viewBox="0 0 13 13" fill="none">
                    <path
                      d="M6.49988 0.760305V12.2387"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12.2391 6.4995L6.49988 12.2387L0.760682 6.4995"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

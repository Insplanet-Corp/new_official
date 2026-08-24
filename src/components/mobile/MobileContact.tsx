'use client';

import { useCallback, useRef, useState } from 'react';
import MobileContactForm from '@/components/mobile/MobileContactForm';
import MobileFooter from '@/components/mobile/MobileFooter';
import MobileJoinUs from '@/components/mobile/MobileJoinUs';
import MobileRecruitModal from '@/components/mobile/MobileRecruitModal';
import useHeroReveal from '@/lib/hooks/useHeroReveal';

/* Contact 의 모바일 화면 (mobile-contact.html 포트, Figma official_05_contact_*_375).

   마크업·수치는 정적 사이트 mobile-contact.html 을 그대로 옮겼다 — 퍼블리셔가 같은 Figma 로
   만든 것이라 다시 해석하는 것보다 정확하다. CSS(.mc-*)는 이미 style.css 에 들어와 있다(전역
   로드, 이 페이지에서 따로 import 할 필요 없음).

   PC ContactPageBody 와 같은 이유로 Join Us 팝업 상태를 여기서 들고 있다 — PC/모바일 트리는
   폭으로만 갈리고 항상 함께 마운트되므로(34번, home-responsive 패턴) 상태를 공유할 이유가 없다. */
export default function MobileContact() {
  const heroRef = useRef<HTMLElement>(null);
  useHeroReveal(heroRef);

  const [recruitOpen, setRecruitOpen] = useState(false);
  const openRecruit = useCallback(() => setRecruitOpen(true), []);
  const closeRecruit = useCallback(() => setRecruitOpen(false), []);

  return (
    <div className="m-contact ct-rv">
      {/* 폼/Join Us 영역은 born-hidden 으로 시작한다(PC ContactPageBody 와 같은 이유) — 스크립트가
          꺼져 있으면 이 노스크립트 오버라이드로 보이게 한다 */}
      <noscript>
        <style>
          {'.ct-rv .mc-field,.ct-rv .mc-consent,.ct-rv .mc-submit,' +
            '.ct-rv .mc-join-title,.ct-rv .mc-join-sub,.ct-rv .mc-join-desc,.ct-rv .mc-join-btn' +
            '{opacity:1;transform:none;pointer-events:auto}'}
        </style>
      </noscript>

      <section className="mc-hero" ref={heroRef}>
        <div className="mc-head">
          <img className="mc-symbol" src="/assets/symbol.svg" alt="" />
          <h1 className="mc-title">
            <span className="mc-t1">Hello</span>
            <span className="mc-t2">Build</span>
            <span className="mc-t3">
              your value
              <i className="mc-dot" aria-hidden="true" />
            </span>
          </h1>
        </div>
        <div className="mc-sub">
          <p className="mc-sub-head">프로젝트 및 견적 문의를 남겨주세요.</p>
          <p className="mc-sub-body">
            비즈니스의 본질을 꿰뚫는 통찰과 정교한 기술력으로 당신의 아이디어를 현실로 만듭니다.
          </p>
        </div>
        <a className="mc-brief" href="#">
          Company Brief Download
          <span className="mc-brief-ico" aria-hidden="true">
            <img src="/assets/icon_download.svg" alt="" />
          </span>
        </a>
      </section>

      <MobileContactForm />
      <MobileJoinUs onOpenRecruit={openRecruit} />
      <MobileRecruitModal open={recruitOpen} onClose={closeRecruit} />

      <MobileFooter />
    </div>
  );
}

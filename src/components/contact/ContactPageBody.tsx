'use client';

import ContactForm from '@/components/contact/ContactForm';
import ContactHero from '@/components/contact/ContactHero';
import JoinUs from '@/components/contact/JoinUs';
import { useRecruit } from '@/components/contact/RecruitContext';
import RecruitModal from '@/components/contact/RecruitModal';

/* Join Us 가 여는 Careers 팝업의 상태는 RecruitProvider 가 들고 있다 — 모바일 트리
   (MobileContact)와 **같은 상태**를 써야 1024 경계를 넘어도 열린 채로 유지된다. */
export default function ContactPageBody() {
  const { open, isDesktop, openRecruit, closeRecruit } = useRecruit();

  return (
    <>
      {/* ct-rv: the form/Join Us areas are born hidden so their scroll-reveal never flashes. The
          static build stamped it on <html> from a pre-paint inline script; server-rendering it here
          is the same thing without the hydration mismatch — every rule is a descendant selector.
          The <noscript> override keeps the page readable when scripts are off. */}
      <noscript>
        <style>{
          '.ct-rv .ct-field,.ct-rv .ct-consent,.ct-rv .ct-submit,' +
          '.ct-rv .ct-join-title,.ct-rv .ct-join-sub,.ct-rv .ct-join-desc,.ct-rv .ct-join-btn' +
          '{opacity:1;transform:none;pointer-events:auto}'
        }</style>
      </noscript>
      <main className="contact ct-rv">
        <ContactHero />
        <ContactForm />
        <JoinUs onOpenRecruit={openRecruit} />
      </main>
      {/* ≤1023 에서는 모바일 풀스크린 시트(.mr-popup)가 대신 뜬다. open/active 를 가르는
          이유는 RecruitModal 위 주석 참고 — 껍데기는 계속 열어 두고 동작만 폭으로 끈다 */}
      <RecruitModal open={open} active={open && isDesktop} onClose={closeRecruit} />
    </>
  );
}

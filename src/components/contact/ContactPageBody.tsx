'use client';

import { useCallback, useState } from 'react';
import ContactForm from '@/components/contact/ContactForm';
import ContactHero from '@/components/contact/ContactHero';
import JoinUs from '@/components/contact/JoinUs';
import RecruitModal from '@/components/contact/RecruitModal';

/* Owns the one piece of state the contact page shares across sections: whether the Careers popup
   is open (Join Us opens it, the popup closes itself). */
export default function ContactPageBody() {
  const [recruitOpen, setRecruitOpen] = useState(false);
  const close = useCallback(() => setRecruitOpen(false), []);

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
        <JoinUs onOpenRecruit={() => setRecruitOpen(true)} />
      </main>
      <RecruitModal open={recruitOpen} onClose={close} />
    </>
  );
}

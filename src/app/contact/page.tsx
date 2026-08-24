import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ContactPageBody from '@/components/contact/ContactPageBody';
import MobileContact from '@/components/mobile/MobileContact';
import '@/styles/contact.css';
import '@/styles/mobile-pages.css';

export const metadata: Metadata = { title: 'Insplanet — Contact' };

export default function ContactPage() {
  return (
    <>
      <BodyClass name="contact-page" />
      <PageShell>
        <ContactPageBody />
        {/* ≤1023 모바일 화면. styles/mobile-pages.css 가 폭으로 가른다 */}
        <MobileContact />
      </PageShell>
    </>
  );
}

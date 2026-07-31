import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ContactPageBody from '@/components/contact/ContactPageBody';
import '@/styles/contact.css';

export const metadata: Metadata = { title: 'Insplanet — Contact' };

export default function ContactPage() {
  return (
    <>
      <BodyClass name="contact-page" />
      <PageShell>
        <ContactPageBody />
      </PageShell>
    </>
  );
}

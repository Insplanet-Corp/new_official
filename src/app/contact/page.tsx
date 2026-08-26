import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ContactPageBody from '@/components/contact/ContactPageBody';
import { RecruitProvider } from '@/components/contact/RecruitContext';
import MobileContact from '@/components/mobile/MobileContact';
import '@/styles/contact.css';
import '@/styles/mobile-pages.css';

export const metadata: Metadata = { title: 'Insplanet — Contact' };

export default function ContactPage() {
  return (
    <>
      <BodyClass name="contact-page" />
      <PageShell>
        {/* Careers 팝업의 열림 상태를 PC/모바일 트리가 공유한다 — 열어 둔 채 1024 경계를
            넘으면 닫히지 않고 껍데기만 바뀐다. RecruitContext.tsx 참고 */}
        <RecruitProvider>
          <ContactPageBody />
          {/* ≤1023 모바일 화면. styles/mobile-pages.css 가 폭으로 가른다 */}
          <MobileContact />
        </RecruitProvider>
      </PageShell>
    </>
  );
}

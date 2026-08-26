import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ContactPageBody from '@/components/contact/ContactPageBody';
import { RecruitProvider } from '@/components/contact/RecruitContext';
import MobileContact from '@/components/mobile/MobileContact';
import '@/styles/contact.css';
import '@/styles/mobile-pages.css';

const description =
  '프로젝트 문의와 채용 지원을 받습니다. 회사소개서(Company Brief)도 이곳에서 내려받을 수 있습니다. 서울 중구 퇴계로27길 49, 2층.';

export const metadata: Metadata = {
  title: 'Contact',
  description,
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Contact — Insplanet', description, url: '/contact' },
};

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

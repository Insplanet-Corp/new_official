import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ResponsiveSlot from '@/components/ResponsiveSlot';
import AboutAxCreator from '@/components/about/AboutAxCreator';
import AboutFusion from '@/components/about/AboutFusion';
import AboutHero from '@/components/about/AboutHero';
import AboutMission from '@/components/about/AboutMission';
import AboutReveals from '@/components/about/AboutReveals';
import MobileAbout from '@/components/mobile/MobileAbout';
import '@/styles/about.css';
import '@/styles/mobile-pages.css';

/* title 은 루트 레이아웃의 template 이 " — Insplanet" 을 붙인다. description 은 검색결과에
   그대로 노출되므로 페이지마다 다르게 쓴다 — 같은 문장을 돌려쓰면 중복 콘텐츠로 본다. */
const description =
  '기술보다 사람을, 속도보다 본질을 먼저 생각합니다. 인스플래닛이 일하는 방식과 금융·모빌리티·공공 분야에서 쌓아 온 경험을 소개합니다.';

export const metadata: Metadata = {
  title: 'Who We Are',
  description,
  alternates: { canonical: '/about' },
  openGraph: { title: 'Who We Are — Insplanet', description, url: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <BodyClass name="about-page" />
      <PageShell
        // black-hole shader + the hero/closing pinned-expansion scrubs: NOT deferred, they run from the start
        scripts={['/js/about-blackhole.js', '/js/about-hero.js']}
      >
        <main className="about">
          <AboutHero />
          <AboutMission />
          {/* 04 Experience — renders the photo band (AboutGallery) as its own last child */}
          <AboutFusion />
          <AboutAxCreator />

          {/* 07 closing image — PINNED EXPANSION (same mechanism as the 01 hero): a content-width
              rounded card, centered in a 100vh sticky stage, grows to full-bleed (100vw x 100vh,
              radius 0) as public/js/about-hero.js scrubs it, then stays pinned for the wrapper's
              extra scroll distance before the footer follows (0 gap). */}
          <section className="about-fullbleed">
            <div className="about-fullbleed-pin">
              <div className="about-fullbleed-box">
                <img src="/assets/about/fullbleed.jpg" alt="" loading="lazy" decoding="async" />
              </div>
            </div>
          </section>
        </main>
        {/* ≤1023 모바일 화면. styles/mobile-pages.css 가 폭으로 가른다 */}
        <MobileAbout />
        {/* 블랙홀 캔버스 하나를 지금 보이는 히어로로 옮긴다 */}
        <ResponsiveSlot id="about-blackhole" desktop=".about-banner" mobile=".ma-banner" />
        <AboutReveals />
      </PageShell>
    </>
  );
}

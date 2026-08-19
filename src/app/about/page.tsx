import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import AboutAxCreator from '@/components/about/AboutAxCreator';
import AboutFusion from '@/components/about/AboutFusion';
import AboutHero from '@/components/about/AboutHero';
import AboutMission from '@/components/about/AboutMission';
import AboutReveals from '@/components/about/AboutReveals';
import '@/styles/about.css';

export const metadata: Metadata = { title: 'Insplanet — Who We Are' };

export default function AboutPage() {
  return (
    <>
      {/* ⚠️ 정적 사이트는 여기서 ≤1023 을 mobile-about.html 로 보낸다.
          Next 에는 아직 모바일 About 라우트가 없어 분기를 달지 않았다 —
          /mobile(홈)으로 보내면 About 을 요청한 사람이 홈을 받는다. */}
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
        <AboutReveals />
      </PageShell>
    </>
  );
}

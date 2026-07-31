import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import AboutAxCreator from '@/components/about/AboutAxCreator';
import AboutFusion from '@/components/about/AboutFusion';
import AboutGallery from '@/components/about/AboutGallery';
import AboutHero from '@/components/about/AboutHero';
import AboutMission from '@/components/about/AboutMission';
import '@/styles/about.css';

export const metadata: Metadata = { title: 'Insplanet — Who We Are' };

export default function AboutPage() {
  return (
    <>
      <BodyClass name="about-page" />
      <PageShell
        // black-hole shader + the hero pinned-expansion scrub: NOT deferred, they run from the start
        scripts={['/js/about-blackhole.js', '/js/about-hero.js']}
      >
        <main className="about">
          <AboutHero />
          <AboutMission />
          <AboutFusion />
          <AboutGallery />
          <AboutAxCreator />

          {/* 07 full-bleed closing image */}
          <section className="about-fullbleed">
            <img src="/assets/about/fullbleed.jpg" alt="" loading="lazy" decoding="async" />
          </section>
        </main>
      </PageShell>
    </>
  );
}

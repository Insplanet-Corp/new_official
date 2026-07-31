import AdaptiveRedirect from '@/components/AdaptiveRedirect';
import PageShell from '@/components/PageShell';
import BeyondSwap from '@/components/home/BeyondSwap';
import ContactCta from '@/components/home/ContactCta';
import Hero from '@/components/home/Hero';
import Insight from '@/components/home/Insight';
import Partners from '@/components/home/Partners';
import Projects from '@/components/home/Projects';
import Services from '@/components/home/Services';

export default function HomePage() {
  return (
    <>
      {/* phones (≤767) get the dedicated mobile page */}
      <AdaptiveRedirect query="(max-width:767px)" to="/mobile" />
      <PageShell
        // below-the-fold WebGL: injected by main.js only AFTER the enter fade, so context
        // creation + shader compilation can't hitch the first frame of the transition
        deferred={[
          { src: '/js/cta-glow.js' },
          { src: '/js/insight-background.bundle.js', module: true },
        ]}
        // hero blob: NOT deferred — visible from the start
        scripts={['/js/blob.js']}
      >
        <Hero />
        <BeyondSwap />
        <Insight />
        <Services />
        <Partners />
        <Projects />
        <ContactCta />
      </PageShell>
    </>
  );
}

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
      {/* phones (≤767) get the dedicated mobile page.
          ⚠️ 정적 사이트는 이 경계를 1023 으로 올렸다(아이패드 세로도 모바일). 여기는 아직 767 이다 —
          /mobile 이 히어로만 있는 WIP 작업장이라 경계를 올리면 태블릿이 미완성 화면을 받는다.
          모바일 페이지를 완성할 때 1023 으로 같이 올릴 것. */}
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

import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import ResponsiveSlot from '@/components/ResponsiveSlot';
import BeyondSwap from '@/components/home/BeyondSwap';
import ContactCta from '@/components/home/ContactCta';
import Hero from '@/components/home/Hero';
import Insight from '@/components/home/Insight';
import Partners from '@/components/home/Partners';
import Projects from '@/components/home/Projects';
import Services from '@/components/home/Services';
import MobileBeyond from '@/components/mobile/MobileBeyond';
import MobileCta from '@/components/mobile/MobileCta';
import MobileFooter from '@/components/mobile/MobileFooter';
import MobileInsight from '@/components/mobile/MobileInsight';
import MobilePartners from '@/components/mobile/MobilePartners';
import MobileProjects from '@/components/mobile/MobileProjects';
import MobileServices from '@/components/mobile/MobileServices';
import ProjectSheet from '@/components/projects/ProjectSheet';
import { MAX_SHOWCASE, toShowcase } from '@/data/home';
import type { Portfolio } from '@/lib/portfolios';
import { supabase } from '@/lib/supabase';
import '@/styles/home-responsive.css';

/* 홈은 루트 레이아웃의 기본 title/description 을 그대로 쓴다(사이트 대표 문구라 같은 게 맞다).
   canonical 만 명시한다 — 쿼리스트링이 붙은 주소가 따로 색인되는 것을 막는다. */
export const metadata: Metadata = { alternates: { canonical: '/' } };

/* 어드민에서 [메인] 을 체크하면 바로 반영되도록 요청마다 읽는다.
   ISR 로 두면 만료 후 첫 요청도 옛 화면을 주고 뒤에서 다시 만들어, 어드민에서
   고쳐도 "두 번 새로고침해야 나오는" 것처럼 보인다 — /projects 에서 겪었다(12번).
   트래픽이 늘면 ISR + 어드민 저장 시 revalidatePath('/') 로 바꿀 것. */
export const dynamic = 'force-dynamic';

/* ⚠️ 조회는 서버에서 한다. main.js 가 로드 시점에 .proj-vis/.proj-slide 를 세어
   레이어를 잡으므로 클라이언트에서 뒤늦게 채우면 슬라이드가 죽는다.

   ⚠️ use_yn 을 쿼리에서도 명시적으로 건다 — RLS 하나에 기대지 않는다(13번).
   순서는 어드민 포트폴리오 목록의 No 순서(sort_order)를 그대로 따른다 — 위에서
   MAX_SHOWCASE(3)건까지 쓴다. 슬라이드 수는 main.js 가 DOM 에서 센다. */
async function loadMainProjects(): Promise<Portfolio[]> {
  const base = () =>
    supabase
      .from('portfolios')
      .select('*')
      .eq('is_main', true)
      .eq('use_yn', 'Y');

  /* ⚠️ 012 미실행 DB 에는 sort_order 가 없다 — /projects 와 같은 이유로 물러난다 */
  let { data, error } = await base()
    .order('sort_order', { ascending: true })
    .order('seq', { ascending: false })
    .limit(MAX_SHOWCASE);
  if (error?.code === '42703') {
    ({ data, error } = await base()
      .order('seq', { ascending: false })
      .limit(MAX_SHOWCASE));
  }

  if (error) {
    // 홈이 통째로 500 이 되는 것보다 기본 슬라이드로 그리는 편이 낫다
    console.error('[home] 메인 포트폴리오 조회 실패:', error.message, error.code);
    return [];
  }
  return (data ?? []) as Portfolio[];
}

export default async function HomePage() {
  const mainRows = await loadMainProjects();
  const showcase = toShowcase(mainRows);

  return (
    <>
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
        {/* 히어로는 두 디자인이 같은 DOM 을 쓴다 — 한 번만 그린다 */}
        <Hero />

        {/* --- PC 챕터 (≥1024). styles/home-responsive.css 가 폭으로 가른다 --- */}
        <BeyondSwap />
        <Insight />
        <Services />
        <Partners />
        <Projects items={showcase} />
        <ContactCta />

        {/* --- 모바일 챕터 (≤1023) --- */}
        <MobileBeyond />
        <MobileInsight />
        <MobileServices />
        <MobilePartners />
        <MobileProjects items={showcase} />
        <MobileCta />
        {/* 모바일 푸터. PageShell 이 그리는 데스크톱 .footer 는 이게 있는 페이지에서만 숨는다 */}
        <MobileFooter />

        {/* Our Projects 카드/패널 클릭 -> 아래에서 올라오는 상세 시트.
            /projects 목록과 **같은 컴포넌트**다 — document 클릭에서 a[href^="/projects/"] 를
            가로채고, 주소를 /projects/<id> 로 pushState 한 뒤 iframe 을 올린다.
            ⚠️ 이 리스너가 main.js 의 전역 링크 가로채기보다 **먼저** 등록돼야 한다.
            React effect(마운트 시)가 main.js(엔터 페이드 뒤 지연 주입)보다 앞서고,
            main.js 는 맨 앞에서 defaultPrevented 를 확인하므로 지금 구조에서는 안전하다. */}
        <ProjectSheet cards={showcase} />

        {/* WebGL 노드는 각각 하나뿐이다 — 지금 보이는 프레임으로 옮긴다 */}
        <ResponsiveSlot id="insight-shader" desktop=".insight-card" mobile=".m-insight-frame" />
        <ResponsiveSlot id="cta-glow" desktop=".contact-cta" mobile=".m-cta" />
      </PageShell>
    </>
  );
}

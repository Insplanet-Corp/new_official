import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ProjectsExplorer from '@/components/projects/ProjectsExplorer';
import ProjectsHero from '@/components/projects/ProjectsHero';
import MobileProjectsPage from '@/components/mobile/MobileProjectsPage';
import { toCards, toOngoingRows } from '@/data/projectsPage';
import type { Portfolio } from '@/lib/portfolios';
import { supabase } from '@/lib/supabase';
import '@/styles/projects.css';
import '@/styles/mobile-pages.css';

const description =
  '인스플래닛이 수행한 프로젝트입니다. 신한은행 · LG CNS · KB · 공공기관 등 금융 · 모빌리티 · 공공 분야의 웹 · 앱 UI/UX 설계와 프론트엔드 구축 사례를 확인하세요.';

export const metadata: Metadata = {
  title: 'Projects',
  description,
  alternates: { canonical: '/projects' },
  openGraph: { title: 'Projects — Insplanet', description, url: '/projects' },
};

/* 요청마다 DB 를 읽는다 — 어드민에서 고치면 새로고침 즉시 반영된다.

   ⚠️ 처음엔 `revalidate = 60` (ISR) 으로 뒀는데, 어드민에서 고쳐도 반영이
   안 되는 것처럼 보였다. ISR 은 stale-while-revalidate 라서 만료 후 첫 요청도
   여전히 옛 화면을 주고 뒤에서 다시 만든다 — 새 내용은 그 다음 요청부터다.
   즉 "60초 후 새로고침" 이 아니라 "60초 후 두 번 새로고침" 이라 혼란스럽다.
   여기에 Next 의 클라이언트 라우터 캐시까지 겹친다.

   쿼리 하나짜리 페이지라 매 요청 조회의 비용이 작아 이쪽을 택했다.
   트래픽이 늘면 ISR 로 되돌리되, 어드민 저장 시 revalidatePath('/projects') 를
   호출하는 on-demand 재생성을 같이 붙여야 한다. */
export const dynamic = 'force-dynamic';

/* ⚠️ 조회는 반드시 서버에서 한다. 클라이언트에서 뒤늦게 채우면
   ProjectsExplorer 의 reveal 이펙트(마운트 시 .pj-card 를 센다)가 빈 DOM 을 보고
   아무것도 못 띄운다 — 카드가 영영 opacity:0 으로 남는다. */
async function loadPortfolios(): Promise<Portfolio[]> {
  /* use_yn 을 쿼리에서도 명시적으로 거른다.

     RLS(portfolios_public_read)가 이미 Y 만 통과시키지만, 거기에만 기대지
     않는다 — permissive 정책은 OR 로 합쳐지므로 나중에 누가 느슨한 정책을
     하나 추가하면 조용히 뚫린다. 실제로 대시보드에서 만든 옛 정책
     "Anyone can view published portfolios" 때문에 N 인 항목이 홈페이지에
     노출된 적이 있다(007 마이그레이션에서 제거). */
  const base = () => supabase.from('portfolios').select('*').eq('use_yn', 'Y');

  /* 어드민 목록의 드래그 순서(012). 카드 그리드도 진행중 표도 이 순서다.
     ⚠️ 012 를 아직 실행하지 않은 DB 에는 sort_order 컬럼이 없어 42703 이 난다 —
     그 한 번으로 공개 페이지가 빈 그리드가 되면 안 되므로 예전 순서(최근 등록
     순)로 물러난다. 012 를 돌리면 이 경로는 다시 안 탄다. */
  let { data, error } = await base()
    .order('sort_order', { ascending: true })
    .order('seq', { ascending: false });
  if (error?.code === '42703') {
    ({ data, error } = await base().order('seq', { ascending: false }));
  }

  if (error) {
    // 공개 페이지라 예외로 500 을 내기보다 비운 채로 그린다 (히어로·필터바는 남는다)
    console.error('[projects] 포트폴리오 조회 실패:', error.message, error.code);
    return [];
  }
  return (data ?? []) as Portfolio[];
}

export default async function ProjectsPage() {
  const rows = await loadPortfolios();
  const cards = toCards(rows);
  const ongoingRows = toOngoingRows(rows);

  return (
    <>
      <BodyClass name="projects-page" />
      {/* 메뉴 배지는 다른 페이지에서 캐시된 값을 쓰지만(lib/projectCount.ts), 여기서는
          방금 그린 카드 수를 그대로 넘긴다 — 눈앞의 그리드와 숫자가 어긋나면 안 된다 */}
      <PageShell projectCount={cards.length}>
        <main className="pj">
          <ProjectsHero />
          <ProjectsExplorer cards={cards} ongoingRows={ongoingRows} />
        </main>
        {/* ≤1023 모바일 화면. styles/mobile-pages.css 가 폭으로 가른다.
            PC 그리드와 같은 cards 를 넘긴다 — 두 트리가 같은 데이터를 그린다. */}
        <MobileProjectsPage cards={cards} ongoingRows={ongoingRows} />
      </PageShell>
    </>
  );
}

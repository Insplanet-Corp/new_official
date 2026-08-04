import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';
import PageShell from '@/components/PageShell';
import ProjectsExplorer from '@/components/projects/ProjectsExplorer';
import ProjectsHero from '@/components/projects/ProjectsHero';
import { toCards, toOngoingRows } from '@/data/projectsPage';
import type { Portfolio } from '@/lib/portfolios';
import { supabase } from '@/lib/supabase';
import '@/styles/projects.css';

export const metadata: Metadata = { title: 'Insplanet — Projects' };

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
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('use_yn', 'Y')
    .order('seq', { ascending: false });

  if (error) {
    // 공개 페이지라 예외로 500 을 내기보다 비운 채로 그린다 (히어로·필터바는 남는다)
    console.error('[projects] 포트폴리오 조회 실패:', error.message, error.code);
    return [];
  }
  return (data ?? []) as Portfolio[];
}

export default async function ProjectsPage() {
  const rows = await loadPortfolios();

  return (
    <>
      <BodyClass name="projects-page" />
      <PageShell>
        <main className="pj">
          <ProjectsHero />
          <ProjectsExplorer
            cards={toCards(rows)}
            ongoingRows={toOngoingRows(rows)}
          />
        </main>
      </PageShell>
    </>
  );
}

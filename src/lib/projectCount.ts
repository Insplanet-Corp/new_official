/* 전체 메뉴(MenuOverlay)의 Projects 배지 숫자.

   ⚠️ 서버 전용이다 — next/cache 를 쓰므로 클라이언트 컴포넌트에서 import 하면
   빌드가 깨진다. 부르는 곳은 PageShell(서버) 하나다.

   메뉴는 /, /about, /contact, /projects 네 곳에 다 붙어 있는데(PageShell),
   /projects 를 뺀 나머지는 DB 를 읽지 않는 정적 렌더 대상이다. 매 요청 조회로
   두면 그 세 페이지가 통째로 동적 렌더가 되므로 unstable_cache 로 감싼다 —
   조회는 REVALIDATE_SEC 마다 한 번이고, 페이지는 ISR 수준으로 남는다.

   Next 16 에서 unstable_cache 는 'use cache' 로 대체될 예정이지만, 그 지시자는
   cacheComponents 를 켜야 쓸 수 있다(전 라우트에 Suspense 경계가 필요해진다).
   그 전환은 이 배지 하나 때문에 할 일이 아니라서 지금은 unstable_cache 를 쓴다. */

import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

/** 저장 시 즉시 반영이 필요해지면 revalidateTag(PROJECT_COUNT_TAG) 로 털면 된다 */
export const PROJECT_COUNT_TAG = 'project-count';

const REVALIDATE_SEC = 300;

/* /projects 의 카드 그리드와 같은 조건이어야 한다 (data/projectsPage.ts 의 toCards).
   진행중(ongoing)은 토글 뒤의 표라 배지에 세지 않는다.

   ⚠️ use_yn 은 RLS 가 이미 걸러 주지만 쿼리에서도 명시한다 — permissive 정책은
   OR 로 합쳐져서 느슨한 정책이 하나만 남아도 조용히 뚫린다(CLAUDE.md 13번).

   head: true 라 행은 한 건도 받지 않고 개수만 온다. */
async function fetchDoneCount(): Promise<number | null> {
  const { count, error } = await supabase
    .from('portfolios')
    .select('id', { count: 'exact', head: true })
    .eq('use_yn', 'Y')
    .eq('status', 'done');

  if (error) {
    // 배지 하나 때문에 페이지를 500 으로 만들지 않는다 — null 이면 배지가 안 그려진다
    console.error('[menu] 프로젝트 수 조회 실패:', error.message, error.code);
    return null;
  }
  return count ?? 0;
}

export const getDoneProjectCount = unstable_cache(fetchDoneCount, ['done-project-count'], {
  revalidate: REVALIDATE_SEC,
  tags: [PROJECT_COUNT_TAG],
});

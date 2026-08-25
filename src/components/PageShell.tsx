import type { ReactNode } from 'react';
import LegacyRuntime, { type DeferredScript } from '@/components/LegacyRuntime';
import ResponsiveScrollKeeper from '@/components/ResponsiveScrollKeeper';
import MenuOverlay from '@/components/chrome/MenuOverlay';
import SiteChrome from '@/components/chrome/SiteChrome';
import SiteFooter from '@/components/chrome/SiteFooter';
import { getDoneProjectCount } from '@/lib/projectCount';

type Props = {
  children: ReactNode;
  deferred?: DeferredScript[];
  scripts?: string[];
  /* 메뉴의 Projects 배지 숫자. 안 주면 여기서 캐시된 값을 센다.
     /projects 만 자기가 그린 카드 수를 넘긴다 — 그 페이지는 force-dynamic 이라
     항상 최신인데 배지가 캐시된 값이면 눈앞의 카드 수와 어긋나 보인다. */
  projectCount?: number;
};

/* Everything lives in #page-root so the page transition can fade it as one (public/js/main.js).
   Chrome / footer / menu come last, exactly where shared-ui.js used to append them.

   ⚠️ async 서버 컴포넌트다. 클라이언트 컴포넌트에서 렌더하면 안 된다 (지금은 전부
   서버 페이지에서만 쓴다). 배지 조회는 캐시를 타므로 /, /about, /contact 의 정적
   렌더는 그대로다 — lib/projectCount.ts 참고. */
export default async function PageShell({ children, deferred, scripts, projectCount }: Props) {
  const badgeCount = projectCount ?? (await getDoneProjectCount());

  return (
    <>
      <div id="page-root">
        {children}
        <SiteChrome />
        <SiteFooter />
        <MenuOverlay projectCount={badgeCount} />
      </div>
      <LegacyRuntime deferred={deferred} scripts={scripts} />
      {/* 1024 경계를 넘을 때 보고 있던 챕터를 유지한다 */}
      <ResponsiveScrollKeeper />
    </>
  );
}

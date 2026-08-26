'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { initAnalytics, trackPageview } from '@/lib/analytics';

/* 방문 기록. 루트 레이아웃에 한 번만 두면 모든 라우트를 덮는다.

   ⚠️ 마케팅 페이지끼리는 main.js 가 링크를 가로채 `location.href` 로 **하드 내비게이션**을
      한다(문서가 통째로 새로 뜬다). 그래서 대부분은 마운트 시 한 번 기록으로 충분하다.
      다만 어드민과 프로젝트 시트(pushState)는 클라이언트 라우팅이라 pathname 을 지켜본다.
   ⚠️ 같은 경로를 두 번 기록하지 않는다 — 시트를 열고 닫으면 pathname 이
      /projects → /projects/<id> → /projects 로 오가는데, 되돌아온 것까지 조회수로
      세면 목록 페이지가 부풀려진다.
   ⚠️ /admin 은 lib/analytics.ts 안에서 걸러진다. */
export default function Analytics() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics(); // ?internal=1 / 0 처리
  }, []);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    void trackPageview(pathname);
  }, [pathname]);

  return null;
}

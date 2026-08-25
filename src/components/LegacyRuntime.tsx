'use client';

import { useEffect } from 'react';

export type DeferredScript = {
  src: string;
  /** inject as <script type="module"> (was data-module in the static build) */
  module?: boolean;
  /** fade #blob in once the script has drawn its first frame (was data-fade) */
  fade?: boolean;
};

type Props = {
  /** Heavy below-the-fold WebGL scripts. Injected as <script type="text/pg-defer"> placeholders:
   *  main.js swaps them for real scripts AFTER the page-enter fade, so context creation and shader
   *  compilation can't hitch the first frame of the transition. */
  deferred?: DeferredScript[];
  /** Page scripts that must run right after main.js, in order (e.g. blob.js, about-hero.js). */
  scripts?: string[];
};

/* Boots the legacy runtime that lives in /public/js. js/shared-ui.js used to inject the shared
   markup and then append Lenis + main.js; the markup is now React (SiteChrome / SiteFooter /
   MenuOverlay), so this component only does the script half — after mount, so main.js sees a
   complete DOM exactly like it did before.
   async=false on a dynamically inserted script keeps execution ORDERED (Lenis before main.js). */
/* ⚠️ 이 런타임은 **문서 로드당 한 번**만 부팅된다 — 그래서 마케팅 라우트로는 절대
   클라이언트 라우팅(next/link, router.push)으로 들어오면 안 된다.

   마케팅 페이지끼리는 문제가 없다: main.js 가 같은 출처의 <a> 클릭을 전부 가로채
   location.href 로 **하드 내비게이션**을 하기 때문이다(페이지 전환 페이드가 그 위에 얹힌다).
   문제는 main.js 가 없는 곳 — 즉 /admin/* — 에서 <Link href="/"> 로 들어오는 경로다:

     1회차: React 가 마케팅 트리를 마운트 → 이 effect 가 main.js 를 주입 → 대체로 동작한다.
     2회차 이후(뒤로가기로 어드민에 갔다가 다시 사이트 보기 등): 같은 문서라
            __insplanetRuntime 이 true 로 남아 있어 **main.js 를 다시 넣지 않는다.**
            1회차에 로드된 main.js 는 React 가 이미 버린 옛 DOM 노드에 바인딩돼 있으므로
            히어로 리빌(.in)·스크롤 스크럽·블롭·페이지 전환이 전부 죽는다.
            → 주소는 바뀌었는데 헤더만 남고 본문이 안 나오는 화면이 된다(실제 증상).

   가드를 없애서 main.js 를 다시 주입하면 더 나빠진다 — 전역 click/scroll 핸들러가
   두 벌 붙는다. main.js 는 다시 바인딩하는 구조가 아니다(CLAUDE.md 최상단 제약).
   → 해결은 **경계에서 문서를 새로 로드하는 것**이다. 어드민에서 사이트로 가는 링크는
   맨 <a href> 나 <Button href reload> 를 쓴다. next/link 를 쓰지 말 것. */
export default function LegacyRuntime({ deferred = [], scripts = [] }: Props) {
  useEffect(() => {
    const w = window as Window & { __insplanetRuntime?: boolean };
    if (w.__insplanetRuntime) return; // StrictMode double-effect / re-mount guard
    w.__insplanetRuntime = true;

    for (const d of deferred) {
      const s = document.createElement('script');
      s.type = 'text/pg-defer';
      s.src = d.src;
      if (d.module) s.setAttribute('data-module', '');
      if (d.fade) s.setAttribute('data-fade', '');
      document.body.appendChild(s);
    }

    for (const src of ['/js/vendor/lenis.min.js', '/js/main.js', ...scripts]) {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      document.body.appendChild(s);
    }
    // Never torn down: navigation is a full document load (main.js owns the page transition),
    // so the scripts live exactly as long as the document does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

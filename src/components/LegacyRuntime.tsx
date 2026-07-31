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

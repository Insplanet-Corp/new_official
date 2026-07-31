'use client';

import { useEffect } from 'react';
import { afterFonts, prefersReducedMotion } from '@/lib/dom';

type LenisCtor = new (opts: { lerp: number; smoothWheel: boolean }) => {
  raf: (t: number) => void;
};

/* The mobile page is self-contained: no shared-ui / main.js, just the hero blob, Lenis (desktop
   parity: same elastic feel, lerp .09 — touch stays native/momentum) and the Insight shader bundle,
   plus the hero blur-in that main.js normally does. */
export default function MobileRuntime() {
  useEffect(() => {
    const w = window as Window & { __insplanetRuntime?: boolean; Lenis?: LenisCtor; __lenis?: unknown };
    if (w.__insplanetRuntime) return;
    w.__insplanetRuntime = true;

    // hero blob (self-contained, no menu/main.js dependency)
    const blob = document.createElement('script');
    blob.src = '/js/blob.js';
    blob.async = false;
    document.body.appendChild(blob);

    // smooth scroll
    const lenis = document.createElement('script');
    lenis.src = '/js/vendor/lenis.min.js';
    lenis.async = false;
    lenis.onload = () => {
      if (!w.Lenis || prefersReducedMotion()) return;
      const instance = new w.Lenis({ lerp: 0.09, smoothWheel: true });
      w.__lenis = instance;
      const raf = (t: number) => {
        instance.raf(t);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    };
    document.body.appendChild(lenis);

    // Insight bg: animated gradient through fluted glass (self-mounts into #insight-shader)
    const shader = document.createElement('script');
    shader.type = 'module';
    shader.src = '/js/insight-background.bundle.js';
    document.body.appendChild(shader);
  }, []);

  // hero reveal (blur-in) — main.js does this on the PC page; minimal version here
  useEffect(
    () =>
      afterFonts(() => {
        document.getElementById('head-title')?.classList.add('in');
        document.getElementById('sub-title')?.classList.add('in');
      }, 500),
    [],
  );

  return null;
}

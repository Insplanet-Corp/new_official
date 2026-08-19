'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/* Custom inverting cursor. Lives OUTSIDE #page-root (rendered straight into <body> by the root
   layout) so a page-transition transform never scales it or breaks its difference blend.

   The follow loop used to live in public/js/main.js, but that runtime is only booted by PageShell —
   so on routes that don't use PageShell the dot rendered and then never moved. It now drives itself
   here, which makes it work on every marketing route.

   /admin/* is deliberately excluded: the back office is a plain tool, so it keeps the OS cursor. */

/* Elements the cursor grows over (marketing site chrome only). */
const GROW_SEL = [
  '#ci-logo', '#menu-logo', '#lets-talk', '#full-menu', '#menu-close',
  '.menu-item', '.brief-btn', '.project-head', '.footer-links a',
  // the project-detail sheet's close control (the detail body itself is inside an iframe,
  // so nothing under .ps-body can be reached from here)
  '.ps-close',
].join(',');

/* Panels that turn the cursor into the solid "View Project" button. */
const VIEW_SEL = '.proj-visual,.pj-card';

/* smooth follow (no momentum): moves fast when far, decelerates to a soft stick as it nears. */
const FOLLOW = 0.13;

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = usePathname()?.startsWith('/admin') ?? false;

  useEffect(() => {
    const cur = ref.current;
    if (isAdmin || !cur || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;

    let mx = innerWidth / 2;
    let my = innerHeight / 2;
    let cx = mx;
    let cy = my;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    addEventListener('mousemove', onMove);

    // Decide the cursor MODE each frame from the topmost element under the pointer (single source of
    // truth via elementFromPoint) instead of per-element mouseenter/leave. The top buttons overlap the
    // project panel AND drift (magnetic hover), which made enter/leave race and flicker is-view<->grow.
    let mode = '';
    let raf = 0;
    const loop = () => {
      const el = document.elementFromPoint(mx, my);
      let m = '';
      if (el) {
        if (el.closest('.cta-arrow')) m = 'hide';          // the CTA arrow IS the cursor here -> hide the dot
        else if (el.closest(GROW_SEL)) m = 'grow';
        else if (el.closest(VIEW_SEL)) m = 'view';         // projects-page cards -> "View Project" cursor
      }
      if (m !== mode) {
        mode = m;
        cur.classList.toggle('is-view', m === 'view');
        cur.style.opacity = m === 'hide' ? '0' : '';       // reappears on leave
        cur.style.width = m === 'grow' ? '80px' : '';      // grow=80 inline; view(96)/normal(32) from CSS
        cur.style.height = m === 'grow' ? '80px' : '';
      }
      cx += (mx - cx) * FOLLOW;
      cy += (my - cy) * FOLLOW;
      const r = cur.offsetWidth / 2;
      cur.style.transform = `translate3d(${cx - r}px,${cy - r}px,0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
    // re-runs across the site <-> admin boundary so the follow loop is torn down with the dot
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <div id="cursor" ref={ref} aria-hidden="true">
      <span className="cursor-label">
        View
        <br />
        Project
      </span>
    </div>
  );
}

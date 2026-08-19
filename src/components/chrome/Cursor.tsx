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
      framed = null;
    };
    addEventListener('mousemove', onMove);

    /* 프로젝트 상세는 sandbox iframe 안에 있다. 포인터가 그 위로 올라가면 mousemove 가
       이 문서에 도달하지 않아 커서가 그 자리에 그대로 멈춘다 — iframe 안의
       bridge.js 가 좌표를 넘겨 준다. iframe 이 화면 전체를 덮으므로 좌표는 1:1 이고,
       elementFromPoint 로는 iframe 밖에 안 보이므로 모드도 같이 받는다. */
    let framed: null | { grow: boolean } = null;
    const onFramedMove = (e: MessageEvent) => {
      const m = (e.data as { pdMouse?: { x: number; y: number; grow?: boolean } } | null)?.pdMouse;
      if (!m || typeof m.x !== 'number' || typeof m.y !== 'number') return;
      mx = m.x;
      my = m.y;
      framed = { grow: !!m.grow };
    };
    addEventListener('message', onFramedMove);

    // Decide the cursor MODE each frame from the topmost element under the pointer (single source of
    // truth via elementFromPoint) instead of per-element mouseenter/leave. The top buttons overlap the
    // project panel AND drift (magnetic hover), which made enter/leave race and flicker is-view<->grow.
    let mode = '';
    let raf = 0;
    const loop = () => {
      const el = framed ? null : document.elementFromPoint(mx, my);
      let m = framed && framed.grow ? 'grow' : '';
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
      removeEventListener('message', onFramedMove);
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

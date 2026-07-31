'use client';

import { useEffect, type RefObject } from 'react';
import { canHover, prefersReducedMotion } from '@/lib/dom';

type Item = {
  el: HTMLElement;
  tx: number; ty: number;
  x: number; y: number;
  vx: number; vy: number;
  zeroed: boolean;
};

const STRENGTH = 0.16;
const STIFF = 0.04;
const DAMP = 0.9;
const MAX = 25;
const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));

/* Magnetic + spring hover on the project cards.
   The card's own CSS `transition:transform .9s` plus the per-column `transition-delay` swallowed
   this — every per-frame transform write reset the delay. So while the spring drives a card we drop
   its CSS transition (the JS spring IS the smoothing) and restore it once the card is back at rest. */
export default function useMagneticCards(rootRef: RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!canHover() || prefersReducedMotion()) return;

    const items: Item[] = [];
    const cleanups: (() => void)[] = [];

    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const it: Item = { el, tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, zeroed: true };
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        // subtract the current translate to get the untransformed centre -> no feedback drift
        it.tx = clamp((e.clientX - (r.left + r.width / 2 - it.x)) * STRENGTH);
        it.ty = clamp((e.clientY - (r.top + r.height / 2 - it.y)) * STRENGTH);
      };
      const onLeave = () => {
        it.tx = 0;
        it.ty = 0;
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        el.style.transform = '';
        el.style.transition = '';
      });
      items.push(it);
    });
    if (!items.length) return;

    let raf = 0;
    const frame = () => {
      for (const it of items) {
        it.vx = (it.vx + (it.tx - it.x) * STIFF) * DAMP;
        it.x += it.vx;
        it.vy = (it.vy + (it.ty - it.y) * STIFF) * DAMP;
        it.y += it.vy;
        const atRest =
          it.tx === 0 && it.ty === 0 &&
          Math.abs(it.x) < 0.01 && Math.abs(it.y) < 0.01 &&
          Math.abs(it.vx) < 0.01 && Math.abs(it.vy) < 0.01;
        if (atRest) {
          if (!it.zeroed) {
            it.x = it.y = it.vx = it.vy = 0;
            it.el.style.transform = '';
            it.el.style.transition = '';
            it.zeroed = true;
          }
          continue;
        }
        if (it.zeroed) it.el.style.transition = 'none'; // entering active — the spring drives transform
        it.zeroed = false;
        it.el.style.transform = `translate(${it.x.toFixed(2)}px,${it.y.toFixed(2)}px)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, [rootRef, selector]);
}

'use client';

import { useEffect, type RefObject } from 'react';
import { afterFonts, prefersReducedMotion } from '@/lib/dom';

/* Hero load-reveal: blur-fade-in title + lead/desc, then the dot stamps in (about / projects /
   contact heroes all share it). Waits for the serif webfont so the title settles with final glyphs;
   rAF so the hidden state paints first, and a timeout failsafe so it's never stuck hidden. */
export default function useHeroReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    if (prefersReducedMotion()) {
      hero.classList.add('in');
      return;
    }
    return afterFonts(() => requestAnimationFrame(() => hero.classList.add('in')));
  }, [ref]);
}

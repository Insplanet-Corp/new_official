'use client';

import { useEffect } from 'react';
import { revealOnScroll } from '@/lib/dom';

/* Scroll-in reveals for the About page (ported from the two inline <script>s in about.html).

   Two groups, both gated at rootMargin -25% bottom so a target has to rise well past the bottom of
   the viewport before it fires — otherwise the reveal finishes the instant it peeks into view:

   1. Experience (04): the "Experience" title, the bold copy line, the 4 capability cards and the
      photo band, each observed individually (none is taller than the viewport).
   2. [data-rv] roots: Mission head / value-card row / Beyond UX (title+copy) / Beyond UX stats.
      Children stagger via CSS transition-delay (about.css). Mission & Vision and Beyond UX are tall
      sections split into TWO roots each so the bottom half doesn't finish revealing off-screen long
      before the section has scrolled in.

   ⚠️ .about-axcreator is itself taller than the viewport (its right column stacks copy+stats below
   the fold), so it's observed at threshold 0 — a % threshold of the whole tall box would arrive far
   too late. Every other root uses .15.

   The closing image (07) is NOT in here — it's a pinned scroll-scrub expansion driven by
   public/js/about-hero.js, and the expansion itself IS the reveal.

   Reduced motion / no IntersectionObserver -> revealOnScroll marks everything visible at once. */
const GATE = '0px 0px -25% 0px';

export default function AboutReveals() {
  useEffect(() => {
    const q = (sel: string) => Array.from(document.querySelectorAll(sel));

    const experience = [
      ...q('.about-fusion-title'),
      ...q('.about-exp-copy'),
      ...q('.about-gallery'),
      ...q('.core-value'),
    ];

    const roots = q('[data-rv]');
    const tall = document.querySelector('.about-axcreator[data-rv]');
    const normal = roots.filter((r) => r !== tall);

    const stops = [
      revealOnScroll(experience, 0.15, GATE),
      revealOnScroll(normal, 0.15, GATE),
      revealOnScroll(tall ? [tall] : [], 0, GATE),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);

  return null;
}

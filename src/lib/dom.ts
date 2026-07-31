/* Small helpers shared by the ported scroll/reveal effects. */

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches;

export const canHover = (): boolean =>
  typeof window !== 'undefined' && matchMedia('(hover:hover) and (pointer:fine)').matches;

/** rAF-throttled scroll + resize binding. Runs `update` once immediately; returns the teardown. */
export function bindScroll(update: () => void): () => void {
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', update);
  update();
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', update);
  };
}

/** One-shot `.in` reveal as each element scrolls into view. */
export function revealOnScroll(elements: Element[], threshold: number): () => void {
  if (!elements.length) return () => {};
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold },
  );
  elements.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/** Wait for the serif webfont so a blur reveal plays with final glyphs, never stuck hidden. */
export function afterFonts(run: () => void, failsafeMs = 800): () => void {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    run();
  };
  const t = setTimeout(go, failsafeMs);
  if (document.fonts?.ready) document.fonts.ready.then(go);
  else go();
  return () => clearTimeout(t);
}

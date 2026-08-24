/* Submit gating + jump-to-first-missing, shared by the inquiry form and the recruit popup.
   The submit button stays inactive (gray) until every required field is filled; pressing it while
   incomplete scrolls to the first missing field, focuses it and pulses it. */

export type RequiredField = {
  ok: () => boolean;
  /** element to scroll to */
  scroll: HTMLElement | null;
  /** element to focus once we arrive */
  focus: HTMLElement | null;
  /** element to pulse red */
  flash: HTMLElement | null;
};

type LenisLike = { scrollTo?: (t: unknown, o?: unknown) => void };

export const allFilled = (fields: RequiredField[]): boolean => fields.every((f) => f.ok());

export const firstMissing = (fields: RequiredField[]): RequiredField | undefined =>
  fields.find((f) => !f.ok());

export function jumpToField(
  field: RequiredField,
  {
    useLenis = false,
    focusDelay = 650,
    flashClass = 'ct-flash',
  }: { useLenis?: boolean; focusDelay?: number; flashClass?: string } = {},
) {
  const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
  if (field.scroll) {
    if (useLenis && lenis?.scrollTo) {
      lenis.scrollTo(field.scroll, { offset: -Math.round(innerHeight * 0.28), duration: 1 });
    } else {
      field.scroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  setTimeout(() => {
    try {
      field.focus?.focus({ preventScroll: true });
    } catch {
      /* focus can throw while the element is animating */
    }
  }, focusDelay);
  const fe = field.flash;
  if (fe) {
    fe.classList.remove(flashClass);
    void fe.offsetWidth; // restart the animation
    fe.classList.add(flashClass);
    setTimeout(() => fe.classList.remove(flashClass), 1000);
  }
}

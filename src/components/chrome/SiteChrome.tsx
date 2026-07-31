/* Fixed / ambient chrome that is identical on every page (was the CHROME string in js/shared-ui.js).
   Everything here is position:fixed or absolute, so its place in the DOM is cosmetic — it just has to
   live inside #page-root so the page transition fades it with the rest of the page.
   The ids are the contract with public/js/main.js (bg arcs, magnetic hover, adaptive contrast). */
export default function SiteChrome() {
  return (
    <>
      <div id="bg-line">
        <span className="circ circ-1" />
        <span className="circ circ-2" />
      </div>
      <a id="ci-logo" href="/" aria-label="Insplanet 홈">
        <img src="/assets/ci_logo.svg" alt="Insplanet" />
      </a>
      <a id="lets-talk" href="/contact">
        <span>Let&rsquo;s Talk</span>
      </a>
      <div id="full-menu" tabIndex={-1}>
        <img src="/assets/menu_icon.svg" alt="menu" />
      </div>
      <div id="scroll-hint">
        <span className="bar" />
        <span className="label">SCROLL</span>
      </div>
    </>
  );
}

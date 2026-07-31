/* Adaptive routing between the PC page and the dedicated mobile page.
   Rendered as an inline script so it runs the moment the tag is parsed — before the sections
   below it paint — exactly like the blocking <script> in the old <head>. */
export default function AdaptiveRedirect({
  query,
  to,
}: {
  /** media query that means "you are on the wrong page" */
  query: string;
  /** route to bounce to */
  to: string;
}) {
  const js = `if(matchMedia(${JSON.stringify(query)}).matches)location.replace(${JSON.stringify(
    to,
  )}+location.search+location.hash);`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

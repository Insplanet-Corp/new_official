import { Fragment, type ReactNode } from 'react';

/* Renders a list of copy lines with a hard <br> between them — the TSX stand-in for the
   hand-placed line breaks the Figma frames rely on. */
export default function Lines({ text }: { text: readonly string[] }): ReactNode {
  return text.map((line, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

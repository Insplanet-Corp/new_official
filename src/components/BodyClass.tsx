'use client';

import { useEffect } from 'react';

/* The static pages carried a per-page <body class> (about-page / projects-page / contact-page).
   <body> is owned by the root layout, so each page asks for its class here instead. */
export default function BodyClass({ name }: { name: string }) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);

  return null;
}

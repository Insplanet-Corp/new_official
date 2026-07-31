import type { ReactNode } from 'react';
import LegacyRuntime, { type DeferredScript } from '@/components/LegacyRuntime';
import MenuOverlay from '@/components/chrome/MenuOverlay';
import SiteChrome from '@/components/chrome/SiteChrome';
import SiteFooter from '@/components/chrome/SiteFooter';

type Props = {
  children: ReactNode;
  deferred?: DeferredScript[];
  scripts?: string[];
};

/* Everything lives in #page-root so the page transition can fade it as one (public/js/main.js).
   Chrome / footer / menu come last, exactly where shared-ui.js used to append them. */
export default function PageShell({ children, deferred, scripts }: Props) {
  return (
    <>
      <div id="page-root">
        {children}
        <SiteChrome />
        <SiteFooter />
        <MenuOverlay />
      </div>
      <LegacyRuntime deferred={deferred} scripts={scripts} />
    </>
  );
}

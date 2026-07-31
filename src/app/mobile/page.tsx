import type { Metadata } from 'next';
import AdaptiveRedirect from '@/components/AdaptiveRedirect';
import Hero from '@/components/home/Hero';
import SiteChrome from '@/components/chrome/SiteChrome';
import MobileBeyond from '@/components/mobile/MobileBeyond';
import MobileInsight from '@/components/mobile/MobileInsight';
import MobilePartners from '@/components/mobile/MobilePartners';
import MobileRuntime from '@/components/mobile/MobileRuntime';
import MobileServices from '@/components/mobile/MobileServices';
import '@/styles/mobile.css';

export const metadata: Metadata = { title: 'Insplanet — Mobile (hero WIP)' };

export default function MobilePage() {
  return (
    <>
      {/* desktop/tablet (≥768) bounce to the PC page */}
      <AdaptiveRedirect query="(min-width:768px)" to="/" />
      <div id="page-root">
        <Hero />
        <MobileBeyond />
        <MobileInsight />
        <MobileServices />
        <MobilePartners />
        {/* shared header chrome — inlined for the isolated workspace (no footer / full menu yet) */}
        <SiteChrome />
      </div>
      <MobileRuntime />
    </>
  );
}

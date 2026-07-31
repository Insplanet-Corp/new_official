import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Cursor from '@/components/chrome/Cursor';
// self-hosted webfonts (Pretendard, Cormorant Garamond, Roboto Serif) — no external CDN
import '@/styles/fonts.css';
import '@/styles/style.css';

export const metadata: Metadata = {
  title: 'Insplanet',
  // stop iOS Safari from auto-linking phone numbers / emails / addresses (turns them blue)
  other: { 'format-detection': 'telephone=no, email=no, address=no, date=no' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        {/* outside #page-root: a page-transition transform must never scale the cursor */}
        <Cursor />
      </body>
    </html>
  );
}

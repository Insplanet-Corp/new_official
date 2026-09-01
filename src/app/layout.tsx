import type { Metadata, Viewport } from 'next';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_SHARE, SITE_URL } from '@/data/seo';
import type { ReactNode } from 'react';
import Analytics from '@/components/chrome/Analytics';
import Cursor from '@/components/chrome/Cursor';
import SiteJsonLd from '@/components/chrome/SiteJsonLd';
// self-hosted webfonts (Pretendard, Cormorant Garamond, Roboto Serif) — no external CDN
import '@/styles/fonts.css';
import '@/styles/style.css';

/* ⚠️ metadataBase 가 없으면 openGraph/twitter 의 이미지 경로가 상대경로로 나가서
   카톡·슬랙 미리보기가 안 뜬다. canonical 도 절대주소로 만들어 준다. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /* 각 페이지가 title 만 주면 " — Insplanet" 이 자동으로 붙는다 */
  title: { default: `${SITE_NAME} — 디지털 프로덕트 전문 기업`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    url: SITE_URL,
    /* ⚠️ 브라우저 탭·검색결과 제목과 **일부러 다르다** — 공유 카드는 브랜드만,
       검색결과는 무슨 회사인지 드러나는 문장. (SITE_NAME_SHARE 주석 참고) */
    title: SITE_NAME_SHARE,
    description: SITE_DESCRIPTION,
    /* 카톡·슬랙·페이스북 공유 카드. 지정하지 않으면 플랫폼이 페이지에서 아무 이미지나
       골라 오는데, 이 사이트는 큰 이미지가 포트폴리오 썸네일뿐이라 엉뚱한 게 잡힌다.
       1200x630 은 대부분의 플랫폼이 잘라내지 않고 그대로 쓰는 비율이다. */
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME_SHARE, images: [OG_IMAGE] },
  /* 파비콘 — 브라우저 테마에 따라 갈린다(로고가 단색이라 한 장으로는 한쪽에서 안 보인다).
     ⚠️ `.ico` 를 **맨 앞에** 둔다. `media` 를 안 보는 브라우저(사파리 등)는 목록에서
     마지막 것을 집는 경향이 있어, 순서를 뒤집으면 그런 브라우저가 항상 dark 판을 쓴다.
     ⚠️ 파일은 `public/` 에 있으므로 경로는 루트 기준(`/favicon-light.png`)이다.
     ⚠️ `src/app/` 에 `favicon.ico`/`icon.png` 을 두는 파일 컨벤션과 섞지 말 것 —
     그쪽이 있으면 Next 가 <link> 를 하나 더 만들어 어느 쪽이 이길지 알기 어려워진다. */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
      {
        url: '/favicon-light.png',
        type: 'image/png',
        sizes: '136x136',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-dark.png',
        type: 'image/png',
        sizes: '136x136',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    /* 검색결과 미리보기를 넉넉히 허용한다 — AI 검색·리치결과가 본문을 더 많이 인용한다 */
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
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
        <SiteJsonLd />
        {children}
        {/* 방문 기록 — Supabase Edge Function 'track' 을 부른다 */}
        <Analytics />
        {/* outside #page-root: a page-transition transform must never scale the cursor */}
        <Cursor />
      </body>
    </html>
  );
}

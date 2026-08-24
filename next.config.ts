import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.BUILD_DIR || '.next',
  // The legacy WebGL / scroll runtime in /public/js drives the DOM imperatively.
  // Nothing here needs the image optimizer: every asset is a hand-tuned SVG/PNG
  // served straight from /public via plain <img>.
  images: { unoptimized: true },
  devIndicators: false,

  async headers() {
    return [
      {
        /* 프로젝트 상세(public/portfolio/*)는 allow-same-origin 없는 sandbox iframe 안에서
           돈다 — 세션 토큰 때문에 일부러 그렇게 뒀다(CLAUDE.md 15번). 그 문서의 origin 은
           'null' 이고, @font-face 의 폰트 요청만은 **항상 CORS 모드**로 나간다(이미지·CSS·JS
           는 no-cors 라 그냥 뜬다). 이 헤더가 없으면 200 으로 받아 놓고도 CORS 검사에서
           버려져 상세에서만 폰트가 조용히 폴백된다 — 콘솔 한 줄 외에 아무 증상이 없다.
           폰트는 자격증명 없이(anonymous) 요청되므로 '*' 로 충분하고, 이걸 붙이는 편이
           sandbox 에 allow-same-origin 을 되돌리는 것보다 안전하다. */
        source: '/assets/fonts/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default nextConfig;

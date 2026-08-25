import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.BUILD_DIR || '.next',
  // The legacy WebGL / scroll runtime in /public/js drives the DOM imperatively.
  // Nothing here needs the image optimizer: every asset is a hand-tuned SVG/PNG
  // served straight from /public via plain <img>.
  images: { unoptimized: true },
  devIndicators: false,

  /* ⚠️ 다른 컴퓨터에서 http://<이 맥의 LAN IP>:5599 로 접속할 때 필요하다.
     Next 16 의 dev 서버는 localhost 가 아닌 host 로 들어온 /_next/* 요청 중
     Origin 헤더가 붙는 것(= HMR 웹소켓 업그레이드)을 403 으로 막는다
     (server/lib/router-utils/block-cross-site-dev.ts). 스크립트·CSS 는 GET 이라
     Origin 이 없어 200 으로 잘 내려오므로 **화면은 그대로 뜨고**, 웹소켓만 죽는데
     Turbopack dev 런타임이 그 연결 위에서 앱 엔트리를 실행해서 결과적으로
     하이드레이션이 끝나지 않는다 → LegacyRuntime 이 /js/main.js 를 못 붙이고
     클릭·스크롤 리빌이 전부 죽은 정적 화면이 된다(콘솔엔 WebSocket failed 한 줄뿐).
     와일드카드는 점 단위 세그먼트로만 매칭된다 — '192.168.**' 은 무효, '192.168.*.*' 로 쓸 것.
     dev 전용 설정이라 배포(next start)에는 영향이 없다. */
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*', '172.17.*.*', '*.local'],

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

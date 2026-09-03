import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.BUILD_DIR || '.next',
  // The legacy WebGL / scroll runtime in /public/js drives the DOM imperatively.
  // Nothing here needs the image optimizer: every asset is a hand-tuned SVG/PNG
  // served straight from /public via plain <img>.
  images: { unoptimized: true },
  devIndicators: false,

  /* ⚠️ Vercel 은 서버 번들에 "필요하다고 추적된" 파일만 넣는다 — public/ 이 통째로
     람다에 들어가지 않는다(정적 에셋은 CDN 에서만 서빙된다). /projects/[id] 가
     상세 HTML 을 fs 로 읽어 <project-detail> 속성(고객사·개요)을 뽑으므로
     (src/lib/portfolioDetail.ts) 그 파일들을 명시적으로 포함시킨다.
     **지우면 조용히 실패한다** — 화면은 멀쩡하고 검색용 description 만 일반 문구로
     되돌아간다. 배포 후 상세 한 곳의 description 을 확인해 볼 것. */
  outputFileTracingIncludes: {
    '/projects/[id]': ['./public/portfolio/*/index.html'],
  },

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

  /* 옛 사이트(insplanet.co.kr, Vue SPA)에서 넘어오는 주소를 새 구조로 보낸다.

     옛 라우트는 번들에서 확인했다 — `/`, `/contact`, `/work`, `/work/:workId`,
     `/admin`, `/admin/login`. 이 중 `/work` 계열만 새 사이트에서 이름이 다르다.

     ⚠️ 301(영구)이어야 검색엔진이 색인을 새 주소로 옮긴다. `permanent: true` 가 308 을
        내보내는데, 308 은 301 과 같은 "영구" 신호이고 메서드를 보존하는 최신 코드다.
     ⚠️ 상세는 1:1 로 못 옮긴다 — 옛 주소는 `/work/bizpay` 처럼 손으로 정한 슬러그이고
        새 주소는 `/projects/<uuid>` 라 대응표가 없다. 목록으로 보낸다. 링크 가치가
        분산되지만 404 로 버리는 것보다 낫다. 나중에 슬러그 컬럼을 두면 그때 개별 매핑할 것. */
  async redirects() {
    return [
      { source: '/work', destination: '/projects', permanent: true },
      { source: '/work/:slug', destination: '/projects', permanent: true },

      /* 옛 회사소개서 주소. 컷오버 전까지 실제로 200 으로 살아 있던 파일이라
         (https://www.insplanet.co.kr/brochure/insplanet_brief.pdf) 메일·제안서에
         뿌려졌을 수 있다. 새 사이트에는 그 경로가 없으므로 짧은 주소로 보낸다.
         파일명이 여러 개였어서(insplanet_brief_20250709.pdf 등) :path* 로 받는다. */
      { source: '/brochure/:path*', destination: '/brief.pdf', permanent: true },

      /* 옛 어드민의 브로셔 관리 경로 (새 이름은 brief) */
      { source: '/admin/brochure', destination: '/admin/brief', permanent: true },
    ];
  },

  /* 회사소개서 PDF 를 짧은 주소로 연다.

       /brief.pdf  ->  <SUPABASE>/storage/v1/object/public/brief/insplanet_brief.pdf

     Vercel 이 리버스 프록시로 대신 받아 오므로 **주소창에도 짧은 주소가 그대로 남는다**.
     리다이렉트로 하면 새 탭이 결국 긴 Supabase 주소로 바뀐다.

     ⚠️ 확장자(.pdf)를 붙인 이유가 있다 — src/middleware.ts 의 matcher 가 점이 든 경로를
        제외한다. 확장자가 없으면 어드민 서브도메인에서 /brief 가 /admin/brief
        (회사소개서관리 화면)로 rewrite 돼 PDF 대신 어드민 페이지가 열린다.
     ⚠️ 환경변수가 없으면 rewrite 를 만들지 않는다. 빈 문자열을 destination 에 넣으면
        상대경로가 되어 자기 자신으로 무한히 돈다.
     ⚠️ 짝은 src/data/site.ts 의 BRIEF_PDF 다 — 한쪽만 바꾸면 404. */
  async rewrites() {
    const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabase) return [];
    return [
      {
        source: '/brief.pdf',
        destination: `${supabase}/storage/v1/object/public/brief/insplanet_brief.pdf`,
      },
    ];
  },

  async headers() {
    return [
      {
        /* 회사소개서(약 18.7MB)를 Vercel CDN 에도 재워 둔다.

           Storage 원본은 `cache-control: max-age=3600` 을 준다(2026-08-31 실측).
           그래도 명시하는 이유는 두 가지다: ① 업로드 때 cacheControl 을 안 주면
           Supabase 기본값이 `no-cache` 라 조용히 무캐시로 돌아간다(실제로 세션 중
           한 번 그 상태였다) ② 브라우저와 CDN 의 수명을 따로 주려면 어차피 필요하다.

           캐시가 없으면 열 때마다 18.7MB 가 **Supabase 무료 전송량(5GB/월 ≈ 267회)**
           에서 빠져나간다. Vercel CDN 이 받아 두면 그 부담이 Vercel 쪽
           (Hobby 100GB ≈ 5,300회)으로 옮겨간다.

           ⚠️ 대가는 **최대 1시간의 지연**이다 — 어드민에서 파일을 교체해도 CDN 에 남은
              옛 파일이 그때까지 나갈 수 있다. 급하면 Vercel 에서 재배포하면 된다.
           ⚠️ 브라우저에는 캐시를 주지 않는다(must-revalidate) — 사람이 새로고침하면
              바로 새 파일을 본다. 재워 두는 건 CDN 한 곳뿐이다.
           ⚠️ **로컬 `next start` 에서는 이 헤더가 안 붙는다** — 프록시 응답에 상류
              헤더가 그대로 통과한다(실측). 이 블록이 실제로 먹는지는 Vercel 에 올려
              `curl -I` 로 확인해야 한다. */
        source: '/brief.pdf',
        headers: [
          { key: 'Vercel-CDN-Cache-Control', value: 'max-age=3600' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
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
      {
        /* ⚠️ 상세 HTML(public/portfolio/<폴더>/index.html)은 iframe 안에서만 쓰이지만
           **그 자체로 크롤 가능한 주소**다. robots.txt 는 /admin·/api 만 막고, 구글은
           iframe 의 src 를 따라간다. 그런데 37개 중 32개의 <title> 이 템플릿 그대로
           'Work Container - 프로젝트명' 이라, 색인되면 똑같은 제목의 페이지가 무더기로
           검색결과에 뜬다(2026-08-26 실측). 색인돼야 하는 것은 이걸 감싸는
           /projects/<id> 쪽이다.

           ⚠️ robots.txt 로 막으면 안 된다 — 크롤 자체가 막히면 noindex 를 읽지 못해
              오히려 "설명 없음" 상태로 색인될 수 있다. 헤더로 막아야 한다.
           ⚠️ 폴더 아래 이미지·CSS 까지 싸잡지 않으려고 문서 경로만 지정한다. */
        source: '/portfolio/:folder/index.html',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        // 폴더 주소로 들어오는 경우도 같이 막는다
        source: '/portfolio/:folder',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
};

export default nextConfig;

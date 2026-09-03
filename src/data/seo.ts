/* 사이트 전역 SEO 상수. 메타데이터·robots·sitemap·JSON-LD 가 전부 여기를 본다.

   ⚠️ SITE_URL 은 **www 를 포함한 최종 주소**여야 한다. insplanet.co.kr 은 www 로 308
   리다이렉트되므로, canonical/OG/sitemap 이 www 없는 주소를 가리키면 검색엔진이 매번
   리다이렉트를 한 번 더 타고 신호가 두 주소로 흩어진다. */
const PRODUCTION_URL = 'https://www.insplanet.co.kr';

/* 배포 주소를 **그 배포가 실제로 서비스되는 호스트**로 맞춘다.

   ⚠️ 이걸 하드코딩해 두면 미리보기/테스트 배포의 og:image 가 실서비스 도메인을 가리킨다.
      그 도메인이 아직 옛 사이트면 이미지 요청에 옛 SPA 의 index.html(text/html)이 돌아와서
      **카톡·슬랙 공유 카드의 이미지가 빈 회색으로 뜬다** — 2026-08-26 실측으로 확인한
      증상이다(og:image 200 인데 content-type 이 text/html).

   우선순위 —
     1. NEXT_PUBLIC_SITE_URL   손으로 지정한 값이 언제나 이긴다(문제가 생기면 이걸로 덮는다)
     2. VERCEL_PROJECT_PRODUCTION_URL  Vercel 이 넣어 주는 그 프로젝트의 대표 도메인.
        커스텀 도메인이 붙어 있으면 그 도메인이고, 없으면 <project>.vercel.app 이다.
     3. 로컬/그 외 → 실서비스 도메인

   ⚠️ 이 상수는 metadata·robots·sitemap·JSON-LD 등 **서버에서만** 쓴다(확인함). 그래서
      NEXT_PUBLIC_ 없는 시스템 변수를 그대로 읽어도 된다 — 대시보드의 "시스템 환경변수
      노출" 설정과 무관하게 항상 들어온다. 클라이언트 컴포넌트에서 import 하게 되면
      그때는 NEXT_PUBLIC_ 붙은 쪽만 살아남으므로 이 주석을 다시 볼 것. */
const host =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
  '';

export const SITE_URL = host
  ? (host.startsWith('http') ? host : `https://${host}`).replace(/\/+$/, '')
  : PRODUCTION_URL;

/* 이 배포가 **실서비스 도메인에서 도는 프로덕션 배포인가.** robots.ts 가 색인을
   열지 말지 판단하는 데만 쓴다.

   ⚠️ 이게 없으면 미리보기 배포(*.vercel.app)가 `Allow: /` + sitemap 을 그대로
      내보낸다 — 내용이 똑같은 사이트가 두 개 색인되면 검색 신호가 갈린다.
      실제로 테스트 배포(new-official-sooty.vercel.app)가 그 상태였다(2026-09-03 실측).

   판정이 둘인 이유 —
     · `VERCEL_ENV === 'preview'` : 브랜치 미리보기는 무조건 막는다.
     · 호스트가 insplanet.co.kr 이 아니면 막는다 : 별도 Vercel 프로젝트에
       올라간 사본(테스트용 *.vercel.app)은 그쪽에서도 VERCEL_ENV 가
       'production' 이라 위 검사만으로는 안 걸린다.

   ⚠️ 안전한 쪽으로 실패한다 — NEXT_PUBLIC_SITE_URL 을 깜빡해도 커스텀 도메인이
      붙은 프로덕션이면 VERCEL_PROJECT_PRODUCTION_URL 이 insplanet.co.kr 이라
      색인이 유지된다. 반대로 실수로 막히는 경우는 없다. */
export const IS_INDEXABLE_DEPLOY =
  process.env.VERCEL_ENV !== 'preview' &&
  new URL(SITE_URL).hostname.endsWith('insplanet.co.kr');

export const SITE_NAME = 'Insplanet';

/* 공유 카드(카톡·슬랙·페이스북)에 뜨는 제목. 브라우저 탭·검색결과 제목과 **일부러
   다르다** — 카드는 브랜드만 크게 보이는 편이 낫고, 검색결과는 무슨 회사인지 드러나야
   클릭을 받는다. (2026-08-26 사용자 결정) */
export const SITE_NAME_SHARE = 'INSPLANET';
export const SITE_NAME_KO = '인스플래닛';

/* 검색결과에 그대로 노출되는 문장이다. 길이는 한글 기준 80자 안팎이 잘리지 않는다. */
export const SITE_DESCRIPTION =
  '비즈니스의 본질을 꿰뚫는 통찰과 정교한 기술력으로 아이디어를 현실로 만듭니다. 금융·모빌리티·공공 분야의 웹·앱 UI/UX 설계와 프론트엔드 구축을 수행하는 디지털 프로덕트 전문 기업입니다.';

/* 공유 카드(카톡·슬랙·페이스북)에 뜨는 설명. **검색결과 설명과 일부러 다르다.**

   SITE_DESCRIPTION 은 검색결과에 그대로 노출되므로 무슨 회사인지 길게 설명해야 클릭을
   받는다. 반면 공유 카드는 카톡 채팅방에서 두 줄 안에 잘려 나가므로 긴 문장을 넣으면
   "비즈니스의 본질을 꿰뚫는 통찰과 정교한 기술력으로 아이디어를 …" 처럼 문장 중간에서
   끊긴다(2026-09-03 이관 직후 실제로 그렇게 나왔다). 그래서 카드에는 홈 히어로와 같은
   브랜드 문구를 건다(components/home/BeyondSwap.tsx 의 두 줄).

   ⚠️ 이건 og:description / twitter:description 에만 쓴다. `<meta name="description">`
      (검색결과)에 이걸 넣으면 검색 스니펫이 브랜드 문구 한 줄로 줄어든다.
   ⚠️ 하위 페이지(/about /contact /projects)는 각자 자기 og:description 을 갖고 있고
      그대로 둔다 — 문의 페이지 링크에는 문의 설명이 나오는 편이 맞다. */
export const SITE_DESCRIPTION_SHARE = 'Beyond UX The AX Creator';

/* AEO — AI 검색이 "이 회사가 뭐 하는 곳인가"에 답할 때 근거로 삼는 문장들.
   페이지 본문에 흩어져 있는 정보를 한 줄로 요약해 JSON-LD 로 같이 내보낸다. */
export const SERVICES = [
  'UI/UX 디자인',
  '웹 · 모바일 프론트엔드 구축',
  '디자인 시스템 · 퍼블리싱',
  'CMS · 관리자 시스템 구축',
  '연간 유지보수',
] as const;

export const OG_IMAGE = `${SITE_URL}/assets/og-default.png`;

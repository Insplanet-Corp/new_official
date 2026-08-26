import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/data/seo';

/* /robots.txt 를 Next 가 생성한다.

   ⚠️ 옛 사이트(Vue SPA)에는 robots.txt 가 아예 없었다 — 요청하면 SPA 의 HTML 이
      200 으로 내려왔다. 그래서 검색엔진이 robots 를 읽은 적이 없다.

   /admin 은 막는다. 어차피 로그인 게이트가 있지만 색인될 이유가 없고, 로그인 화면이
   검색결과에 뜨는 것도 좋지 않다. /api 도 같다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/admin/', '/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

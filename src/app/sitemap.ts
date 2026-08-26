import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/data/seo';
import { supabase } from '@/lib/supabase';

/* /sitemap.xml 을 Next 가 생성한다. 고정 페이지 4개 + 공개된 프로젝트 상세.

   ⚠️ 프로젝트 상세(/projects/<id>)는 목록에서 클릭하면 시트로 열리지만, 주소를 직접
      열어도 동작하는 실제 라우트다. 그래서 사이트맵에 넣는다 — 이게 없으면 실적
      페이지가 검색에 아예 안 잡힌다.
   ⚠️ 상세 HTML 이 등록된 행만 넣는다(html_file 이 있는 행). 없는 행은 열어도 빈 시트라
      색인시킬 가치가 없다.
   ⚠️ DB 조회가 실패해도 사이트맵 자체는 나가야 한다 — 고정 페이지만이라도 남긴다. */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];

  const { data, error } = await supabase
    .from('portfolios')
    .select('id, updated_at, html_file')
    .eq('use_yn', 'Y')
    .not('html_file', 'is', null);

  if (error || !data) return staticPages;

  return [
    ...staticPages,
    ...data.map((p) => ({
      url: `${SITE_URL}/projects/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}

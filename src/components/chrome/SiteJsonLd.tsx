import { CONTACT } from '@/data/site';
import { SERVICES, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_KO, SITE_URL } from '@/data/seo';

/* 구조화 데이터(JSON-LD). 두 가지를 노린다 —

   SEO  : 구글이 회사 정보(이름·로고·주소·전화)를 리치 결과로 보여줄 근거.
   AEO  : ChatGPT·Perplexity 같은 AI 검색이 "인스플래닛이 뭐 하는 회사냐"에 답할 때
          본문을 추론하는 대신 여기 적힌 사실을 그대로 인용한다. 그래서 회사 소개 문장과
          서비스 목록을 **명시적으로** 적어 둔다.

   ⚠️ 여기 적는 값은 화면에 실제로 보이는 내용과 일치해야 한다. 화면에 없는 정보를
      구조화 데이터에만 넣으면 구글이 스팸으로 본다(주소·전화는 푸터에 그대로 있다).
   ⚠️ 사이트 전역이라 루트 레이아웃에서 한 번만 렌더한다. 페이지별 데이터(프로젝트 상세
      등)를 넣게 되면 그 페이지에서 따로 렌더할 것 — 여기에 몰아넣지 말 것. */
export default function SiteJsonLd() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: SITE_NAME_KO,
      url: SITE_URL,
      logo: `${SITE_URL}/assets/ci_logo.svg`,
      description: SITE_DESCRIPTION,
      email: CONTACT.email,
      telephone: CONTACT.tel,
      faxNumber: CONTACT.fax,
      address: {
        '@type': 'PostalAddress',
        streetAddress: CONTACT.address,
        addressLocality: '서울',
        addressCountry: 'KR',
      },
      knowsAbout: [...SERVICES],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'ko-KR',
    },
    {
      /* 무엇을 하는 회사인지 — AI 검색이 가장 자주 인용하는 항목이다 */
      '@type': 'ProfessionalService',
      '@id': `${SITE_URL}/#service`,
      name: `${SITE_NAME} 디지털 프로덕트 구축`,
      provider: { '@id': `${SITE_URL}/#organization` },
      areaServed: 'KR',
      serviceType: [...SERVICES],
    },
  ];

  return (
    <script
      type="application/ld+json"
      // JSON.stringify 결과라 사용자 입력이 섞이지 않는다
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}

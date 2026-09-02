import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DetailFrame from "@/components/projects/DetailFrame";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/data/seo";
import { storageRender } from "@/lib/images";
import { type DetailMeta, readDetailMeta } from "@/lib/portfolioDetail";
import {
  type Portfolio,
  categoriesOf,
  categoryLabel,
  detailSrc,
  formatPeriod,
  titleOneLine,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function load(id: string): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .eq("use_yn", "Y") // RLS 와 이중으로 — 007 참고
    .maybeSingle();
  if (error) {
    console.error("[projects/detail] 조회 실패:", error.message, error.code);
    return null;
  }
  return (data as Portfolio) ?? null;
}

/** 구글 스니펫은 한글 기준 80자 안팎에서 잘린다. 낱말 중간에서 끊지 않는다. */
function clamp(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

/* 검색결과·공유 카드에 쓸 한 문단.

   퍼블리셔가 상세 HTML 에 적어 둔 개요(overview-title + overview-text)를 **그대로**
   쓴다 — 사람이 쓴 문장이라 기계로 조립한 것보다 훨씬 낫고, 상세 히어로에 실제로
   보이는 내용이라 "본문에 없는 걸 메타에만 넣었다" 는 문제도 없다.
   못 읽었을 때만 DB 값으로 문장을 만든다.

   ⚠️ 폴백 문장에 한글 조사(을/를, 와/과)를 **쓰지 않는다.** 고객사·프로젝트명이
      영문이라 받침 유무로 조사를 고를 수 없다 — 처음엔 "BizPay과 함께한" 이 나왔다.
      "고객사 BizPay." 처럼 명사만 나열하면 이 문제가 아예 안 생긴다. */
function describe(row: Portfolio, meta: DetailMeta | null): string {
  if (meta && (meta.overviewTitle || meta.overview.length)) {
    return clamp(
      [meta.overviewTitle, ...meta.overview].filter(Boolean).join(" "),
    );
  }
  const name = titleOneLine(row.title);
  const cats = categoriesOf(row);
  // 'Web, Mobile 프로젝트' — 분류가 여럿이면 그대로 이어 붙인다(022)
  const kind = cats.length ? `${categoryLabel(cats)} 프로젝트` : "프로젝트";
  const period = formatPeriod(row.started_on, row.ended_on);
  return [
    `${name} — 인스플래닛이 수행한 ${kind}입니다.`,
    row.client ? `고객사 ${row.client}.` : null,
    period !== "-" ? `수행기간 ${period}.` : null,
    "UI/UX 설계와 프론트엔드 구축 사례를 확인하세요.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** 공유 카드용 1200x630. 썸네일이 없으면 사이트 기본 OG 이미지 */
function ogImage(row: Portfolio): string {
  const thumb = row.thumb_main ?? row.thumb_pc ?? row.thumb_mobile;
  return thumb ? storageRender(thumb, { width: 1200, height: 630 }) : OG_IMAGE;
}

/* ⚠️ canonical 을 **반드시** 직접 준다. 안 주면 루트 레이아웃의 `canonical: '/'` 를
   그대로 물려받아, 상세 37개가 전부 "나는 홈페이지의 복사본이다" 라고 선언한다.
   sitemap 은 같은 37개를 색인하라고 하므로 정면으로 충돌하고, 그 상태에서는
   상세가 검색에 아예 안 잡힌다 — 2026-08-26 실측으로 확인한 상태였다.

   ⚠️ title 에 회사명을 붙이지 말 것. 루트의 title.template 이 ' — Insplanet' 을
   자동으로 붙인다 — 예전엔 여기서도 붙여서 'Insplanet — X — Insplanet' 이 나왔다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await load(id);

  if (!row) {
    return {
      title: "Projects",
      alternates: { canonical: "/projects" },
      // 없는 프로젝트를 색인시키지 않는다
      robots: { index: false, follow: true },
    };
  }

  const name = titleOneLine(row.title);
  const meta = await readDetailMeta(row.html_file);
  const description = describe(row, meta);
  const url = `/projects/${id}`;
  const image = ogImage(row);

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${name} — ${SITE_NAME}`,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

/* 이 페이지의 본문은 sandbox iframe 안이라 크롤러가 못 읽는다. 그래서 프로젝트가
   무엇인지를 구조화 데이터로 따로 알려 준다 — 숨긴 텍스트보다 이쪽이 훨씬 강한
   신호이고, "화면에 없는 내용을 넣었다" 는 오해도 사지 않는다(값이 전부 상세
   문서에 실제로 적혀 있는 사실이다). */
function ProjectJsonLd({
  row,
  id,
  meta,
}: {
  row: Portfolio;
  id: string;
  meta: DetailMeta | null;
}) {
  const name = titleOneLine(row.title);
  const genres = categoriesOf(row);
  const thumb = row.thumb_main ?? row.thumb_pc ?? row.thumb_mobile;
  /* 고객사는 상세 HTML 쪽이 더 잘 채워져 있다(37/37). DB 의 client 는 메인
     슬라이드용이라 비어 있는 행이 있다. */
  const client = meta?.client || row.client || "";
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${SITE_URL}/projects/${id}#project`,
    name,
    ...(meta?.en ? { alternateName: meta.en } : {}),
    url: `${SITE_URL}/projects/${id}`,
    /* description 은 잘라 쓰지만(스니펫 길이), 여기에는 개요 전문을 넣는다 —
       AI 검색이 인용할 문장이 많을수록 좋다. */
    description: describe(row, meta),
    ...(meta && meta.overview.length
      ? { abstract: [meta.overviewTitle, ...meta.overview].filter(Boolean).join(" ") }
      : {}),
    ...(meta?.ko ? { headline: meta.ko } : {}),
    inLanguage: "ko-KR",
    creator: { "@id": `${SITE_URL}/#organization` },
    /* ⚠️ height 를 빼면 안 된다 — width 만 주면 원본 높이가 그대로 남아
       5120x2880 썸네일이 1200x2880 세로 띠로 잘려 나간다(images.ts 주석 참고). */
    ...(thumb ? { image: storageRender(thumb, { width: 1200, height: 630 }) } : {}),
    ...(client
      ? { sourceOrganization: { "@type": "Organization", name: client } }
      : {}),
    /* genre 는 schema.org 에서 반복 가능한 속성이라 배열을 그대로 넣는다.
       하나뿐이면 문자열로 — 값이 하나인데 배열로 감싸면 소비자가 갈린다. */
    ...(genres.length
      ? { genre: genres.length === 1 ? genres[0] : genres }
      : {}),
    ...(row.ended_on ? { datePublished: row.ended_on } : {}),
    ...(row.award ? { award: "Web Award Korea" } : {}),
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** 화면에서는 안 보이지만 문서에는 남는 영역 (스크린리더도 이걸 읽는다) */
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await load(id);
  if (!row) notFound();

  // 경로 검증은 detailSrc 안에 있다 (목록의 시트도 같은 함수를 쓴다)
  const src = detailSrc(row.html_file);
  if (!src) notFound();

  const name = titleOneLine(row.title);
  const period = formatPeriod(row.started_on, row.ended_on);
  /* 상세 HTML 의 <project-detail> 속성 — 고객사·시기·개요가 여기 있다.
     못 읽으면 null 이고 아래는 전부 DB 값으로 되돌아간다(화면은 동일). */
  const meta = await readDetailMeta(row.html_file);
  const client = meta?.client || row.client || "";
  const launch = meta?.launch || row.launch || "";
  const categoryText = categoryLabel(categoriesOf(row));

  /* ⚠️ 사이트 헤더·푸터(PageShell)를 두르지 않는다. 상세 문서가 자기 CI 로고와
     닫기 버튼을 화면 모서리에 fixed 로 직접 그리므로 우리 헤더와 겹친다.
     시트에서 보든 이 주소로 바로 들어오든 같은 화면이 나오는 편이 낫다 —
     닫기는 상세 안의 링크가 /projects 로 보낸다.

     퍼블리셔 산출물은 public/portfolio/<폴더>/ 에 그대로 올린다 — index.html 이
     css/·img/ 를 상대경로로 참조하므로 같은 폴더에 두면 경로가 저절로 맞는다.
     (Storage 에 올리고 프록시가 상대경로를 고쳐 쓰는 방식도 만들어 봤지만,
      인라인 style 의 url()·srcset·JS 로 조립하는 경로를 정규식이 못 잡아
      산출물 형태에 따라 조용히 깨진다. 폴더째 두는 쪽이 훨씬 견고하다.)

     ⚠️ 본문이 iframe 안이라 검색엔진이 내용을 읽지 못한다. 아래 header 가
     문서에 남는 유일한 텍스트다 — 지우지 말 것. 진짜 해결은 상세 내용 일부를
     눈에 보이게 서버에서 그리는 것이고, 그건 디자인 결정이 필요하다. */
  return (
    <main>
      <ProjectJsonLd row={row} id={id} meta={meta} />

      <header style={srOnly}>
        <h1>{name}</h1>
        {meta?.ko ? <p>{meta.ko}</p> : null}
        <dl>
          {client ? (
            <>
              <dt>고객사</dt>
              <dd>{client}</dd>
            </>
          ) : null}
          {categoryText ? (
            <>
              <dt>분류</dt>
              <dd>{categoryText}</dd>
            </>
          ) : null}
          {launch ? (
            <>
              <dt>오픈</dt>
              <dd>{launch}</dd>
            </>
          ) : null}
          {period !== "-" ? (
            <>
              <dt>수행기간</dt>
              <dd>{period}</dd>
            </>
          ) : null}
        </dl>
        {meta && meta.overview.length ? (
          <section>
            {meta.overviewTitle ? <h2>{meta.overviewTitle}</h2> : null}
            {meta.overview.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>
        ) : (
          <p>{describe(row, meta)}</p>
        )}
        <a href="/projects">{SITE_NAME} 프로젝트 목록으로</a>
      </header>

      <DetailFrame src={src} title={`${name} 상세`} />
    </main>
  );
}

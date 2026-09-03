import DETAIL_HTML from "@/data/portfolioDetailHtml.json";
import { toDetailFolder } from "@/lib/portfolios";

/* 상세 HTML(public/portfolio/<폴더>/index.html) 안의 <project-detail> 속성을 읽는다.

   왜 필요한가 —
   상세 본문은 sandbox iframe 안에서 그려지므로 검색엔진·AI 크롤러가 한 글자도 못 읽는다.
   그런데 **필요한 문장은 이미 그 파일 안에 구조화돼 있다** — 퍼블리셔가 커스텀 엘리먼트
   속성에 고객사·시기·개요 제목·개요 본문을 적어 두었고, 2026-08-26 기준 37개 전부
   client/launch/overview-title/overview-text 를 갖고 있다(ko/en 은 21개).
   그래서 새로 글을 쓰는 대신 여기서 뽑아 metadata·JSON-LD 에 그대로 쓴다.

   ⚠️ **주석을 먼저 지워야 한다.** 각 문서 첫머리 주석에 `<project-detail>` 이라는
      문자열이 또 있어서, 그냥 찾으면 속성이 하나도 없는 그 가짜가 먼저 잡힌다
      (실제로 이걸로 "0/37" 이 나왔다).

   ⚠️ 이 모듈은 **서버 전용**이다. 예전에는 node:fs 를 써서 클라이언트에서 import 하면
      빌드가 깨졌지만, 지금은 조용히 통과하면서 **상세 HTML 124KB 를 브라우저 번들에
      실어 버린다.** metadata·JSON-LD 처럼 서버에서만 쓸 것.

   ⚠️ **파일을 런타임에 읽지 않는다.** scripts/gen-portfolio-detail-html.mjs 가
      빌드 전에 37개 index.html 을 src/data/portfolioDetailHtml.json 으로 굽고,
      여기서는 그걸 가져다 쓴다(124KB).

      예전에는 fs 로 읽고 next.config.ts 의 `outputFileTracingIncludes` 로 그 파일들을
      람다에 넣었는데, **그 방식이 배포를 막았다** — Next 의 추적기가 넣어 준 index.html
      을 열어 그 안이 참조하는 이미지까지 따라 들어가서 public/portfolio 의 PNG·JPG 가
      통째로 실렸다(실측 430.8MB). Vercel 함수 상한 250MB 를 넘겨
      `The Vercel Function "projects/[id]" is 432.92mb uncompressed` 로 거부됐다
      (2026-09-03 도메인 이관 중 실제로 겪음). outputFileTracingExcludes 로도 못 막는다.

   ⚠️ 상세를 새로 추가하면 dev/build 를 한 번 돌려야 JSON 에 들어온다
      (predev/prebuild 가 자동으로 부른다). 안 들어오면 description 이 일반 문구로
      되돌아가므로 console.warn 을 남긴다. */

export type DetailMeta = {
  /** 국문 부제 (없는 문서가 있다) */
  ko: string;
  /** 영문 부제 */
  en: string;
  client: string;
  /** 'Jul, 2021' 형식 */
  launch: string;
  overviewTitle: string;
  /** overview-text 를 '|' 로 끊은 문단들 */
  overview: string[];
};

/* 파일은 배포 중에 바뀌지 않으므로 프로세스마다 한 번만 읽는다.
   '없음'(null)도 캐시해서 없는 파일을 매 요청 뒤지지 않게 한다. */
const cache = new Map<string, DetailMeta | null>();

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const decode = (s: string) =>
  s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);

function parse(html: string): DetailMeta | null {
  // ⚠️ 주석 제거가 먼저다 (위 주석 참고)
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  const tag = /<project-detail\s+([^>]*)>/.exec(body);
  if (!tag) return null;

  const attrs = tag[1];
  const get = (name: string): string => {
    const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
    return m ? decode(m[1]).trim() : "";
  };

  const overview = get("overview-text")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ko: get("ko"),
    en: get("en"),
    client: get("client"),
    launch: get("launch"),
    overviewTitle: get("overview-title"),
    overview,
  };
}

/** `portfolios.html_file` 값을 그대로 넘긴다. 못 읽으면 null (화면은 그대로 동작) */
export async function readDetailMeta(
  htmlFile: string | null,
): Promise<DetailMeta | null> {
  const folder = toDetailFolder(htmlFile);
  if (!folder) return null;

  const cached = cache.get(folder);
  if (cached !== undefined) return cached;

  const html = (DETAIL_HTML as Record<string, string>)[folder];
  if (html === undefined) {
    /* 등록만 하고 폴더를 안 올렸거나, 상세를 추가한 뒤 생성 스크립트를 안 돌린 경우.
       화면은 iframe 이 알아서 404 를 보여 주므로 조용히 넘어가되, 검색용 description 이
       일반 문구로 되돌아간 것을 알아챌 수 있게 서버 로그에는 남긴다. */
    console.warn(
      `[portfolioDetail] 상세 HTML 이 번들에 없습니다: ${folder} ` +
        `(node scripts/gen-portfolio-detail-html.mjs 를 돌렸는지 확인)`,
    );
    cache.set(folder, null);
    return null;
  }

  const meta = parse(html);
  cache.set(folder, meta);
  return meta;
}

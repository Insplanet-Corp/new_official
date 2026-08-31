import { promises as fs } from "node:fs";
import path from "node:path";
import { DETAIL_INDEX, toDetailFolder } from "@/lib/portfolios";

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

   ⚠️ 이 모듈은 **서버 전용**이다(node:fs). 클라이언트 컴포넌트에서 import 하면 빌드가
      깨진다. metadata·JSON-LD 처럼 서버에서만 쓸 것.

   ⚠️ Vercel 은 서버 번들에 필요한 파일만 추적해 넣는다 — public/ 이 통째로 람다에
      들어가지 않는다. next.config.ts 의 `outputFileTracingIncludes` 가 이 파일들을
      포함시키는 짝이다. **그 설정을 지우면 읽기가 조용히 실패한다** — 화면은 멀쩡하고
      description 만 일반 문구로 되돌아가므로 알아채기 어렵다. 그래서 실패 시
      console.warn 을 남긴다. */

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

const BASE = path.join(process.cwd(), "public", "portfolio");

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

  const file = path.join(BASE, folder, DETAIL_INDEX);
  /* toDetailFolder 가 한 조각짜리 폴더명만 통과시키지만, 경로 조립은 한 번 더 확인한다 —
     이 함수의 입력은 DB 값이고 그 검증이 앞으로도 그대로일 거라고 가정하지 않는다. */
  if (!file.startsWith(BASE + path.sep)) {
    cache.set(folder, null);
    return null;
  }

  try {
    const meta = parse(await fs.readFile(file, "utf8"));
    cache.set(folder, meta);
    return meta;
  } catch {
    /* 파일이 없거나(등록만 하고 폴더를 안 올린 경우) 배포 번들에 안 실린 경우.
       화면은 iframe 이 알아서 404 를 보여 주므로 여기서는 조용히 넘어가되,
       추적 설정이 빠진 것을 알아챌 수 있게 서버 로그에는 남긴다. */
    console.warn(`[portfolioDetail] 상세 HTML 을 읽지 못했습니다: ${file}`);
    cache.set(folder, null);
    return null;
  }
}

#!/usr/bin/env node
/* public/portfolio/<폴더>/index.html 37개를 JSON 한 덩어리로 모은다.
   결과: src/data/portfolioDetailHtml.json  ({ "<폴더명>": "<파일 내용 그대로>" })

   왜 이걸 만드나 —
   src/lib/portfolioDetail.ts 가 상세 HTML 의 <project-detail> 속성을 읽어
   검색용 description·JSON-LD 를 만든다. 예전에는 요청 시점에 fs 로 읽었고,
   그 파일들을 서버 번들에 넣으려고 next.config.ts 에 outputFileTracingIncludes
   를 뒀는데 **그게 배포를 막았다**:

     Next 의 파일 추적기는 넣어 준 index.html 을 열어 그 안이 참조하는 파일까지
     따라 들어간다. 상세 문서가 <img src="img/hero-bg.jpg"> 로 자기 이미지를 걸고
     있어서 public/portfolio 의 PNG·JPG 가 통째로 실렸다 — 실측 430.8MB.
     Vercel 함수 상한 250MB 를 넘겨 `The Vercel Function "projects/[id]" is
     432.92mb uncompressed` 로 배포가 거부됐다(2026-09-03 도메인 이관 중 실제로 겪음).
     ⚠️ outputFileTracingExcludes 로는 못 막는다 — include 로 들어온 파일에는
        적용되지 않는 것을 실측으로 확인했다(414개 그대로).

   그래서 파일을 읽는 대신 **빌드 시점에 번들로 굽는다**. HTML 37개 합계가 188KB 라
   함수 크기에 사실상 영향이 없고, 런타임 디스크 접근도 사라진다.

   ⚠️ 이 스크립트는 **파싱을 하지 않는다** — 파일 내용을 그대로 옮기기만 한다.
      파서는 portfolioDetail.ts 한 곳에만 있어야 규칙이 갈리지 않는다.

   ⚠️ package.json 의 predev/prebuild 가 자동으로 부른다. 산출물은 **커밋한다** —
      혹시 그 훅이 안 돌아도 빌드가 성공해야 하기 때문이다.
      상세를 새로 추가하면 dev/build 를 한 번 돌리는 것으로 반영된다. */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "public", "portfolio");
const OUT = path.join(ROOT, "src", "data", "portfolioDetailHtml.json");

const map = {};
for (const name of readdirSync(SRC).sort()) {
  // _shared, _template 같은 공용 폴더는 상세 문서가 아니다
  if (name.startsWith("_") || name.startsWith(".")) continue;
  const file = path.join(SRC, name, "index.html");
  try {
    if (!statSync(file).isFile()) continue;
  } catch {
    continue; // index.html 이 없는 폴더 (예: kb-platform)
  }
  map[name] = readFileSync(file, "utf8");
}

const next = JSON.stringify(map, null, 0) + "\n";

/* 내용이 같으면 쓰지 않는다 — dev 에서 매번 mtime 을 건드리면 불필요한 재컴파일이 돈다 */
let prev = "";
try {
  prev = readFileSync(OUT, "utf8");
} catch {
  /* 첫 실행 */
}

if (prev === next) {
  console.log(`[portfolio-detail] 변경 없음 (${Object.keys(map).length}개)`);
} else {
  writeFileSync(OUT, next, "utf8");
  const kb = (Buffer.byteLength(next) / 1024).toFixed(0);
  console.log(`[portfolio-detail] ${Object.keys(map).length}개 기록 → ${path.relative(ROOT, OUT)} (${kb}KB)`);
}

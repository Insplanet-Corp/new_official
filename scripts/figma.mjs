/* Figma 파일에서 노드 정보와 PNG 를 받아온다.
   토큰은 .env.local 의 FIGMA_TOKEN 에서 읽는다 — 인자로 받지 않는다(셸 히스토리에 남는다).

   사용법:
     node scripts/figma.mjs meta  <node-id>            프레임 요약 (이름/크기/자식)
     node scripts/figma.mjs tree  <node-id> [깊이]      레이어 트리 + 치수·폰트·색
     node scripts/figma.mjs png   <node-id> [scale]    PNG 로 내보내 scratchpad 에 저장
     node scripts/figma.mjs text  <node-id>            텍스트 레이어만 전부 뽑기 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.FIGMA_TOKEN;
const FILE = env.FIGMA_FILE_KEY;
if (!TOKEN || !FILE) { console.error('.env.local 에 FIGMA_TOKEN / FIGMA_FILE_KEY 가 필요합니다'); process.exit(1); }

const api = async (path) => {
  const r = await fetch(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': TOKEN } });
  if (!r.ok) { console.error(`Figma API ${r.status}: ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  return r.json();
};

const [cmd, rawId, arg] = process.argv.slice(2);
const id = (rawId || '').replace('-', ':');

const px = (n) => (n == null ? null : Math.round(n * 100) / 100);
const hex = (c) =>
  c ? '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') : null;
const fill = (n) => {
  const f = (n.fills || []).find((x) => x.visible !== false && x.type === 'SOLID');
  return f ? hex(f.color) : null;
};

/* ⚠️ Figma API 는 **숨긴 레이어까지** 내려준다(visible:false). 그걸 모르고 읽으면
   디자인에 없는 요소를 만들게 된다 — 실제로 모바일 푸터의 "Scroll to Top" 과
   ROAI/Inspick/Archy 링크를 넣을 뻔했다(둘 다 숨김 상태였다). 기본은 숨긴 것을 건너뛰고,
   확인이 필요하면 SHOW_HIDDEN=1 로 켠다. */
const HIDDEN = process.env.SHOW_HIDDEN === '1';
const shown = (n) => HIDDEN || n.visible !== false;

const line = (n, d) => {
  const b = n.absoluteBoundingBox;
  const bits = [`${'  '.repeat(d)}${n.type} "${n.name}"`];
  if (b) bits.push(`${px(b.width)}x${px(b.height)} @ ${px(b.x)},${px(b.y)}`);
  if (n.layoutMode && n.layoutMode !== 'NONE')
    bits.push(`${n.layoutMode === 'HORIZONTAL' ? 'row' : 'col'} gap:${n.itemSpacing ?? 0} pad:${n.paddingTop ?? 0}/${n.paddingRight ?? 0}/${n.paddingBottom ?? 0}/${n.paddingLeft ?? 0}`);
  if (n.style) bits.push(`${n.style.fontFamily} ${n.style.fontWeight} ${n.style.fontSize}px/${px(n.style.lineHeightPx)}`);
  const c = fill(n);
  if (c) bits.push(c);
  if (n.cornerRadius) bits.push(`r:${n.cornerRadius}`);
  if (n.type === 'TEXT') bits.push(JSON.stringify((n.characters || '').slice(0, 60)));
  return bits.join('  ');
};

const walk = (n, d, max, out) => {
  out.push(line(n, d) + (n.visible === false ? '   ← 숨김' : ''));
  if (d >= max) return out;
  for (const k of n.children || []) if (shown(k)) walk(k, d + 1, max, out);
  return out;
};

const nodes = async () => (await api(`/files/${FILE}/nodes?ids=${encodeURIComponent(id)}`)).nodes[id].document;

if (cmd === 'meta') {
  const n = await nodes();
  console.log(line(n, 0));
  for (const k of n.children || []) if (shown(k)) console.log(line(k, 1));
} else if (cmd === 'tree') {
  console.log(walk(await nodes(), 0, Number(arg || 3), []).join('\n'));
} else if (cmd === 'text') {
  const out = [];
  (function rec(n) {
    if (!shown(n)) return;
    if (n.type === 'TEXT') out.push(`${n.name}: ${JSON.stringify(n.characters)}`);
    (n.children || []).forEach(rec);
  })(await nodes());
  console.log(out.join('\n'));
} else if (cmd === 'png') {
  const r = await api(`/images/${FILE}?ids=${encodeURIComponent(id)}&format=png&scale=${arg || 1}`);
  const url = r.images[id];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const file = `${process.env.SCRATCH || '.'}/figma-${id.replace(':', '-')}.png`;
  writeFileSync(file, buf);
  console.log(`${file}  ${(buf.length / 1024).toFixed(0)}KB`);
} else {
  console.error('meta | tree | text | png');
}

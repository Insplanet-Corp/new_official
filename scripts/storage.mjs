/* Supabase Storage 점검·백업.

   왜 필요한가 — 무료 플랜은 **파일 저장소 1GB · 월 전송량 5GB** 가 상한이고,
   넘어도 미리 알려 주지 않는다. 게다가 **Storage 의 파일은 어떤 플랜에서도 DB
   백업에 들어가지 않는다**(백업에는 메타데이터만 담긴다). 즉 견적문의 첨부와
   이력서는 지금 사본이 한 벌뿐이다 — 실수로 지우면 되돌릴 방법이 없다.

   service_role 키로 붙으므로 **로컬에서만** 쓴다. 키는 .env.local 에서 읽고
   인자로 받지 않는다(셸 히스토리에 남는다).

   사용법:
     node scripts/storage.mjs usage             버킷별 개수·용량과 1GB 대비 잔량
     node scripts/storage.mjs backup [폴더]     비공개 첨부(quote·recruit)를 내려받는다
     node scripts/storage.mjs backup --all      포트폴리오 이미지·소개서까지 전부

   backup 기본 대상이 첨부 두 벌인 이유: 포트폴리오 이미지와 소개서 PDF 는
   원본이 이 저장소나 담당자 PC 에 남아 있지만, 첨부는 **여기가 원본**이다. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('.env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const FREE_STORAGE = 1024 * 1024 * 1024; // 무료 플랜 파일 저장소 1GB
const ATTACHMENTS = ['quote', 'recruit'];

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function listBuckets() {
  const r = await fetch(`${URL_}/storage/v1/bucket`, { headers: H });
  if (!r.ok) throw new Error(`bucket 목록 실패 ${r.status}`);
  return r.json();
}

/* Storage 의 list 는 한 단계만 준다 — 폴더(id가 null)를 만나면 내려가야 한다.
   첨부는 <uuid>/<파일명> 이라 항상 한 단계가 더 있다. */
async function walk(bucket, prefix = '', out = []) {
  let offset = 0;
  for (;;) {
    const r = await fetch(`${URL_}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix,
        limit: 1000,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });
    if (!r.ok) throw new Error(`${bucket} list 실패 ${r.status}`);
    const items = await r.json();
    for (const it of items) {
      if (it.id === null) await walk(bucket, `${prefix}${it.name}/`, out);
      else out.push({ path: `${prefix}${it.name}`, size: it.metadata?.size ?? 0 });
    }
    if (items.length < 1000) return out;
    offset += items.length;
  }
}

async function usage() {
  const buckets = await listBuckets();
  let total = 0;
  console.log('버킷        공개   파일    용량');
  console.log('─'.repeat(44));
  for (const b of buckets) {
    const files = await walk(b.id);
    const size = files.reduce((a, f) => a + f.size, 0);
    total += size;
    console.log(
      `${b.id.padEnd(11)} ${String(b.public).padEnd(6)} ${String(files.length).padStart(4)}  ${mb(size).padStart(10)}`,
    );
  }
  console.log('─'.repeat(44));
  const pct = ((total / FREE_STORAGE) * 100).toFixed(1);
  console.log(`합계                    ${mb(total).padStart(10)}   (무료 1GB 의 ${pct}%)`);
  console.log(`남은 여유               ${mb(FREE_STORAGE - total).padStart(10)}`);
  console.log('\n※ 월 전송량(무료 5GB)은 이 API 로 볼 수 없다 — 대시보드 > Reports 에서 확인할 것.');
}

async function backup(dir, all) {
  const buckets = (await listBuckets()).map((b) => b.id);
  const targets = all ? buckets : buckets.filter((b) => ATTACHMENTS.includes(b));
  let n = 0;
  let bytes = 0;
  for (const b of targets) {
    for (const f of await walk(b)) {
      const r = await fetch(`${URL_}/storage/v1/object/${b}/${encodeURI(f.path)}`, { headers: H });
      if (!r.ok) {
        console.warn(`  건너뜀 ${b}/${f.path} (${r.status})`);
        continue;
      }
      const out = join(dir, b, f.path);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, Buffer.from(await r.arrayBuffer()));
      n += 1;
      bytes += f.size;
      console.log(`  ${b}/${f.path}`);
    }
  }
  console.log(`\n${n}개 · ${mb(bytes)} → ${dir}`);
  console.log('※ 파일명은 Storage 키(영문으로 눕힌 이름)다. 원래 파일명은 DB 의 file_name 에 있다.');
}

const [cmd, ...rest] = process.argv.slice(2);
const all = rest.includes('--all');
const dir = rest.find((a) => !a.startsWith('--')) ?? `storage-backup-${new Date().toISOString().slice(0, 10)}`;

if (cmd === 'usage') await usage();
else if (cmd === 'backup') await backup(dir, all);
else {
  console.log('사용법: node scripts/storage.mjs usage | backup [폴더] [--all]');
  process.exit(1);
}

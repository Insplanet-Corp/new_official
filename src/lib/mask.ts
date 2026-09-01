/* 개인정보 표시 제한(마스킹) — 어드민 목록이 연락처·이메일을 가릴 때 쓴다.

   ⚠️ **표시용일 뿐 보호 장치가 아니다.** 원본은 여전히 브라우저까지 내려온다
   (RLS 가 행 자체를 내려주므로 REST 를 직접 부르면 그대로 보인다). 실제 통제는
   ① `/admin/quotes` 메뉴권한 RLS ② 열람·다운로드 기록(quote_access_logs) 이다.
   가리는 목적은 "옆 사람 눈에 목록이 통째로 보이는 것" 을 막는 데 있다. */

/** 연락처 — 앞 3자리와 뒤 4자리만 남긴다 (01012345678 → 010-****-5678).

    ⚠️ 자릿수를 세어 가르지 않고 **숫자만 뽑아** 처리한다. Contact 폼은 숫자만
    받지만(FilteredInput filter="num") 옛 데이터에는 하이픈이 섞여 있을 수 있다. */
export function maskPhone(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  if (!d) return '*'.repeat(raw.length);
  if (d.length < 8) {
    // 내선번호처럼 짧은 값 — 앞 2자리만 남긴다
    const head = d.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(d.length - 2, 1))}`;
  }
  // 서울 지역번호(02)만 두 자리다 — 그대로 3자리로 자르면 02-1234-5678 이 '021' 로 보인다
  const headLen = d.startsWith('02') ? 2 : 3;
  const head = d.slice(0, headLen);
  const tail = d.slice(-4);
  return `${head}-${'*'.repeat(d.length - headLen - 4)}-${tail}`;
}

/** 이메일 — 아이디 앞 2자만 남기고 도메인은 그대로 (abcdef@x.com → ab****@x.com).

    도메인을 남기는 이유: 어느 회사에서 온 문의인지 정도는 목록에서 알아야
    분류가 된다. 아이디를 가리면 개인 식별에는 충분히 못 미친다. */
export function maskEmail(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const at = raw.lastIndexOf('@');
  if (at < 1) return `${raw.slice(0, 1)}${'*'.repeat(Math.max(raw.length - 1, 1))}`;
  const local = raw.slice(0, at);
  const domain = raw.slice(at);
  const keep = local.slice(0, Math.min(2, local.length - 1));
  return `${keep}${'*'.repeat(Math.max(local.length - keep.length, 1))}${domain}`;
}

/** 신청인 이름 — 가운데를 가린다 (홍길동 → 홍*동, 김철 → 김*, 이 → *).

    ⚠️ 글자 수를 세므로 `Array.from` 으로 나눈다. `.length` 로 자르면 이모지·일부 한자가
    반 글자씩 잘려 깨진 문자가 남는다. */
export function maskName(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const c = Array.from(raw);
  if (c.length === 1) return '*';
  if (c.length === 2) return `${c[0]}*`;
  return `${c[0]}${'*'.repeat(c.length - 2)}${c[c.length - 1]}`;
}

/** 기업명 — 앞 2자만 남긴다 (인스플래닛 → 인스***).

    이름과 규칙이 다른 이유: 회사 이름은 뒤에 ㈜·(주)·Inc 같은 꼬리가 붙는 일이 많아
    끝 글자를 남겨 봐야 식별에 도움이 안 되고, 앞 글자가 더 알아보기 쉽다. */
export function maskCompany(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const c = Array.from(raw);
  if (c.length === 1) return '*';
  // 두 글자짜리(KB 등)에 앞 2자를 남기면 이름이 통째로 드러난다 — 한 글자만 남긴다
  if (c.length === 2) return `${c[0]}*`;
  return `${c.slice(0, 2).join('')}${'*'.repeat(c.length - 2)}`;
}

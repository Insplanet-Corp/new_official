/* 첨부파일 공통 규칙 — 이력서(recruits)와 견적문의(quotes)가 같이 쓴다.

   두 도메인 다 "비공개 버킷에 익명으로 올리고, 어드민이 서명 URL 로만 받는다" 는
   같은 구조다. 그런데 파일명 처리에 지뢰가 두 개 있어서 한 곳에 모았다. */

import { supabase } from '@/lib/supabase';

/* ⚠️ macOS 에서 고른 한글 파일명은 **NFD(자모 분리)** 로 들어온다.
   "개인기술이력카드.xlsx" 가 U+1100 U+1162 … 처럼 초성·중성이 따로 온다는 뜻이다.
   macOS 는 그걸 합쳐서 보여주지만 **윈도우는 자모를 그대로 그린다** — 받은 사람에게는
   "ㄱㅐㅇㅣㄴ…" 으로 보인다. 저장할 때와 내려줄 때 둘 다 NFC 로 합친다
   (이미 NFD 로 저장된 옛 행도 다운로드 시점에 고쳐진다). */
export const toNfc = (name: string) => name.normalize('NFC');

/* Storage 키로 쓸 수 없는 문자(한글·공백·괄호…)를 눕힌다. 원래 파일명은 file_name 에
   따로 저장하므로 어드민 화면과 다운로드 파일명은 그대로 보인다.

   ⚠️ **확장자를 반드시 남긴다** — 대시보드에서 파일을 직접 열어 볼 때 그것만이 단서다.
   ⚠️ **이름이 통째로 사라지는 경우를 따로 다룬다.** 한글만으로 된 이름은 눕히면 `_` 하나만
      남는데, 그것까지 다듬으면 `.pdf` 같은 **점으로 시작하는 키**가 된다(숨김 파일처럼
      보이고 도구에 따라 다루기 곤란하다). 그래서 확장자와 몸통을 갈라서 처리하고,
      몸통이 비면 `file` 로 채운다 — 파일은 `<uuid>/` 폴더 하나에 하나뿐이라 이름이
      겹칠 일이 없다. */
export function safeStorageName(name: string): string {
  const nfc = toNfc(name);
  const dot = nfc.lastIndexOf('.');
  const hasExt = dot > 0 && dot < nfc.length - 1 && /^[a-zA-Z0-9]{1,8}$/.test(nfc.slice(dot + 1));
  const ext = hasExt ? `.${nfc.slice(dot + 1).toLowerCase()}` : '';
  const base = (hasExt ? nfc.slice(0, dot) : nfc)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
  return `${base || 'file'}${ext}`;
}

/* 비공개 버킷의 다운로드 주소. 공개 URL 이 없으므로 누를 때마다 짧게 유효한 서명 URL 을
   새로 만든다(화면을 열 때 미리 만들어 두면 오래 열어 둔 탭에서 만료된 주소를 누르게 된다).
   이 호출은 Storage 의 select 정책을 타므로 해당 메뉴 권한이 없으면 실패한다(정상 동작).

   ⚠️ **`createSignedUrl` 의 `download` 옵션을 쓰지 말 것 — supabase-js 가 값을 두 번
      인코딩한다.** 내부에서 URLSearchParams 로 `download=%EA%B0%9C…` 를 만든 다음
      URL 전체에 `encodeURI()` 를 한 번 더 걸어 `%` 가 `%25` 가 된다
      (storage-js 2.111.0 의 createSignedUrl). 서버는 그걸 한 번만 풀어서
      `Content-Disposition: filename=%EA%B0%9C%EC%9D%B8…` 를 내려주고, 브라우저는
      그 퍼센트 문자열 자체를 파일명으로 저장한다 — 한글 파일명 하나가 200자가 넘는
      알아볼 수 없는 이름으로 받아졌다. ASCII 파일명에는 `%` 가 없어 멀쩡해 보이므로
      영문 파일로 시험하면 못 잡는다.
      → 옵션 없이 서명만 받고 `download=` 는 여기서 **한 번만** 인코딩해 붙인다. */
export async function signedDownloadUrl(
  bucket: string,
  path: string,
  fileName?: string | null,
  expiresIn = 60,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? '서명 URL 을 만들지 못했습니다.' };
  }
  const url = fileName
    ? `${data.signedUrl}&download=${encodeURIComponent(toNfc(fileName))}`
    : data.signedUrl;
  return { url, error: null };
}

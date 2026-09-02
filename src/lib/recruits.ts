/* 리크루트(recruits) 도메인 — Careers 입사지원 접수와 어드민 목록/조회가 함께 쓴다.

   Supabase 스키마는 supabase/migrations/018_recruits.sql:
     id uuid · created_at timestamptz · name · field · phone · email · url
     file_path · file_name · file_size

   ⚠️ 컬럼은 **Careers 폼이 실제로 받는 것만** 이다. 기획서 35p 의 기술등급 ·
      경력 · 재직상태는 폼에 없어서 만들지 않았다(2026-08-26 사용자 결정:
      "어드민보다 폼이 우선"). 폼에 그 항목이 생기면 그때 컬럼·필터를 같이 늘릴 것.

   ⚠️ field 는 칩에 적힌 **한글 문자열 그대로** 다 (quotes.project_fields 와 같은 규칙).
      원본은 data/contact.ts 의 RECRUIT_ROLES 이고 어드민 필터도 거기서 파생시킨다. */

import { safeStorageName, signedDownloadUrl, toNfc } from '@/lib/attachments';
import { supabase } from '@/lib/supabase';

/** 이력서 첨부 버킷. **비공개** 다 — 공개 URL 이 없고 어드민이 서명 URL 로만 받는다. */
export const RECRUIT_BUCKET = 'recruit';

/** Careers 폼 안내 문구와 같은 값. Storage 버킷에도 같은 상한이 걸려 있다(018). */
export const RECRUIT_MAX_BYTES = 50 * 1024 * 1024;

export type Recruit = {
  id: string;
  created_at: string;
  name: string | null;
  field: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
};

export type RecruitInput = {
  /** 지원분야 칩 — 단일선택이지만 ChipGroup 이 배열로 다룬다 */
  role: string[];
  name: string;
  phone: string;
  email: string;
  url: string;
  file: File | null;
};

/** Supabase 에러 메시지를 지원자에게 보여줄 한 줄로 바꾼다 */
function humanize(message: string): string {
  if (/bucket/i.test(message)) {
    return '첨부파일 저장소가 준비되지 않았습니다. 담당자에게 문의해 주세요. (018_recruits.sql 미실행)';
  }
  if (/exceeded the maximum|payload too large|size/i.test(message)) {
    return '첨부파일이 너무 큽니다. 50MB 이하로 다시 시도해 주세요.';
  }
  if (/relation .* does not exist|schema cache/i.test(message)) {
    return '지원서 저장소가 준비되지 않았습니다. 담당자에게 문의해 주세요. (018_recruits.sql 미실행)';
  }
  if (/policy|permission|unauthor|row-level/i.test(message)) {
    return '지원서를 접수할 권한이 없습니다. 담당자에게 문의해 주세요.';
  }
  return message;
}

/* 지원서 접수. PC 모달(RecruitModal)과 모바일 시트(MobileRecruitModal)가 **같은** 함수를
   쓴다 — 두 트리는 폭으로만 갈릴 뿐 접수 규칙이 다를 이유가 없다.

   ⚠️ 순서는 **파일 업로드 → 행 insert** 다. 행을 먼저 넣으면 파일 경로를 나중에 채워야
      하는데 anon 에게는 update 권한이 없다(018 은 insert 만 연다). 그래서 id 를 여기서
      만들어 recruit/<id>/<파일명> 에 올리고, 그 id 로 행을 넣는다.
      insert 가 실패하면 올라간 파일이 고아로 남는다 — anon 은 delete 도 못 하므로
      지우지 않고 그대로 둔다(어드민이 대시보드에서 정리). 흔한 경우가 아니고,
      "파일은 지웠는데 행은 들어간" 상태보다 낫다. */
export async function submitRecruit(input: RecruitInput): Promise<{ error: string | null }> {
  const file = input.file;
  if (file && file.size > RECRUIT_MAX_BYTES) {
    return { error: '첨부파일은 최대 50MB까지 올릴 수 있습니다.' };
  }

  const id = crypto.randomUUID();
  let filePath: string | null = null;

  if (file) {
    const path = `${id}/${safeStorageName(file.name)}`;
    const { error } = await supabase.storage.from(RECRUIT_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) return { error: humanize(error.message) };
    filePath = path;
  }

  const { error } = await supabase.from('recruits').insert([
    {
      id,
      name: input.name.trim(),
      field: input.role[0] ?? null,
      phone: input.phone.trim(),
      email: input.email.trim(),
      url: input.url.trim() || null,
      file_path: filePath,
      file_name: file ? toNfc(file.name) : null,
      file_size: file?.size ?? null,
    },
  ]);

  return { error: error ? humanize(error.message) : null };
}

/* 어드민 조회 화면의 첨부파일 다운로드 주소.

   실제 동작은 공용 signedDownloadUrl 에 있다 — 견적문의 첨부와 규칙이 같다.
   그쪽 주석에 supabase-js 의 `download` 이중 인코딩 함정이 적혀 있다. */
export const recruitFileUrl = (
  path: string,
  fileName?: string | null,
  expiresIn = 60,
) => signedDownloadUrl(RECRUIT_BUCKET, path, fileName, expiresIn);

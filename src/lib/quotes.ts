/* 견적문의(quotes) 도메인 — Contact 문의 접수와 어드민 목록/조회가 함께 쓴다.

   실제 Supabase 스키마 (anon 키로 컬럼 존재 확인함):
     id uuid · created_at timestamptz · company · person · phone · email
     url · content · status · project_fields jsonb
     file_path · file_name · file_size          ← 023_quote_attachments.sql

   project_fields 는 Contact 폼의 칩 선택이 그대로 들어간 JSON 이다:
     { scope: string[], nature: string[], budget: string[], period: string[] }
   기획서의 "프로젝트 업무범위 / 성격 / 예산 / 기간" 이 각각 여기에 대응한다.
   값은 칩에 적힌 한글 문자열 그대로다 (src/data/contact.ts PROJECT_FIELDS). */

import { safeStorageName, signedDownloadUrl, toNfc } from '@/lib/attachments';
import { isMissingColumn } from '@/lib/pgError';
import { supabase } from '@/lib/supabase';

/** 견적문의 첨부 버킷. **비공개** 다 — 공개 URL 이 없고 어드민이 서명 URL 로만 받는다. */
export const QUOTE_BUCKET = 'quote';

/** Contact 폼 안내 문구와 같은 값. Storage 버킷에도 같은 상한이 걸려 있다(023). */
export const QUOTE_MAX_BYTES = 50 * 1024 * 1024;

export type Quote = {
  id: string;
  created_at: string;
  company: string | null;
  person: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  content: string | null;
  status: string | null;
  project_fields: Record<string, string[]> | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
};

export type QuoteInput = {
  company: string;
  person: string;
  phone: string;
  email: string;
  url: string;
  content: string;
  /** 칩 선택 그대로 — { scope: [...], nature: [...], ... } */
  projectFields: Record<string, string[]>;
  file: File | null;
};

/** project_fields 의 한 그룹을 배열로 꺼낸다 (없으면 빈 배열) */
export const fieldValues = (q: Quote, key: string): string[] => q.project_fields?.[key] ?? [];

/** 목록 셀처럼 한 줄로 보여줄 때 */
export const fieldText = (q: Quote, key: string): string => fieldValues(q, key).join(', ');

/** 선택된 필터 값이 그 그룹에 포함되는지 (다중선택이라 includes) */
export const hasField = (q: Quote, key: string, value: string): boolean =>
  value === 'all' || fieldValues(q, key).includes(value);

/** Supabase 에러 메시지를 의뢰인에게 보여줄 한 줄로 바꾼다 */
function humanize(message: string): string {
  if (/bucket/i.test(message)) {
    return '첨부파일 저장소가 준비되지 않았습니다. 담당자에게 문의해 주세요. (023_quote_attachments.sql 미실행)';
  }
  if (/exceeded the maximum|payload too large|size/i.test(message)) {
    return '첨부파일이 너무 큽니다. 50MB 이하로 다시 시도해 주세요.';
  }
  if (/policy|permission|unauthor|row-level/i.test(message)) {
    return '문의를 접수할 권한이 없습니다. 담당자에게 문의해 주세요.';
  }
  return message;
}

/* 문의 접수. PC 폼(ContactForm)과 모바일 폼(MobileContactForm)이 **같은** 함수를 쓴다 —
   두 트리는 폭으로만 갈릴 뿐 접수 규칙이 다를 이유가 없다(submitRecruit 과 같은 구성).

   ⚠️ 순서는 **파일 업로드 → 행 insert** 다. 행을 먼저 넣으면 파일 경로를 나중에 채워야
      하는데 anon 에게는 update 권한이 없다(023 은 insert 만 연다). 그래서 id 를 여기서
      만들어 quote/<id>/<파일명> 에 올리고, 그 id 로 행을 넣는다.
      insert 가 실패하면 올라간 파일이 고아로 남는다 — anon 은 delete 도 못 하므로
      그대로 둔다(어드민이 대시보드에서 정리). "파일은 지웠는데 행은 들어간" 상태보다 낫다.

   ⚠️ **첨부가 없으면 file_* 키를 아예 보내지 않는다.** 023 을 안 돌린 DB 에 그 키를
      보내면 PGRST204 로 **문의 접수가 전부 실패한다.** 첨부가 있는데 그 오류가 나면
      첨부 없이 한 번 더 넣는다 — 파일 하나 때문에 문의를 통째로 잃지 않기 위함이다. */
export async function submitQuote(
  input: QuoteInput,
): Promise<{ error: string | null; fileDropped?: boolean }> {
  const file = input.file;
  if (file && file.size > QUOTE_MAX_BYTES) {
    return { error: '첨부파일은 최대 50MB까지 올릴 수 있습니다.' };
  }

  const id = crypto.randomUUID();
  let filePath: string | null = null;
  let dropped = false;

  if (file) {
    const path = `${id}/${safeStorageName(file.name)}`;
    const { error } = await supabase.storage.from(QUOTE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) {
      /* 파일이 너무 크다 = 의뢰인이 고칠 수 있는 문제라 그대로 알린다.
         그 밖의 실패(버킷 없음 · 정책 미적용 = 023 미실행)는 **문의를 막지 않는다** —
         첨부 하나 때문에 견적문의를 통째로 잃는 쪽이 훨씬 나쁘다. 023 이전의 동작이
         "파일을 조용히 버리고 접수" 였으므로 여기서도 접수는 살리되, 조용히 버리지
         않고 fileDropped 로 알려 화면이 "첨부는 저장되지 않았다" 고 말하게 한다. */
      if (/exceeded the maximum|payload too large|too large/i.test(error.message)) {
        return { error: humanize(error.message) };
      }
      console.warn('[quotes] 첨부 업로드 실패 — 첨부 없이 접수합니다:', error.message);
      dropped = true;
    } else {
      filePath = path;
    }
  }

  const base = {
    id,
    company: input.company.trim(),
    person: input.person.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    url: input.url.trim() || null,
    content: input.content.trim() || null,
    project_fields: input.projectFields,
    status: 'pending',
  };

  const withFile =
    file && filePath
      ? {
          ...base,
          file_path: filePath,
          file_name: toNfc(file.name),
          file_size: file.size,
        }
      : base;

  const { error } = await supabase.from('quotes').insert([withFile]);
  if (!error) return { error: null, fileDropped: dropped || undefined };

  // 023 미실행 — 첨부 컬럼이 없다. 첨부 없이 다시 넣어 문의만이라도 살린다
  if (filePath && isMissingColumn(error)) {
    const retry = await supabase.from('quotes').insert([base]);
    if (!retry.error) return { error: null, fileDropped: true };
    return { error: humanize(retry.error.message) };
  }

  return { error: humanize(error.message) };
}

/* 어드민 조회 화면의 첨부파일 다운로드 주소.

   실제 동작은 공용 signedDownloadUrl 에 있다 — 이력서 첨부와 규칙이 같다.
   그쪽 주석에 supabase-js 의 `download` 이중 인코딩 함정이 적혀 있다. */
export const quoteFileUrl = (path: string, fileName?: string | null, expiresIn = 60) =>
  signedDownloadUrl(QUOTE_BUCKET, path, fileName, expiresIn);

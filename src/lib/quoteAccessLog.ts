/* 견적문의 개인정보 열람·다운로드 기록 (supabase/migrations/020_quote_access_logs.sql).

   ⚠️ **행위자(actor_*)는 여기서 보내지 않는다.** DB 트리거가 auth.uid() 로 찍는다 —
   클라이언트가 보낸 값을 믿으면 남의 이름으로 기록을 남길 수 있다.

   ⚠️ `.insert()` 뒤에 `.select()` 를 붙이지 말 것. 이 테이블은 append-only 라
   select 정책이 아예 없어서, 붙이는 순간 권한 오류로 기록이 실패한다. */

import { describeError, isMissingTable } from '@/lib/pgError';
import { supabase } from '@/lib/supabase';

/** 다운로드 시점에 걸려 있던 조회 조건 — 무엇이 담긴 파일인지 되짚을 수 있게 같이 남긴다 */
export type QuoteFilterSnapshot = {
  company: string;
  person: string;
  system: string;
  kind: string;
};

export type LogResult = {
  /** 화면에 띄울 실패 사유. null 이면 성공 */
  error: string | null;
  /** 020 을 아직 실행하지 않았다 — 안내 문구를 다르게 띄운다 */
  missingTable?: boolean;
};

async function write(row: Record<string, unknown>): Promise<LogResult> {
  const { error } = await supabase.from('quote_access_logs').insert(row);
  if (!error) return { error: null };
  if (isMissingTable(error)) {
    return {
      error:
        '열람 기록 테이블이 아직 없습니다. supabase/migrations/020_quote_access_logs.sql 을 실행해 주세요.',
      missingTable: true,
    };
  }
  return { error: describeError(error) };
}

/** 조회 화면에서 문의 1건의 원본을 열람했다 */
export const logQuoteView = (quoteId: string): Promise<LogResult> =>
  write({ action: 'view', quote_id: quoteId });

/** CSV 로 내려받았다. 사유는 필수다(DB 제약도 같이 건다).

    ⚠️ 1건짜리 다운로드는 `quote_id` 도 채운다 — 그래야 "이 문의를 누가 언제 받아 갔나" 를
    view 기록과 **같은 컬럼으로** 되짚을 수 있다. 목록 단위 다운로드에는 대상이 여럿이라
    quote_id 가 비고 target_ids 만 찬다. */
export const logQuoteDownload = (args: {
  ids: string[];
  reason: string;
  /** 목록 다운로드일 때 그 시점의 조회 조건. 건별 다운로드에는 없다 */
  filters?: QuoteFilterSnapshot;
}): Promise<LogResult> =>
  write({
    action: 'download',
    quote_id: args.ids.length === 1 ? args.ids[0] : null,
    target_count: args.ids.length,
    target_ids: args.ids,
    filters: args.filters ?? null,
    reason: args.reason.trim(),
  });

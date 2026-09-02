/* 견적문의 개인정보 열람·다운로드 기록 (supabase/migrations/020_quote_access_logs.sql).

   ⚠️ **행위자(actor_*)는 여기서 보내지 않는다.** DB 트리거가 auth.uid() 로 찍는다 —
   클라이언트가 보낸 값을 믿으면 남의 이름으로 기록을 남길 수 있다.

   ⚠️ `.insert()` 뒤에 `.select()` 를 붙이지 말 것. 이 테이블은 append-only 라
   select 정책이 아예 없어서, 붙이는 순간 권한 오류로 기록이 실패한다. */

import type { SupabaseClient } from '@supabase/supabase-js';
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

/* db 를 넘기면 그 클라이언트로 쓴다 — cron 의 자동 파기는 service_role 로 남긴다
   (로그인 세션이 없으므로 anon 클라이언트로는 RLS 에 막힌다). 기본값은 화면이 쓰는
   로그인 세션 클라이언트다. */
async function write(
  row: Record<string, unknown>,
  db: SupabaseClient = supabase,
): Promise<LogResult> {
  const { error } = await db.from('quote_access_logs').insert(row);
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

/** 조회 화면에서 첨부파일을 내려받았다 (023 이 action 에 'file' 을 추가한다).

    ⚠️ 사유를 받지 않는다 — CSV 는 여러 건의 연락처·이메일이 원본 그대로 파일에 담기지만,
    첨부는 의뢰인이 스스로 올린 그 문의 한 건의 자료라 업무 중 여는 빈도가 다르다.
    대신 누가 언제 받아 갔는지는 CSV 와 **같은 표**에 남는다(quote_id 로 되짚힌다).
    023 을 안 돌린 DB 에서는 action 검사(23514)에 걸려 실패한다 — 그때는 화면이
    다운로드를 막고 안내한다. */
export const logQuoteFile = (quoteId: string): Promise<LogResult> =>
  write({ action: 'file', quote_id: quoteId });

/* 파기했다 (024 가 action 에 'purge' 를 추가한다).

   ⚠️ 행위자(actor_*)는 여기서도 보내지 않는다 — 트리거가 auth.uid() 로 찍는다.
   **cron 의 자동 파기는 세션이 없으므로 actor_* 가 전부 비어 남는다.** 그것이 곧
   "사람이 아니라 시스템이 지웠다" 는 표시이고, reason 에 어느 규칙으로 지웠는지
   (예: '보유기간 경과 자동 파기 — 접수 후 1년') 남겨 구분을 확실히 한다.

   ⚠️ 사유는 DB 제약으로 강제되지 않는다(제약은 'download' 에만 걸려 있다) —
   자동 파기까지 막히면 안 되기 때문이다. 어드민 화면은 입력을 요구한다. */
export const logQuotePurge = (args: {
  ids: string[];
  reason: string;
  /** 자동 파기는 service_role 클라이언트를 넘긴다 */
  db?: SupabaseClient;
}): Promise<LogResult> =>
  write(
    {
      action: 'purge',
      quote_id: args.ids.length === 1 ? args.ids[0] : null,
      target_count: args.ids.length,
      target_ids: args.ids,
      reason: args.reason.trim(),
    },
    args.db,
  );

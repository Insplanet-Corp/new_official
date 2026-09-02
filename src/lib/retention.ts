/* 개인정보 보유기간과 파기 — 어드민의 [삭제] 버튼과 /api/retention(cron)이 함께 쓴다.

   ⚠️ **여기 숫자는 개인정보처리방침(src/data/legal.ts)에 공개된 값이다.**
      바꾸려면 방침 본문도 같이 고쳐야 한다 — 방침에 적은 것과 실제 동작이 다르면
      「개인정보 보호법」 제30조(방침 준수) 위반이다. 두 곳이 갈리지 않게 아래
      label 에 방침 문구를 그대로 적어 둔다.

   ⚠️ 지울 대상이 **DB 행과 Storage 파일 두 곳**이라는 점이 이 파일의 존재 이유다.
      행만 지우면 파일이 고아로 남고(버킷 용량은 그대로 차고, 무엇보다 개인정보가
      그대로 남는다), 파일만 지우면 화면에 파일명이 남아 누르면 400 이 난다. */

import type { SupabaseClient } from '@supabase/supabase-js';

export type RetentionKind = 'quotes' | 'recruits';

export const RETENTION: Record<
  RetentionKind,
  { years: number; table: string; bucket: string; label: string; menu: string }
> = {
  /* 방침 01조 ① 견적 문의 — "보유 기간 : 접수 후 1년 (상담 기록 및 이력 관리)" */
  quotes: {
    years: 1,
    table: 'quotes',
    bucket: 'quote',
    label: '접수 후 1년',
    menu: '견적문의',
  },
  /* 방침 01조 ② 입사 지원 — "보유 기간 : 제출 후 3년 또는 채용 절차 종료 시" */
  recruits: {
    years: 3,
    table: 'recruits',
    bucket: 'recruit',
    label: '제출 후 3년',
    menu: '입사지원',
  },
};

/** 이 시각보다 **오래된** 행이 파기 대상이다 (created_at < cutoff) */
export function cutoffISO(years: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString();
}

/** 파기 대상 행 — 목록 조회에서 이 두 칸만 있으면 지울 수 있다 */
export type PurgeTarget = { id: string; file_path?: string | null };

export type PurgeResult = {
  /** 실제로 행이 지워진 개수 */
  deleted: number;
  /** 사람에게 보여줄 실패 사유 (null 이면 성공) */
  error: string | null;
};

/* 파기 — **파일 먼저, 행 나중**.

   ⚠️ 파일 삭제가 실패하면 **행을 지우지 않는다.** 행을 지워 버리면 그 파일을 되짚을
      경로가 영영 사라져 "지웠다고 생각하는데 개인정보 파일은 남아 있는" 최악의 상태가
      된다. 실패한 행은 그대로 남겨 다음 실행(또는 사람)이 다시 시도하게 한다.

   ℹ️ 이미 없는 파일은 실패가 아니다 — remove 는 없는 키를 조용히 넘기고, 목적은
      "그 파일이 없는 상태" 이므로 그대로 진행한다(지역 이전 때 파일만 유실된 이력서
      2건이 실제로 이 경우다).

   ⚠️ db 는 호출자가 넘긴다 — 어드민 화면은 로그인 세션(RLS 를 탄다), cron 은
      service_role 이다. 이 함수 안에서 클라이언트를 만들지 말 것. */
export async function purgeTargets(
  db: SupabaseClient,
  kind: RetentionKind,
  targets: PurgeTarget[],
): Promise<PurgeResult> {
  if (!targets.length) return { deleted: 0, error: null };
  const { table, bucket } = RETENTION[kind];

  const paths = targets.map((t) => t.file_path).filter((p): p is string => !!p);
  if (paths.length) {
    const { error } = await db.storage.from(bucket).remove(paths);
    if (error) {
      return {
        deleted: 0,
        error: `첨부파일을 지우지 못해 중단했습니다(행은 그대로 둡니다): ${error.message}`,
      };
    }
  }

  /* ⚠️ **RLS 로 막힌 DELETE 는 에러를 내지 않는다** — 0행이 지워지고 204 가 온다.
     그래서 `error` 만 보고 성공으로 판단하면 화면은 "지웠다" 며 목록으로 돌아가는데
     문의는 그대로 남는다(실제로 `quotes` 에 delete 정책이 없어 그렇게 됐다 — 025).
     `count: 'exact'` 로 **실제로 몇 행이 지워졌는지** 받아서 확인한다. */
  const {
    error,
    count,
  } = await db
    .from(table)
    .delete({ count: 'exact' })
    .in(
      'id',
      targets.map((t) => t.id),
    );
  if (error) {
    return {
      deleted: 0,
      error: `첨부파일은 지웠지만 행 삭제에 실패했습니다: ${error.message}`,
    };
  }

  const deleted = count ?? 0;
  if (deleted < targets.length) {
    /* 첨부는 이미 지웠는데 행이 안 지워졌다. 파기의 목적(파일 제거)은 이뤘지만
       화면에는 파일명이 남아 누르면 400 이 나므로, 무엇이 남았는지 분명히 알린다. */
    return {
      deleted,
      error:
        `${targets.length}건 중 ${deleted}건만 지워졌습니다 — 삭제 권한이 없어 ` +
        `행이 남았습니다(첨부파일은 이미 지워졌습니다). ` +
        `supabase/migrations/025_quotes_delete_policy.sql 을 실행했는지, ` +
        `이 계정에 해당 메뉴 권한이 있는지 확인해 주세요.`,
    };
  }
  return { deleted, error: null };
}

/* PostgREST / Postgres 오류 판정 — 어드민 화면들이 공유한다.

   ⚠️ 반드시 에러 "코드" 로 가른다. 메시지 문자열로 매칭하지 말 것.
   예전엔 /does not exist|schema cache/ 로 잡았는데, 테이블이 생긴 뒤로는
   컬럼이 하나만 어긋나도 나는 PGRST204
     "Could not find the 'x' column of '...' in the schema cache"
   까지 걸려서 멀쩡한 테이블에 "마이그레이션을 실행하세요" 를 띄웠다.
   "column ... does not exist"(42703) 도 마찬가지다. */

import type { PostgrestError } from '@supabase/supabase-js';

/** 테이블 자체가 없다 (마이그레이션 미실행) */
export const isMissingTable = (e: PostgrestError | null): boolean =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01');

/** 컬럼이 없다 — 코드는 새 컬럼을 쓰는데 DB 에 아직 없다.

    테이블 없음(isMissingTable)과 반드시 구분한다. 위 주석의 사고가 그것이었다:
    둘을 같은 정규식으로 잡아서 멀쩡한 테이블에 엉뚱한 안내를 띄웠다.
    여기서는 "최신 마이그레이션을 안 돌렸다" 쪽으로 안내한다. */
export const isMissingColumn = (e: PostgrestError | null): boolean =>
  !!e && (e.code === 'PGRST204' || e.code === '42703');

/** RLS 정책이 자기 테이블을 참조해 무한 재귀한다 */
export const isPolicyRecursion = (e: PostgrestError | null): boolean =>
  !!e && e.code === '42P17';

/** 화면에 띄울 메시지 — 아는 오류는 해결법까지, 나머지는 원문 + 코드 */
export const describeError = (e: PostgrestError): string => {
  if (isPolicyRecursion(e)) {
    return (
      'RLS 정책이 무한 재귀하고 있습니다(42P17). 정책이 자기 테이블을 조회하고 있지 않은지 ' +
      '확인해 주세요 — supabase/migrations/003 의 security definer 패턴을 참고하면 됩니다.'
    );
  }
  if (isMissingColumn(e)) {
    return (
      `${e.message} — DB 에 아직 없는 컬럼입니다. ` +
      `supabase/migrations 의 최신 SQL 을 SQL Editor 에서 실행했는지 확인해 주세요 (${e.code}).`
    );
  }
  // 코드가 없으면 원인 추적이 어려우므로 있으면 같이 보여준다
  return e.code ? `${e.message} (${e.code})` : e.message;
};

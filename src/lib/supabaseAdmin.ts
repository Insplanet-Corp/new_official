/* service_role 키를 쓰는 서버 전용 Supabase 클라이언트.

   ⚠️ 클라이언트 컴포넌트에서 절대 import 하지 말 것.
   service_role 은 RLS 를 전부 우회한다. 브라우저 번들에 실리면 DB 전체가 열린다.

   키 이름에 NEXT_PUBLIC_ 접두사가 없으므로 Next 는 이 값을 브라우저로 보내지
   않는다. 즉 실수로 import 해도 키가 새는 게 아니라 undefined 가 되어 조용히
   깨진다 — 그래서 아래에서 명시적으로 던진다. */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SERVICE_KEY_MISSING =
  'SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. ' +
  'Supabase 대시보드 > Project Settings > API > service_role 키를 ' +
  '.env.local 에 넣고 개발 서버를 재시작해 주세요.';

/** 라우트가 503 을 내려주기 위한 사전 확인 (키가 없어도 던지지 않는다) */
export const hasServiceKey = Boolean(url && serviceRoleKey);

export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin 은 서버에서만 사용할 수 있습니다.');
  }
  if (!url || !serviceRoleKey) throw new Error(SERVICE_KEY_MISSING);

  // 서버에서는 세션을 들고 있을 이유가 없다 (요청마다 새로 만든다)
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

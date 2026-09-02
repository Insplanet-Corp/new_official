import { NextResponse } from 'next/server';
import { logQuotePurge } from '@/lib/quoteAccessLog';
import { RETENTION, cutoffISO, purgeTargets, type RetentionKind } from '@/lib/retention';
import { createAdminClient, hasServiceKey } from '@/lib/supabaseAdmin';

/* 보유기간이 지난 개인정보를 파기한다 (Vercel cron, 하루 한 번).

   개인정보처리방침(src/data/legal.ts)이 공개적으로 약속한 기간 그대로다 —
   견적 문의 **접수 후 1년**, 입사 지원 **제출 후 3년**. 숫자는 lib/retention.ts 한
   곳에 있고, 방침 문구도 거기 주석에 함께 적어 두었다. 「개인정보 보호법」 제21조는
   보유기간이 지나면 지체 없이 파기하도록 하고, 제30조는 방침대로 처리할 의무를 지운다.

   ⚠️ **service_role 로 돈다.** 세션이 없으므로 anon 클라이언트로는 delete 권한이 없다
      (018·023 은 삭제를 어드민에게만 열어 두었다).

   ⚠️ **접속기록(quote_access_logs)은 지우지 않는다.** 「개인정보의 안전성 확보조치
      기준」이 개인정보처리시스템 접속기록을 최소 1년 보관하도록 하고 있고, 애초에
      "누가 언제 무엇을 했나" 를 남기는 표라 원본이 사라진 뒤에도 남아야 의미가 있다
      (그래서 020 이 quote_id 에 FK 를 걸지 않았다).

   ⚠️ 캐시되면 안 된다 — 캐시된 응답이 나가면 아무것도 안 지운다.

   점검용:
     GET /api/retention?dry=1   지우지 않고 **대상 건수만** 센다. 처음 켤 때 반드시
                                이걸 먼저 볼 것 — 오래된 데이터가 한꺼번에 사라진다.

   스케줄은 vercel.json 의 crons 에 있다. */
export const dynamic = 'force-dynamic';

/** 한 번에 처리하는 최대 건수. 남으면 다음 실행이 이어서 지운다 */
const BATCH = 500;

export async function GET(req: Request) {
  /* keepalive 와 같은 방식 — CRON_SECRET 을 설정하면 Vercel 이 cron 요청에
     Authorization 헤더를 붙여 준다. ⚠️ 이 라우트는 **데이터를 지우므로**
     keepalive 보다 설정이 훨씬 중요하다. 설정 전에는 주소를 아는 사람이 파기를
     실행시킬 수 있다. */
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!hasServiceKey) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY 가 없습니다.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  const dry = new URL(req.url).searchParams.has('dry');
  const db = createAdminClient();
  const now = new Date();
  const result: Record<string, unknown> = {};
  let failed = false;

  for (const kind of ['quotes', 'recruits'] as RetentionKind[]) {
    const { years, table, label } = RETENTION[kind];
    const cutoff = cutoffISO(years, now);

    const { data, error } = await db
      .from(table)
      .select('id, file_path')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(BATCH);

    if (error) {
      failed = true;
      result[kind] = { rule: label, cutoff, error: error.message };
      continue;
    }

    const targets = (data ?? []) as { id: string; file_path: string | null }[];
    /* dry 는 여기서 멈춘다. 대상이 0건이면 지울 것도 기록할 것도 없다. */
    if (dry || !targets.length) {
      result[kind] = { rule: label, cutoff, due: targets.length, deleted: 0 };
      continue;
    }

    /* ⚠️ 기록을 **먼저** 남긴다. 지우고 나서 기록에 실패하면 "기록 없이 사라진
       개인정보" 가 되어 되짚을 방법이 없다. 반대로 기록만 남고 삭제가 실패하면
       다음 실행이 다시 지우고 기록을 한 줄 더 남긴다 — 이쪽이 훨씬 낫다.
       리크루트에는 기록 테이블이 없어 이 단계가 없다(조회 화면의 삭제도 같다). */
    if (kind === 'quotes') {
      const logged = await logQuotePurge({
        ids: targets.map((t) => t.id),
        reason: `보유기간 경과 자동 파기 — ${label}`,
        db,
      });
      if (logged.error) {
        failed = true;
        result[kind] = { rule: label, cutoff, due: targets.length, deleted: 0, error: logged.error };
        continue;
      }
    }

    const { deleted, error: purgeError } = await purgeTargets(db, kind, targets);
    if (purgeError) failed = true;
    result[kind] = {
      rule: label,
      cutoff,
      due: targets.length,
      deleted,
      ...(purgeError ? { error: purgeError } : {}),
      ...(targets.length === BATCH ? { note: '한 번에 처리할 상한에 걸렸다 — 다음 실행이 이어서 지운다' } : {}),
    };
  }

  /* 실패해도 500 을 주지 않는다 — cron 실패 알림보다 본문을 남기는 쪽이 진단에 낫다
     (keepalive 와 같은 방침). ok 로 성패를 구분한다. */
  return NextResponse.json(
    { ok: !failed, at: now.toISOString(), dry, ...result },
    { headers: { 'cache-control': 'no-store' } },
  );
}

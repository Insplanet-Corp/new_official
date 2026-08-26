import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/* Supabase 무료 플랜은 **7일간 요청이 없으면 프로젝트를 일시정지**한다. 그리고 정지되면
   누가 접속해도 자동으로 안 깨어난다 — 대시보드에서 사람이 직접 재개해야 하고, 그동안
   포트폴리오·썸네일·회사소개서가 전부 안 나온다.

   방문자가 있으면 홈·/projects 가 매 요청마다 DB 를 읽으므로(둘 다 force-dynamic) 저절로
   유지된다. 문제는 **오픈 직전의 조용한 기간**이다 — 만들어 두고 일주일 방치했다가 오픈일에
   멈춰 있는 것이 가장 흔한 사고다. 그래서 하루 한 번 여기서 DB 를 한 번 찌른다.

   ⚠️ 이 라우트는 반드시 **실제 DB 조회**를 해야 한다. 정적 응답만 돌려주면 Vercel 쪽만
      깨어 있고 Supabase 는 그대로 잠든다.
   ⚠️ 캐시되면 안 된다 — 캐시된 응답이 나가면 DB 를 안 읽는다. force-dynamic 을 건다.

   스케줄은 vercel.json 의 crons 에 있다. */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  /* Vercel 은 CRON_SECRET 환경변수가 있으면 cron 요청에 Authorization 헤더를 붙여 준다.
     설정해 두면 아무나 이 주소를 두드려 DB 를 깨우는 것을 막을 수 있다(설정 전에는 공개). */
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const { error } = await supabase.from('portfolios').select('id').limit(1);

  if (error) {
    /* 실패해도 500 을 주지 않는다 — cron 실패 알림보다 본문을 남기는 쪽이 진단에 낫다.
       (프로젝트가 이미 정지됐다면 여기서 그 사실이 드러난다) */
    return NextResponse.json(
      { ok: false, ms: Date.now() - started, error: error.message },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  }
  return NextResponse.json(
    { ok: true, ms: Date.now() - started, at: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}

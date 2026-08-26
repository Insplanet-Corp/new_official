import { supabase } from '@/lib/supabase';

/* 방문 집계. 옛 사이트(Develop/Company/official)의 src/lib/analytics.js 를 옮긴 것이다.

   ⚠️ 기록은 이 코드가 직접 INSERT 하지 않는다 — Supabase Edge Function `track` 이
   service_role 로 넣는다. 그 함수가 **요청 IP 를 보고 사무실 IP 면 기록하지 않는다**
   (IP 는 비교에만 쓰고 저장하지 않는다). 그래서 pageviews 테이블에는 anon insert 정책이
   없고, 클라이언트가 스팸을 넣을 수 없다. 함수는 Supabase 에 배포돼 있어 저장소를
   갈아끼워도 그대로 살아 있다 — 이 파일은 그 함수를 다시 부르기만 한다.

   내부자 제외는 세 겹이다:
     1) 등록된 사무실 IP        → 서버(track)가 판단, 기기 무관
     2) 어드민 로그인 브라우저   → 로그인 시 setOptOut(true)
     3) ?internal=1 로 방문한 브라우저 → 재택·외부용 (?internal=0 로 해제) */
const OPTOUT_KEY = 'insp_analytics_optout';
const VISITOR_KEY = 'insp_visitor_id';

export const isOptedOut = (): boolean => {
  try {
    return localStorage.getItem(OPTOUT_KEY) === '1';
  } catch {
    return false;
  }
};

export const setOptOut = (value = true) => {
  try {
    if (value) localStorage.setItem(OPTOUT_KEY, '1');
    else localStorage.removeItem(OPTOUT_KEY);
  } catch {
    /* localStorage 가 막힌 환경 */
  }
};

/** 익명 식별자. 개인정보가 아니라 브라우저별 임의 UUID 다 — 순방문자 수를 세는 데만 쓴다 */
const getVisitorId = (): string | null => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

/** 주소창의 ?internal=1 / 0 으로 이 브라우저의 집계 제외를 토글한다 */
export const initAnalytics = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('internal')) {
      const v = params.get('internal');
      setOptOut(v !== '0' && v !== 'false');
    }
  } catch {
    /* no-op */
  }
};

/** 어드민의 "현재 내 IP" — track 함수가 서버에서 본 요청 IP 를 돌려준다 */
export const getMyIp = async (): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke('track', { body: { whoami: true } });
  if (error) throw error;
  return (data as { ip?: string } | null)?.ip ?? null;
};

const hostOf = (url: string): string | null => {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
};

export const trackPageview = async (path: string) => {
  if (isOptedOut()) return;
  if (path.startsWith('/admin')) return; // 어드민은 집계하지 않는다

  const ref = document.referrer || '';
  const refHost = hostOf(ref);
  /* 같은 사이트 안에서의 이동은 외부 유입이 아니다 — 안 걸러 내면 유입경로 1위가
     항상 자기 도메인이 된다 */
  const isSameHost = refHost === window.location.hostname;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    params = new URLSearchParams();
  }

  try {
    await supabase.functions.invoke('track', {
      body: {
        path,
        referrer: isSameHost ? null : ref || null,
        referrer_host: isSameHost ? null : refHost,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        visitor_id: getVisitorId(),
      },
    });
  } catch {
    /* 집계 실패가 화면에 영향을 주면 안 된다 */
  }
};

/** 회사소개서 다운로드 클릭 기록. item 은 downloads.item 에 그대로 들어간다 */
export const trackDownload = async (item: string, path?: string) => {
  if (isOptedOut()) return;
  const ref = document.referrer || '';
  const refHost = hostOf(ref);
  const isSameHost = refHost === window.location.hostname;
  try {
    await supabase.functions.invoke('track', {
      body: {
        event: 'download',
        item,
        path: path || window.location.pathname,
        referrer_host: isSameHost ? null : refHost,
        visitor_id: getVisitorId(),
      },
    });
  } catch {
    /* 무시 */
  }
};

// 방문자 페이지뷰 기록 Edge Function
// - 요청 IP 가 내부(사무실) IP 면 기록하지 않음 (내부자 제외)
// - 내부 IP 목록은 public.internal_ips 테이블에서 읽음 (어드민에서 관리)
//   + INTERNAL_IPS 시크릿이 있으면 함께 병합
// - IP 는 제외 판단에만 사용하고 DB 에 저장하지 않음 (개인정보 무저장)
// - body 에 { whoami: true } 를 보내면 호출자의 IP 를 돌려줌 (어드민 "현재 내 IP")
//
// 배포:
//   supabase functions deploy track --no-verify-jwt
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 자동 주입됨)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ENV_IPS = (Deno.env.get("INTERNAL_IPS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getClientIp = (req: Request): string | null => {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// 내부 IP 목록 캐시 (60초)
let cache: { ips: Set<string>; at: number } | null = null;
const TTL = 60_000;

const getInternalIps = async (): Promise<Set<string>> => {
  if (cache && Date.now() - cache.at < TTL) return cache.ips;
  const set = new Set<string>(ENV_IPS);
  const { data } = await supabase.from("internal_ips").select("ip");
  data?.forEach((r: { ip: string }) => r.ip && set.add(String(r.ip).trim()));
  cache = { ips: set, at: Date.now() };
  return set;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const ip = getClientIp(req);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* 빈 본문 허용 */
  }

  // 어드민: 현재 호출자 IP 반환
  if (body.whoami === true) return json({ ip });

  // 내부자(사무실 IP) 제외 — 기록하지 않고 종료
  const internalIps = await getInternalIps();
  if (ip && internalIps.has(ip)) return json({ skipped: "internal" });

  const str = (v: unknown, max: number) =>
    v == null ? null : String(v).slice(0, max);

  // 다운로드 이벤트
  if (body.event === "download") {
    const { error } = await supabase.from("downloads").insert({
      item: str(body.item, 64) ?? "unknown",
      path: str(body.path, 512),
      referrer_host: str(body.referrer_host, 255),
      visitor_id: str(body.visitor_id, 64),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // 기본: 페이지뷰
  const { error } = await supabase.from("pageviews").insert({
    path: str(body.path, 512) ?? "/",
    referrer: str(body.referrer, 1024),
    referrer_host: str(body.referrer_host, 255),
    utm_source: str(body.utm_source, 255),
    utm_medium: str(body.utm_medium, 255),
    utm_campaign: str(body.utm_campaign, 255),
    visitor_id: str(body.visitor_id, 64),
  });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});

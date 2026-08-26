"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Empty,
  PageHead,
  Select,
  Skeleton,
  Stats,
  Note,
} from "@/components/admin/ui";
import { supabase } from "@/lib/supabase";
import kit from "@/components/admin/kit.module.css";
import s from "./analytics.module.css";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import Text from "@/components/text/Text";

/* 방문자 분석. 옛 사이트의 /admin/analytics 를 이 어드민으로 옮긴 것이다.

   ⚠️ 기록은 이 화면이 아니라 Supabase Edge Function `track` 이 한다(lib/analytics.ts 참고).
      여기는 읽기만 한다 — pageviews / downloads 의 RLS 는 `to authenticated using (true)`
      라 로그인만 하면 읽힌다(옛 프로젝트의 pageviews.sql).
   ⚠️ 집계는 서버가 아니라 **브라우저에서** 한다. Supabase REST 에는 group by 가 없어서
      기간 내 행을 받아 와 세는 방식이다(옛 구현과 같다). 지금 865건이라 문제없지만,
      수만 건이 쌓이면 RPC(집계 함수)로 옮겨야 한다. 한 번에 5만 건까지만 받는다. */
type View = {
  created_at: string;
  path: string | null;
  referrer_host: string | null;
  visitor_id: string | null;
};
type Download = {
  created_at: string;
  item: string | null;
  visitor_id: string | null;
};

const RANGES = [
  { value: "7", label: "최근 7일" },
  { value: "14", label: "최근 14일" },
  { value: "30", label: "최근 30일" },
  { value: "90", label: "최근 90일" },
];

/** 로컬 시간대 기준 YYYY-MM-DD. toISOString 은 UTC 라 한국에서 하루가 밀린다 */
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE");

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const [views, setViews] = useState<View[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date();
    since.setDate(since.getDate() - Number(days));
    const sinceIso = since.toISOString();

    const [pv, dl] = await Promise.all([
      supabase
        .from("pageviews")
        .select("created_at, path, referrer_host, visitor_id")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(50000),
      supabase
        .from("downloads")
        .select("created_at, item, visitor_id")
        .gte("created_at", sinceIso)
        .limit(50000),
    ]);

    if (pv.error) setError(pv.error.message);
    setViews((pv.data as View[]) ?? []);
    /* downloads 는 없어도 화면이 떠야 한다 — 0 으로 표시한다 */
    setDownloads(dl.error ? [] : ((dl.data as Download[]) ?? []));
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    return {
      total: views.length,
      unique: new Set(views.map((v) => v.visitor_id).filter(Boolean)).size,
      today: views.filter((v) => dayKey(v.created_at) === today).length,
      brief: downloads.filter(
        (d) => d.item === "brochure" || d.item === "brief",
      ).length,
    };
  }, [views, downloads]);

  /* 일별 추이 — 기록이 없는 날도 0 으로 채워야 막대가 안 밀린다 */
  const daily = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = Number(days) - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      counts[d.toLocaleDateString("sv-SE")] = 0;
    }
    for (const v of views) {
      const k = dayKey(v.created_at);
      if (k in counts) counts[k] += 1;
    }
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [views, days]);

  const dailyMax = Math.max(1, ...daily.map((d) => d.count));

  const topBy = useCallback(
    (pick: (v: View) => string | null) =>
      Object.entries(
        views.reduce<Record<string, number>>((acc, v) => {
          const key = pick(v);
          if (key) acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    [views],
  );

  const topPaths = useMemo(() => topBy((v) => v.path), [topBy]);
  const topReferrers = useMemo(() => topBy((v) => v.referrer_host), [topBy]);

  return (
    <>
      <PageHead href="/admin/analytics" />

      {error ? <Note warn>{error}</Note> : null}

      <Flex row justify="end" mb={16}>
        <Select label="기간" value={days} options={RANGES} onChange={setDays} />
      </Flex>

      {loading ? (
        <Skeleton />
      ) : (
        <>
          <Stats
            items={[
              {
                label: "총 조회수",
                value: stats.total.toLocaleString(),
                unit: "회",
              },
              {
                label: "순 방문자",
                value: stats.unique.toLocaleString(),
                unit: "명",
              },
              {
                label: "오늘 조회수",
                value: stats.today.toLocaleString(),
                unit: "회",
              },
              {
                label: "회사소개서 다운로드",
                value: stats.brief.toLocaleString(),
                unit: "회",
              },
            ]}
          />

          <section className={kit.card}>
            <Heading
              as="h2"
              size="2"
              fontSize="13px"
              weight="700"
              className={s.head}
            >
              일별 추이
            </Heading>
            {stats.total === 0 ? (
              <Empty
                title="기록이 없습니다"
                desc="선택한 기간에 방문 기록이 없습니다."
              />
            ) : (
              <div className={s.chart}>
                {daily.map((d) => (
                  <div
                    className={s.barCell}
                    key={d.date}
                    title={`${d.date} · ${d.count}회`}
                  >
                    <div
                      className={s.bar}
                      style={{ height: `${(d.count / dailyMax) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
            <Flex row justify="between" className={s.axis}>
              <Text as="span" size="1" color="var(--muted)">
                {daily[0]?.date}
              </Text>
              <Text as="span" size="1" color="var(--muted)">
                {daily[daily.length - 1]?.date}
              </Text>
            </Flex>
          </section>

          <div className={s.two}>
            <RankCard title="인기 페이지" rows={topPaths} unit="회" />
            <RankCard
              title="유입 경로"
              rows={topReferrers}
              unit="회"
              empty="외부 유입 기록이 없습니다"
            />
          </div>
        </>
      )}
    </>
  );
}

function RankCard({
  title,
  rows,
  unit,
  empty = "기록이 없습니다",
}: {
  title: string;
  rows: { name: string; count: number }[];
  unit: string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className={kit.rankCard}>
      <Heading as="h2" size="2" fontSize="13px" weight="700" className={s.head}>
        {title}
      </Heading>
      {rows.length === 0 ? (
        <Empty title={empty} />
      ) : (
        <ul className={s.rank}>
          {rows.map((r) => (
            <li className={s.rankRow} key={r.name}>
              {/* 막대는 배경으로 깔고 글자는 그 위에 — 긴 경로도 안 잘린다 */}
              <div
                className={s.rankBar}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
              <Text
                as="span"
                size="2"
                fontSize="13px"
                truncate
                className={s.rankName}
              >
                {r.name}
              </Text>
              <Text
                as="span"
                size="2"
                fontSize="13px"
                weight="700"
                className={s.rankCount}
              >
                {r.count.toLocaleString()}
                {unit}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

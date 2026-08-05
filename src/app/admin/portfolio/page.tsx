"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Empty, Note, PageHead, Search, Select } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import {
  PORTFOLIO_CATEGORY_FILTER,
  PORTFOLIO_STATUS_FILTER,
  USE_YN_FILTER,
  labelOf,
} from "@/data/adminOptions";
import { describeError, isMissingTable } from "@/lib/pgError";
import { type Portfolio, formatDay, titleOneLine } from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Badge from "@/components/badge/Badge";
import Button from "@/components/button/Button";
import Text from "@/components/text/Text";
import Flex from "@/components/layouts/Flex";
import { VerticalDivider } from "@/components/divider/Divider";
import { Color } from "@/styles/theme";

/* 포트폴리오관리 - 목록 (기획서 23p)
   조회 조건: 포트폴리오명 키워드 + 분류 + 진행 상태 + 사용여부.

   필터는 클라이언트에서 건다 — 건수가 수백 단위를 넘어가면 PostgREST 쿼리로
   옮겨야 한다(견적문의와 같은 판단). */

const MISSING =
  "portfolios 스키마가 아직 없습니다. supabase/migrations/004_portfolios.sql 을 Supabase SQL Editor 에서 실행해 주세요.";

export default function PortfolioListPage() {
  const [rows, setRows] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [use, setUse] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase
        .from("portfolios")
        .select("*")
        .order("seq", { ascending: false });
      if (!alive) return;
      if (err) {
        if (isMissingTable(err)) setTableMissing(true);
        else setError(describeError(err));
      } else {
        setRows((data ?? []) as Portfolio[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (status !== "all" && r.status !== status) return false;
      if (use !== "all" && r.use_yn !== use) return false;
      if (needle && !titleOneLine(r.title).toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, q, category, status, use]);

  return (
    <>
      <PageHead
        href="/admin/portfolio"
        actions={
          <Button
            href="/admin/portfolio/new"
            label="등록"
            color="BLUE"
            startIcon="plus"
            variant="solid"
            size="2"
            radius="medium"
          />
        }
      />

      {tableMissing ? <Note warn>{MISSING}</Note> : null}
      {error ? <Note warn>{error}</Note> : null}

      <section className={kit.card}>
        <Flex
          row
          gap={16}
          p="14px 18px"
          wrap="wrap"
          align="center"
          style={{
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Search value={q} onChange={setQ} placeholder="포트폴리오명" />
          <VerticalDivider size={12} />
          <Flex gap={24} row align="center">
            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                분류
              </Text>
              <Select
                label="분류"
                value={category}
                onChange={setCategory}
                options={PORTFOLIO_CATEGORY_FILTER}
              />
            </Flex>

            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                진행 상태
              </Text>
              <Select
                label="진행 상태"
                value={status}
                onChange={setStatus}
                options={PORTFOLIO_STATUS_FILTER}
              />
            </Flex>

            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                사용여부
              </Text>
              <Select
                label="사용여부"
                value={use}
                onChange={setUse}
                options={USE_YN_FILTER}
              />
            </Flex>
          </Flex>

          <span className={kit.toolbarSpacer} />
          <Text size="1" fontSize="12.5px" className={kit.count}>
            조회결과 : <b>{visible.length}</b>건
          </Text>
        </Flex>

        {loading ? (
          <Empty title="불러오는 중…" desc="포트폴리오를 조회하고 있습니다." />
        ) : visible.length === 0 ? (
          <Empty
            title="조회 결과가 없습니다"
            desc="등록된 데이터가 없거나 조회 조건에 맞는 항목이 없습니다."
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 64 }}>No</th>
                  <th style={{ width: 130 }}>등록/수정일</th>
                  <th>포트폴리오명</th>
                  <th style={{ width: 120 }}>분류</th>
                  <th style={{ width: 110 }}>진행 상태</th>
                  <th style={{ width: 220 }}>HTML 파일명</th>
                  <th style={{ width: 90 }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{r.seq}</td>
                    <td className={kit.num}>{formatDay(r.updated_at)}</td>
                    <td>
                      <Link
                        href={`/admin/portfolio/${r.id}`}
                        className={kit.tdStrong}
                      >
                        {titleOneLine(r.title)}
                      </Link>
                    </td>
                    <td>
                      <Badge
                        label={r.category ?? "-"}
                        color="GRAY"
                        variant="surface"
                        size="1"
                        radius="medium"
                      />
                    </td>
                    <td>
                      <Badge
                        label={labelOf(PORTFOLIO_STATUS_FILTER, r.status ?? "")}
                        color={r.status === "ongoing" ? "BLUE" : "GREEN"}
                        variant="surface"
                        size="1"
                        radius="medium"
                      />
                    </td>
                    <td className={kit.clamp} style={{ textAlign: "center" }}>
                      {r.html_file ?? "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Text
                        size="2"
                        color={r.use_yn === "Y" ? "GREEN" : "GRAY"}
                      >
                        {r.use_yn}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <Text size="1">
            진행 프로젝트는 진행중 목록에, 종료 프로젝트는 종료 목록에
            노출됩니다. 사용여부 N 은 홈페이지에 나오지 않습니다.
          </Text>
          <Text size="1">기획서 3 · 포트폴리오관리 목록</Text>
        </div>
      </section>
    </>
  );
}

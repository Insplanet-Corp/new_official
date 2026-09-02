"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Empty,
  Note,
  PageHead,
  Search,
  Select,
  Skeleton,
  Stats,
  fmtDate,
  ValueBadge,
} from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { RECRUIT_FIELD_FILTER } from "@/data/adminOptions";
import { type Recruit } from "@/lib/recruits";
import { supabase } from "@/lib/supabase";
import Text from "@/components/text/Text";

/* 리크루트관리 - 목록 (기획서 35p)
   Contact > Join us > 채용확인 > Careers 팝업에서 접수된 지원서를 읽는다.

   ⚠️ 조회 조건은 **지원자 이름 + 지원분야** 뿐이다. 기획서의 기술등급 · 경력 ·
      재직상태는 Careers 폼이 받지 않아 컬럼 자체가 없다(018, 사용자 결정).
      되살리려면 폼 → 018 → adminOptions → 이 화면 순서로 같이 늘려야 한다.
   ⚠️ 읽기에는 '/admin/recruit' 메뉴권한이 필요하다(RLS). 화면이 보인다고 되는 게
      아니라 정책이 계정의 permissions 배열을 직접 본다 — 권한이 없으면 에러가 아니라
      **빈 목록**이 온다(RLS 는 행을 감출 뿐 거부하지 않는다). */
export default function RecruitListPage() {
  const [rows, setRows] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [field, setField] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("recruits")
        .select("*")
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        setError(
          /relation|schema cache/i.test(error.message)
            ? "recruits 테이블이 없습니다. supabase/migrations/018_recruits.sql 을 실행해 주세요."
            : error.message,
        );
      } else {
        setRows((data ?? []) as Recruit[]);
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
      if (field !== "all" && r.field !== field) return false;
      if (needle && !(r.name ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, field]);

  const countOf = (v: string) => rows.filter((r) => r.field === v).length;

  return (
    <>
      <PageHead href="/admin/recruit" />

      <Stats
        items={[
          { label: "전체 지원", value: rows.length, unit: "건" },
          ...RECRUIT_FIELD_FILTER.filter((o) => o.value !== "all").map((o) => ({
            label: o.label,
            value: countOf(o.value),
            unit: "건",
          })),
        ]}
      />

      {error ? <Note warn>{error}</Note> : null}

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="지원자" />
          <Select
            label="지원분야"
            value={field}
            onChange={setField}
            options={RECRUIT_FIELD_FILTER}
          />
          <span className={kit.toolbarSpacer} />
          <Text size="1" fontSize="12.5px" className={kit.count}>
            조회결과 : <b>{visible.length}</b> / {rows.length}건
          </Text>
        </div>

        {loading ? (
          <Skeleton />
        ) : visible.length === 0 ? (
          <Empty
            title={
              rows.length === 0
                ? "접수된 지원서가 없습니다"
                : "조회 결과가 없습니다"
            }
            desc={
              rows.length === 0
                ? "Contact 페이지의 Join us > 채용확인에서 지원서가 접수되면 이곳에 표시됩니다."
                : "검색어나 조회 조건을 바꿔보세요."
            }
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 140 }}>지원일시</th>
                  <th style={{ width: 130 }}>지원자</th>
                  <th style={{ width: 150 }}>연락처</th>
                  <th style={{ width: 200 }}>이메일</th>
                  <th style={{ width: 180 }}>지원분야</th>
                  <th style={{ width: 110 }}>첨부파일</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{fmtDate(r.created_at)}</td>
                    <td>
                      <Link
                        href={`/admin/recruit/${r.id}`}
                        className={kit.tdStrong}
                      >
                        {r.name || "-"}
                      </Link>
                    </td>
                    <td className={kit.nowrap}>{r.phone || "-"}</td>
                    <td className={kit.nowrap}>{r.email || "-"}</td>
                    <td>
                      <ValueBadge label={r.field} color="GRAY" />
                    </td>
                    <td>{r.file_name ? "있음" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <Text size="1" fontSize="12.5px">
            최신 지원순으로 정렬됩니다.
          </Text>
          <Text size="1" fontSize="12.5px">
            Supabase · recruits
          </Text>
        </div>
      </section>
    </>
  );
}

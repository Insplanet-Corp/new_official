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
} from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import {
  QUOTE_KIND_FILTER,
  QUOTE_SYSTEM_FILTER,
  QUOTE_STATUS,
} from "@/data/adminOptions";
import { hasField, fieldText, type Quote } from "@/lib/quotes";
import { supabase } from "@/lib/supabase";
import Badge from "@/components/badge/Badge";
import { type ColorType } from "@/styles/theme";
import Text from "@/components/text/Text";

/* 견적문의관리 - 목록 (기획서 31p)
   조회 조건: 기업명 + 신청인 키워드(둘 다 입력 시 AND) + 시스템 종류 + 개발 구분.

   시스템 종류·개발 구분은 project_fields(jsonb) 안에 있어 클라이언트에서 거른다.
   접수 건수가 많아지면 PostgREST 의 jsonb 연산자로 서버 필터링해야 한다. */

const STATUS_COLOR: Record<string, ColorType> = {
  pending: "BLUE",
  in_progress: "ORANGE",
  completed: "GREEN",
};
const statusMeta = (v: string | null) =>
  QUOTE_STATUS.find((s) => s.value === v) ?? {
    value: v ?? "",
    label: v || "미지정",
  };

export default function QuotesListPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [person, setPerson] = useState("");
  const [system, setSystem] = useState("all");
  const [kind, setKind] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as Quote[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* 진행 상태 변경 — 낙관적 갱신 후 실패하면 되돌린다 */
  const changeStatus = async (id: string, next: string) => {
    const prev = rows;
    setSaving(id);
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, status: next } : row)),
    );
    const { error } = await supabase
      .from("quotes")
      .update({ status: next })
      .eq("id", id);
    setSaving(null);
    if (error) {
      setRows(prev);
      setError(`상태 변경 실패: ${error.message}`);
    } else {
      setError(null);
    }
  };

  const visible = useMemo(() => {
    const c = company.trim().toLowerCase();
    const p = person.trim().toLowerCase();
    return rows.filter((r) => {
      if (!hasField(r, "scope", system)) return false;
      if (!hasField(r, "nature", kind)) return false;
      // 기업명·신청인 둘 다 입력하면 AND 검색 (기획서 31p 3번)
      if (c && !(r.company ?? "").toLowerCase().includes(c)) return false;
      if (p && !(r.person ?? "").toLowerCase().includes(p)) return false;
      return true;
    });
  }, [rows, company, person, system, kind]);

  const count = (v: string) => rows.filter((r) => r.status === v).length;

  return (
    <>
      <PageHead href="/admin/quotes" />

      <Stats
        items={[
          { label: "전체 문의", value: rows.length, unit: "건" },
          { label: "신규 접수", value: count("pending"), unit: "건" },
          { label: "검토 중", value: count("in_progress"), unit: "건" },
          { label: "완료", value: count("completed"), unit: "건" },
        ]}
      />

      {error ? <Note warn>{error}</Note> : null}

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={company} onChange={setCompany} placeholder="기업명" />
          <Search value={person} onChange={setPerson} placeholder="신청인" />
          <Select
            label="시스템 종류"
            value={system}
            onChange={setSystem}
            options={QUOTE_SYSTEM_FILTER}
          />
          <Select
            label="개발 구분"
            value={kind}
            onChange={setKind}
            options={QUOTE_KIND_FILTER}
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
                ? "접수된 견적 문의가 없습니다"
                : "조회 결과가 없습니다"
            }
            desc={
              rows.length === 0
                ? "Contact 페이지에서 문의가 접수되면 이곳에 표시됩니다."
                : "검색어나 조회 조건을 바꿔보세요."
            }
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 140 }}>접수일시</th>
                  <th style={{ width: 180 }}>기업 / 신청인</th>
                  <th style={{ width: 150 }}>연락처</th>
                  <th>시스템 종류</th>
                  <th style={{ width: 110 }}>개발 구분</th>
                  <th style={{ width: 150 }}>진행 상태</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{fmtDate(r.created_at)}</td>
                    <td>
                      {/* 기업명 또는 신청인 클릭 -> 조회 화면 (기획서 31p 7번) */}
                      <Link
                        href={`/admin/quotes/${r.id}`}
                        className={kit.tdStrong}
                      >
                        {r.company || "-"}
                      </Link>
                      <div className={kit.tdSub}>{r.person || "-"}</div>
                    </td>
                    <td className={kit.nowrap}>{r.phone || "-"}</td>
                    <td>
                      <div className={kit.chips}>
                        {(r.project_fields?.scope ?? []).map((v) => (
                          <Text
                            size="1"
                            fontSize="11.5px"
                            className={kit.chip}
                            key={v}
                          >
                            {v}
                          </Text>
                        ))}
                      </div>
                    </td>
                    <td>{fieldText(r, "nature") || "-"}</td>
                    <td>
                      <Badge
                        label={statusMeta(r.status).label}
                        color={STATUS_COLOR[r.status ?? ""] ?? "GRAY"}
                        variant="surface"
                        size="1"
                        radius="medium"
                      />
                      <select
                        className={kit.statusSelect}
                        aria-label="진행 상태 변경"
                        value={r.status ?? ""}
                        disabled={saving === r.id}
                        onChange={(e) => changeStatus(r.id, e.target.value)}
                      >
                        {QUOTE_STATUS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <Text size="1" fontSize="12.5px">
            최신 접수순으로 정렬됩니다.
          </Text>
          <Text size="1" fontSize="12.5px">
            Supabase · quotes
          </Text>
        </div>
      </section>
    </>
  );
}

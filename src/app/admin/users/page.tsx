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
  fmtDate,
} from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { ADMIN_TABS } from "@/components/admin/tabs";
import { USE_YN_FILTER } from "@/data/adminOptions";
import {
  MISSING_TABLE_NOTICE,
  describeError,
  isMissingTable,
  permissionLabels,
  type AdminUser,
} from "@/lib/adminUsers";
import { supabase } from "@/lib/supabase";
import Badge from "@/components/badge/Badge";
import Button from "@/components/button/Button";
import Text from "@/components/text/Text";

/* 사용자관리 - 목록 (기획서 39p)
   조회 조건: 사용자명 · ID 키워드 + 사용여부. */
export default function UsersListPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const [q, setQ] = useState("");
  const [use, setUse] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        if (isMissingTable(error)) setTableMissing(true);
        else setError(describeError(error));
      } else {
        setRows((data ?? []) as AdminUser[]);
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
      if (use !== "all" && r.use_yn !== use) return false;
      if (!needle) return true;
      return [r.name, r.login_id].some((x) =>
        (x ?? "").toLowerCase().includes(needle),
      );
    });
  }, [rows, q, use]);

  return (
    <>
      <PageHead
        href="/admin/users"
        actions={
          <Link href="/admin/users/new">
            <Button
              label="등록"
              color="BLUE"
              startIcon="plus"
              variant="solid"
              size="2"
              radius="medium"
              onClick={() => {}}
            />
          </Link>
        }
      />

      {tableMissing ? <Note warn>{MISSING_TABLE_NOTICE}</Note> : null}
      {error ? <Note warn>{error}</Note> : null}

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="사용자명 · ID" />
          <Select
            label="사용여부"
            value={use}
            onChange={setUse}
            options={USE_YN_FILTER}
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
                ? "등록된 사용자가 없습니다"
                : "조회 결과가 없습니다"
            }
            desc={
              tableMissing
                ? "테이블 생성 후 계정 프로필을 등록하면 이곳에 표시됩니다."
                : "검색어나 사용여부 조건을 바꿔보세요."
            }
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 130 }}>등록일</th>
                  <th>사용자명</th>
                  <th style={{ width: 160 }}>사용자 ID</th>
                  <th style={{ width: 150 }}>전화번호</th>
                  <th>메뉴권한</th>
                  <th style={{ width: 90 }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{fmtDate(r.created_at)}</td>
                    <td>
                      {/* 사용자명 · ID 클릭 -> 조회 화면 (기획서 39p 8번) */}
                      <Link
                        href={`/admin/users/${r.id}`}
                        className={kit.tdStrong}
                      >
                        {r.name}
                      </Link>
                      <div className={kit.tdSub}>{r.email}</div>
                    </td>
                    <td>
                      <Link href={`/admin/users/${r.id}`}>{r.login_id}</Link>
                    </td>
                    <td className={kit.nowrap}>{r.phone || "-"}</td>
                    <td className={kit.clamp}>
                      {permissionLabels(r.permissions, ADMIN_TABS) || "없음"}
                    </td>
                    <td>
                      <Badge
                        label={r.use_yn}
                        color={r.use_yn === "Y" ? "GREEN" : "GRAY"}
                        variant="surface"
                        size="1"
                        radius="medium"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <Text size="1" fontSize="12.5px">
            로그인 자체는 Supabase Auth 가 처리하고, 이 표는 그 계정의
            프로필입니다.
          </Text>
          <Text size="1" fontSize="12.5px">
            Supabase · admin_users
          </Text>
        </div>
      </section>
    </>
  );
}

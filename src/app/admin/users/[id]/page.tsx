"use client";

import { use, useEffect, useState } from "react";
import { Actions, ReadOnly, Row } from "@/components/admin/form";
import { Empty, Note, Skeleton, SubHead, fmtDate } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { ADMIN_TABS } from "@/components/admin/tabs";
import {
  MISSING_TABLE_NOTICE,
  describeError,
  isMissingTable,
  permissionLabels,
  type AdminUser,
} from "@/lib/adminUsers";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";

/* 사용자관리 - 조회 (기획서 42p) */
export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [row, setRow] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        if (isMissingTable(error)) setTableMissing(true);
        else setError(describeError(error));
      } else {
        setRow((data as AdminUser) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 조회"
        desc="등록된 계정 정보입니다."
        actions={
          <Button
            href="/admin/users"
            label="목록"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
          />
        }
      />

      {tableMissing ? <Note warn>{MISSING_TABLE_NOTICE}</Note> : null}
      {error ? <Note warn>{error}</Note> : null}

      {loading ? (
        <section className={kit.card}>
          <Skeleton />
        </section>
      ) : !row ? (
        <section className={kit.card}>
          <Empty
            title="계정을 찾을 수 없습니다"
            desc="이미 삭제되었거나 잘못된 주소입니다."
          />
        </section>
      ) : (
        <section className={kit.card}>
          <Row label="사용자명">
            <ReadOnly>{row.name}</ReadOnly>
          </Row>
          <Row label="사용여부">
            <ReadOnly>{row.use_yn}</ReadOnly>
          </Row>
          <Row label="사용자 ID">
            <ReadOnly>{row.login_id}</ReadOnly>
          </Row>
          <Row label="이메일" hint="Supabase Auth 로그인에 쓰는 주소입니다.">
            <ReadOnly>{row.email}</ReadOnly>
          </Row>
          <Row label="전화번호">
            <ReadOnly>{row.phone}</ReadOnly>
          </Row>
          <Row label="메뉴권한">
            <ReadOnly>
              {permissionLabels(row.permissions, ADMIN_TABS) || null}
            </ReadOnly>
          </Row>
          <Row label="등록일">
            <ReadOnly>{fmtDate(row.created_at)}</ReadOnly>
          </Row>
        </section>
      )}

      <Actions>
        <Button
          href={`/admin/users/${id}/edit`}
          label="수정"
          variant="solid"
          color="BLUE"
          size="2"
          radius="medium"
        />
        <Button
          href="/admin/users"
          label="취소"
          variant="outline"
          color="GRAY"
          size="2"
          radius="medium"
        />
      </Actions>
    </>
  );
}

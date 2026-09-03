"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Actions, ReadOnly, Row } from "@/components/admin/form";
import { Empty, Note, Skeleton, SubHead, fmtDate } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { ADMIN_TABS } from "@/components/admin/tabs";
import {
  MISSING_TABLE_NOTICE,
  deleteAdminUser,
  describeError,
  isMissingTable,
  permissionLabels,
  type AdminUser,
} from "@/lib/adminUsers";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";
import ReasonDialog from "@/components/admin/ReasonDialog";

/* 사용자관리 - 조회 (기획서 42p) */
export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [row, setRow] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  /* 삭제 — 되돌릴 수 없다. Auth 계정을 지우면 프로필이 cascade 로 따라 사라진다.

     ⚠️ 사유를 받지 않는다(ReasonDialog 의 withReason={false}) — 리크루트 삭제와
        같은 이유로, 계정 삭제를 남길 기록 테이블이 없어서 적어도 아무 데도 안 남는다.
        남길 곳이 생기면 그때 사유 입력을 켤 것.
     ⚠️ 본인 계정과 마지막 사용자관리 권한 계정은 **라우트가** 막는다. 화면에서도
        본인 계정이면 버튼을 잠그지만, 그건 편의일 뿐이고 실제 방어선은 서버다. */
  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    const err = await deleteAdminUser(supabase, id);
    setDeleting(false);
    if (err) {
      setDeleteError(err);
      return;
    }
    router.push("/admin/users");
  };

  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 조회"
        desc="등록된 계정 정보입니다."
        actions={
          <>
            {/* 되돌릴 수 없다 — 어드민 색 규칙상 삭제는 RED outline */}
            <Button
              label="삭제"
              variant="outline"
              color="RED"
              size="2"
              radius="medium"
              disabled={!row}
              onClick={() => {
                setDeleteError(null);
                setAskDelete(true);
              }}
            />
            <Button
              href="/admin/users"
              label="목록"
              variant="outline"
              color="GRAY"
              size="2"
              radius="medium"
            />
          </>
        }
      />

      <ReasonDialog
        open={askDelete}
        title="계정 삭제"
        desc={
          row
            ? `${row.name}(${row.login_id}) 계정을 지웁니다. 로그인 계정과 프로필이 함께 사라지며 되돌릴 수 없습니다.`
            : ""
        }
        confirmLabel="삭제"
        confirmColor="RED"
        withReason={false}
        busy={deleting}
        error={deleteError}
        onConfirm={remove}
        onCancel={() => setAskDelete(false)}
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

"use client";

import { use } from "react";
import MainForm from "@/components/admin/MainForm";
import { Note, SubHead } from "@/components/admin/ui";
import Button from "@/components/button/Button";

/* 메인관리 - 수정 (기획서 14p) — 항목은 등록 화면과 동일 */
export default function MainEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Main"
        title="메인관리 – 수정"
        desc="등록된 메인 노출 항목을 수정합니다."
        actions={
          <>
            <Button
              href={`/admin/main/${id}`}
              label="조회"
              variant="outline"
              color="GRAY"
              size="2"
              radius="medium"
            />
            <Button
              href="/admin/main"
              label="목록"
              variant="outline"
              color="GRAY"
              size="2"
              radius="medium"
            />
          </>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 기존 데이터 로드와 저장은 다음 단계입니다 (요청 ID:{" "}
          <code>{id}</code>).
        </span>
      </Note>

      <MainForm mode="edit" />
    </>
  );
}

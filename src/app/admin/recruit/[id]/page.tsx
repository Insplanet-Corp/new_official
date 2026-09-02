"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Actions,
  FileLink,
  ReadOnly,
  Row,
  Section,
} from "@/components/admin/form";
import { Empty, Note, Skeleton, SubHead, fmtDate } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { recruitFileUrl, type Recruit } from "@/lib/recruits";
import { RETENTION, purgeTargets } from "@/lib/retention";
import ReasonDialog from "@/components/admin/ReasonDialog";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";

/* 리크루트관리 - 조회 (기획서 36p)
   Careers 입사지원 팝업이 받는 항목 그대로다 — 지원자 정보 + 첨부 자료.

   ⚠️ 첨부파일은 **비공개 버킷**(recruit, 018)에 있어 공개 URL 이 없다. 누를 때마다
      서명 URL 을 새로 만든다 — 화면을 열 때 한 번 만들어 두면 오래 열어 둔 탭에서
      만료된 주소를 누르게 된다. 이 호출도 Storage 의 select 정책을 타므로
      '/admin/recruit' 권한이 없으면 실패한다(정상 동작). */
export default function RecruitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [row, setRow] = useState<Recruit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  /* 파기 — 확인 대화상자 */
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("recruits")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setError(
          /relation|schema cache/i.test(error.message)
            ? "recruits 테이블이 없습니다. supabase/migrations/018_recruits.sql 을 실행해 주세요."
            : error.message,
        );
      } else {
        setRow((data as Recruit) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /* 서명 URL 은 Content-Disposition: attachment 를 달고 오므로 location 을 바꿔도
     페이지가 이동하지 않고 다운로드만 시작된다. */
  const download = async () => {
    if (!row?.file_path || downloading) return;
    setDownloading(true);
    const { url, error } = await recruitFileUrl(row.file_path, row.file_name);
    setDownloading(false);
    if (error || !url) {
      setError(
        `첨부파일을 불러오지 못했습니다: ${error ?? "알 수 없는 오류"}. ` +
          "이 계정에 '리크루트관리' 권한이 있는지 확인해 주세요.",
      );
      return;
    }
    setError(null);
    window.location.href = url;
  };

  /* 파기 — 되돌릴 수 없다. **파일 먼저, 행 나중**(lib/retention.ts 주석 참고).

     ⚠️ 견적문의와 달리 **사유를 받지 않는다** — 리크루트에는 기록 테이블이 없어서
        적어도 아무 데도 안 남는다. 남길 곳이 생기면 그때 사유 입력을 켤 것
        (ReasonDialog 의 withReason).

     ℹ️ 보유기간(제출 후 3년)이 지난 지원서는 /api/retention 이 매일 자동으로 지운다.
        이 버튼은 그 전에 사람이 즉시 지워야 할 때를 위한 것이다. */
  const remove = async () => {
    if (!row) return;
    setDeleting(true);
    setDeleteError(null);
    const { error: purgeError } = await purgeTargets(supabase, "recruits", [
      { id: row.id, file_path: row.file_path },
    ]);
    setDeleting(false);
    if (purgeError) {
      setDeleteError(purgeError);
      return;
    }
    router.push("/admin/recruit");
  };

  return (
    <>
      <SubHead
        eyebrow="Recruit"
        title="리크루트관리 – 조회"
        desc="접수된 지원서 상세 내용입니다."
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
              href="/admin/recruit"
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
        title="지원서 파기"
        desc={`이 지원서와 첨부 이력서를 즉시 지웁니다. 되돌릴 수 없습니다. (보유기간이 지난 지원서는 ${RETENTION.recruits.label} 규칙으로 자동 파기됩니다.)`}
        confirmLabel="파기"
        confirmColor="RED"
        withReason={false}
        busy={deleting}
        error={deleteError}
        onConfirm={remove}
        onCancel={() => setAskDelete(false)}
      />

      {error ? <Note warn>{error}</Note> : null}

      {loading ? (
        <section className={kit.card}>
          <Skeleton />
        </section>
      ) : !row ? (
        <section className={kit.card}>
          <Empty
            title="지원서를 찾을 수 없습니다"
            desc="이미 삭제되었거나 잘못된 주소입니다."
          />
        </section>
      ) : (
        <>
          <Section title="지원자 정보">
            <Row label="지원자 성명">
              <ReadOnly>{row.name}</ReadOnly>
            </Row>
            <Row label="지원분야">
              <ReadOnly>{row.field}</ReadOnly>
            </Row>
            <Row label="연락처">
              <ReadOnly>{row.phone}</ReadOnly>
            </Row>
            <Row label="이메일">
              <ReadOnly>{row.email}</ReadOnly>
            </Row>
            <Row label="지원일시">
              <ReadOnly>{fmtDate(row.created_at)}</ReadOnly>
            </Row>
          </Section>

          <Section title="첨부 자료">
            <Row
              label="첨부파일"
              hint={
                row.file_name
                  ? `파일명을 클릭하면 다운로드됩니다.${
                      row.file_size ? ` (${mb(row.file_size)})` : ""
                    }`
                  : "첨부된 파일이 없습니다."
              }
            >
              <FileLink
                name={row.file_name}
                onClick={download}
                busy={downloading}
              />
            </Row>
            <Row
              label="포트폴리오 URL"
              hint="지원 화면에서 입력한 피그마 · 깃허브 등의 주소입니다."
            >
              {row.url ? (
                <div className={kit.tdStrong}>
                  <a href={row.url} target="_blank" rel="noreferrer noopener">
                    {row.url}
                  </a>
                </div>
              ) : (
                <ReadOnly muted>{null}</ReadOnly>
              )}
            </Row>
          </Section>
        </>
      )}

      <Actions>
        <Button
          href="/admin/recruit"
          label="목록"
          variant="outline"
          color="GRAY"
          size="2"
          radius="medium"
        />
      </Actions>
    </>
  );
}

function mb(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

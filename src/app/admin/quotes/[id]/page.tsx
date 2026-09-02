"use client";

import { use, useEffect, useRef, useState } from "react";
import { Actions, FileLink, ReadOnly, Row, Section } from "@/components/admin/form";
import { Empty, Note, Skeleton, SubHead, fmtDate } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { fieldText, quoteFileUrl, type Quote } from "@/lib/quotes";
import { maskCompany, maskEmail, maskName, maskPhone } from "@/lib/mask";
import { logQuoteDownload, logQuoteFile, logQuoteView } from "@/lib/quoteAccessLog";
import { buildQuotesCsv, csvFileName, downloadCsv } from "@/lib/quotesCsv";
import ReasonDialog from "@/components/admin/ReasonDialog";
import { QUOTE_STATUS } from "@/data/adminOptions";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";

/* 견적문의관리 - 조회 (기획서 32p)
   세 덩어리로 나눠 출력: 의뢰인 정보 / 프로젝트 기본 정보 / 프로젝트 상세 정보.

   ⚠️ **기업명·신청인·연락처·이메일 원본은 열람 기록이 남은 뒤에만 보여준다**(2026-09-01).
   목록은 마스킹된 값만 보여주고, 이 화면에 들어오면 quote_access_logs 에
   'view' 를 남긴 다음 원본으로 바꾼다. 기록이 실패하면(020 미실행, 권한 없음 …)
   마스킹된 채로 두고 띠 배너로 알린다 — 기록 없이 개인정보를 드러내지 않는 것이
   이 기능의 목적이라, 화면을 막는 대신 "가린 채로 보여주는" 쪽을 택했다.

   ⚠️ **CSV 다운로드도 여기, 건별로만 있다**(2026-09-01 사용자 결정: "전체 말고 건별로").
   목록에서 조회 결과 전체를 받는 버튼은 두지 않는다 — 한 번에 수십 건이 빠져나가는
   경로를 아예 만들지 않는 편이 통제에 맞다. 순서는 **사유 → 기록 성공 → 파일 생성** 이다. */
export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [row, setRow] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* 열람 기록이 남았는가 = 원본을 보여줘도 되는가 */
  const [revealed, setRevealed] = useState(false);
  const [logNote, setLogNote] = useState<string | null>(null);
  /* CSV 다운로드 — 사유 입력 모달 */
  const [askReason, setAskReason] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /* 첨부파일 다운로드 */
  const [filing, setFiling] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (error) setError(error.message);
      else setRow((data as Quote) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /* 열람 기록 — 행을 실제로 받아온 뒤 한 번만.
     ⚠️ ref 로 잠근다. StrictMode 는 effect 를 두 번 돌리고(개발), 리렌더마다
     다시 돌면 화면 하나를 여는 데 기록이 여러 줄 쌓인다. ref 는 StrictMode 의
     재마운트에도 값이 유지되므로 여기서는 state 보다 ref 가 맞다. */
  const logged = useRef<string | null>(null);
  useEffect(() => {
    if (!row || logged.current === row.id) return;
    logged.current = row.id;
    let alive = true;
    void logQuoteView(row.id).then(({ error }) => {
      if (!alive) return;
      if (error) setLogNote(error);
      else setRevealed(true);
    });
    return () => {
      alive = false;
    };
  }, [row]);

  /* 사유 → 기록 → 파일. 기록이 실패하면 **파일을 만들지 않는다** — 기록 없는
     개인정보 반출을 막는 것이 이 기능의 목적이기 때문이다. */
  const download = async (reason: string) => {
    if (!row) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await logQuoteDownload({ ids: [row.id], reason });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    downloadCsv(buildQuotesCsv([row]), csvFileName(row.company));
    setAskReason(false);
  };

  /* 첨부파일 — CSV 와 같은 순서다: **기록 성공 → 파일**. 기록이 실패하면 내려받지
     않는다(기록 없는 개인정보 반출을 막는 것이 이 화면의 목적이다). 023 을 아직
     안 돌렸으면 action 검사(23514)에 걸려 여기서 멈추고 안내가 뜬다.

     ⚠️ 서명 URL 은 누를 때마다 새로 만든다 — 화면을 열 때 미리 만들어 두면 오래
     열어 둔 탭에서 만료된 주소를 누르게 된다. */
  const downloadFile = async () => {
    if (!row?.file_path || filing) return;
    setFiling(true);
    const logged = await logQuoteFile(row.id);
    if (logged.error) {
      setFiling(false);
      setError(`열람 기록을 남기지 못해 첨부파일을 내려받지 않았습니다. ${logged.error}`);
      return;
    }
    const { url, error: urlError } = await quoteFileUrl(row.file_path, row.file_name);
    setFiling(false);
    if (urlError || !url) {
      setError(
        `첨부파일을 불러오지 못했습니다: ${urlError ?? "알 수 없는 오류"}. ` +
          "이 계정에 '견적문의관리' 권한이 있는지 확인해 주세요.",
      );
      return;
    }
    setError(null);
    window.location.href = url;
  };

  const statusLabel =
    QUOTE_STATUS.find((x) => x.value === row?.status)?.label ??
    row?.status ??
    null;

  return (
    <>
      <SubHead
        eyebrow="Inquiries"
        title="견적문의관리 – 조회"
        desc="접수된 견적 문의 상세 내용입니다."
        actions={
          <>
            {/* 개인정보가 원본 그대로 담기는 파일이라 사유를 먼저 받는다 */}
            <Button
              label="CSV 다운로드"
              variant="outline"
              color="GRAY"
              size="2"
              radius="medium"
              disabled={!row}
              onClick={() => {
                setSaveError(null);
                setAskReason(true);
              }}
            />
            <Button
              href="/admin/quotes"
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
        open={askReason}
        title="CSV 다운로드 사유"
        desc="이 문의의 연락처·이메일이 원본 그대로 저장됩니다. 사유는 열람 기록에 함께 남습니다."
        confirmLabel="다운로드"
        busy={saving}
        error={saveError}
        onConfirm={download}
        onCancel={() => setAskReason(false)}
      />

      {error ? <Note warn>{error}</Note> : null}
      {logNote ? (
        <Note warn>
          {`열람 기록을 남기지 못해 연락처·이메일을 가린 채로 표시합니다. ${logNote}`}
        </Note>
      ) : null}

      {loading ? (
        <section className={kit.card}>
          <Skeleton />
        </section>
      ) : !row ? (
        <section className={kit.card}>
          <Empty
            title="문의를 찾을 수 없습니다"
            desc="이미 삭제되었거나 잘못된 주소입니다."
          />
        </section>
      ) : (
        <>
          <Section title="의뢰인 정보">
            {/* 원본은 열람 기록이 남은 뒤에만 (위 주석 참고) */}
            <Row label="기업명">
              <ReadOnly>
                {revealed ? row.company : maskCompany(row.company)}
              </ReadOnly>
            </Row>
            <Row label="신청인">
              <ReadOnly>{revealed ? row.person : maskName(row.person)}</ReadOnly>
            </Row>
            <Row label="연락처">
              <ReadOnly>{revealed ? row.phone : maskPhone(row.phone)}</ReadOnly>
            </Row>
            <Row label="이메일">
              <ReadOnly>{revealed ? row.email : maskEmail(row.email)}</ReadOnly>
            </Row>
            <Row label="접수일시">
              <ReadOnly>{fmtDate(row.created_at)}</ReadOnly>
            </Row>
            <Row label="진행 상태">
              <ReadOnly>{statusLabel}</ReadOnly>
            </Row>
          </Section>

          <Section title="프로젝트 기본 정보">
            <Row label="프로젝트 업무범위">
              <ReadOnly>{fieldText(row, "scope")}</ReadOnly>
            </Row>
            <Row label="프로젝트 성격">
              <ReadOnly>{fieldText(row, "nature")}</ReadOnly>
            </Row>
            <Row label="프로젝트 예산">
              <ReadOnly>{fieldText(row, "budget")}</ReadOnly>
            </Row>
            <Row label="프로젝트 기간">
              <ReadOnly>{fieldText(row, "period")}</ReadOnly>
            </Row>
          </Section>

          <Section title="프로젝트 상세 정보">
            <Row label="기존 사이트 URL">
              <ReadOnly>{row.url}</ReadOnly>
            </Row>
            <Row label="프로젝트 내용">
              <ReadOnly>{row.content}</ReadOnly>
            </Row>
            <Row
              label="첨부파일"
              hint={
                row.file_name
                  ? `파일명을 클릭하면 다운로드됩니다.${
                      row.file_size ? ` (${mb(row.file_size)})` : ""
                    } 내려받은 기록이 남습니다.`
                  : "첨부된 파일이 없습니다."
              }
            >
              <FileLink
                name={row.file_name}
                onClick={downloadFile}
                busy={filing}
              />
            </Row>
          </Section>
        </>
      )}

      <Actions>
        <Button
          href="/admin/quotes"
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

/* 리크루트 조회 화면과 같은 표기 */
function mb(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

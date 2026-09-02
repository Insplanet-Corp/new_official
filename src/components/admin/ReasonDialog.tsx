"use client";

import { useEffect, useRef, useState } from "react";
import { Note } from "@/components/admin/ui";
import { Textarea } from "@/components/admin/form";
import Button from "@/components/button/Button";
import type { ColorType } from "@/styles/theme";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import Text from "@/components/text/Text";
import s from "./ReasonDialog.module.css";

/* 사유를 받고 나서야 진행되는 동작(개인정보 다운로드·파기)에 붙이는 모달.

   ⚠️ 사유가 비면 확인 버튼을 잠근다. 화면 잠금은 편의일 뿐이고 실제 방어선은
   quote_access_logs 의 check 제약이다 — 사유 없는 'download' 행은 DB 가 거부한다.

   `withReason={false}` 로 두면 사유 칸 없이 **확인 대화상자**로 쓴다 — 리크루트
   삭제처럼 남길 기록 테이블이 없는 곳에 쓴다(빈 칸만 띄워 놓으면 뭘 적어야 하는지
   알 수 없고, 적어도 아무 데도 안 남는다).
   `confirmColor="RED"` 는 되돌릴 수 없는 동작(파기)에 쓴다 — 어드민 색 규칙과 같다. */
export default function ReasonDialog({
  open,
  title,
  desc,
  confirmLabel = "확인",
  confirmColor = "BLUE",
  withReason = true,
  placeholder = "예) 2026-09-01 영업팀 견적 회신용",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  desc?: string;
  confirmLabel?: string;
  confirmColor?: ColorType;
  /** false 면 사유 칸 없이 확인 대화상자로 쓴다 */
  withReason?: boolean;
  placeholder?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  /* 열 때마다 비운다 — 지난번 사유가 남아 있으면 그대로 눌러 버리기 쉽다 */
  useEffect(() => {
    if (!open) return;
    setReason("");
    const t = setTimeout(() => {
      boxRef.current?.querySelector("textarea")?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [open]);

  // ESC 로 닫기 (처리 중에는 닫지 않는다 — 기록만 남고 파일은 안 받는 상태를 막는다)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const ready = !withReason || reason.trim().length >= 2;

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (!busy && !boxRef.current?.contains(e.target as Node)) onCancel();
      }}
    >
      <div className={s.panel} ref={boxRef}>
        <Flex gap={8} mb={16}>
          <Heading as="h2" size="4" fontSize="18px" weight="700">
            {title}
          </Heading>
          {desc ? (
            <Text as="p" size="2" fontSize="13px" color="var(--muted)">
              {desc}
            </Text>
          ) : null}
        </Flex>

        {withReason ? (
          <Textarea value={reason} onChange={setReason} placeholder={placeholder} />
        ) : null}

        {error ? <Note warn>{error}</Note> : null}

        <Flex row justify="end" gap={8} mt={16}>
          <Button
            label="취소"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
            disabled={busy}
            onClick={onCancel}
          />
          <Button
            label={busy ? "처리 중…" : confirmLabel}
            variant="solid"
            color={confirmColor}
            size="2"
            radius="medium"
            disabled={!ready || busy}
            onClick={() => onConfirm(reason.trim())}
          />
        </Flex>
      </div>
    </div>
  );
}

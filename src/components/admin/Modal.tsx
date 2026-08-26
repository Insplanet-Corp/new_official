"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icon/Icon";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import s from "./Modal.module.css";

/* 어드민 공용 다이얼로그.

   닫는 방법 세 가지를 다 붙여 둔다 — X 버튼 · ESC · 바깥 클릭.
   ⚠️ 바깥 클릭은 mousedown 이 **배경에서 시작했을 때만** 닫는다. click 하나로 판정하면
      본문 안에서 글자를 긁다가 손이 배경에서 떨어졌을 때 창이 닫혀 버린다.
   ⚠️ 열려 있는 동안 body 스크롤을 잠근다. 어드민은 Lenis 를 쓰지 않으므로
      (LegacyRuntime 은 마케팅 PageShell 전용) overflow:hidden 하나로 충분하다. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const downOnBackdrop = useRef(false);
  const titleId = useRef(`modal-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!open) return;

    // 열기 직전에 포커스가 있던 곳을 기억했다가 닫을 때 돌려준다
    const prev = document.activeElement as HTMLElement | null;
    /* ⚠️ 닫기 버튼이 아니라 패널에 포커스를 준다. 버튼에 주면 크롬이 그것을
       focus-visible 로 보고 노란 기본 포커스링을 그린다(실측: outline
       rgb(229,151,0)). 패널(tabIndex -1)에 주면 링이 안 뜨면서도 Tab 순서가
       다이얼로그 안에서 시작하고 스크린리더가 제목을 읽는다. */
    panelRef.current?.focus();

    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      // 한글 IME 조합 중 ESC 는 조합 취소용이라 가로채면 안 된다
      if (e.key === "Escape" && !e.isComposing) onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = bodyOverflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={s.backdrop}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
        downOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
      >
        <Flex row align="center" justify="between" gap={16} className={s.head}>
          <Heading as="h2" size="3" fontSize="15px" weight="700" id={titleId.current}>
            {title}
          </Heading>
          <button
            type="button"
            className={s.close}
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="close" size={16} />
          </button>
        </Flex>

        <div className={s.body}>{children}</div>

        {footer ? (
          <Flex row align="center" justify="end" gap={8} className={s.foot}>
            {footer}
          </Flex>
        ) : null}
      </div>
    </div>
  );
}

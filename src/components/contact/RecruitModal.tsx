'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChipGroup from '@/components/contact/ChipGroup';
import FileRow from '@/components/contact/FileRow';
import FilteredInput from '@/components/contact/FilteredInput';
import { RECRUIT_ROLES } from '@/data/contact';
import { allFilled, firstMissing, jumpToField, type RequiredField } from '@/lib/formGating';

type LenisLike = { stop?: () => void; start?: () => void };

/* Careers recruit popup — opened by the Join Us 채용확인 button. Its leaf controls reuse the contact
   .ct-* classes (locked to their 2560 sizing via --v/--g:1 on .rc-modal). Rendered outside
   #page-root so position:fixed stays viewport-relative regardless of the page's enter transform. */
export default function RecruitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [role, setRole] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  // portalled into <body> so it lives outside #page-root: position:fixed must stay
  // viewport-relative regardless of the page's enter transform
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cardRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const phone = useRef<HTMLInputElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const url = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileName = useRef<HTMLInputElement>(null);
  const fileButton = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  // open / close: lock the page scroll (Lenis + html.rc-lock) and move focus into the dialog
  useEffect(() => {
    const html = document.documentElement;
    const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
    if (!open) return;
    lastFocus.current = document.activeElement;
    html.classList.add('rc-lock');
    lenis?.stop?.();
    const t = setTimeout(() => {
      try {
        closeRef.current?.focus({ preventScroll: true });
      } catch {
        /* focus can throw mid-transition */
      }
    }, 80);
    return () => {
      clearTimeout(t);
      html.classList.remove('rc-lock');
      lenis?.start?.();
      const prev = lastFocus.current;
      if (prev instanceof HTMLElement) {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          /* the opener may be gone */
        }
      }
    };
  }, [open]);

  // close on ESC / on a click outside the card
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    addEventListener('keydown', onKey);
    addEventListener('mousedown', onDown);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('mousedown', onDown);
    };
  }, [open, onClose]);

  /* 지원분야·이름·연락처·이메일·파일이 모두 채워질 때까지 비활성 (포트폴리오 URL은 선택). */
  const requiredFields = useCallback((): RequiredField[] => {
    const fields: RequiredField[] = [
      {
        ok: () => role.length > 0,
        scroll: groupRef.current?.closest<HTMLElement>('.rc-row') ?? null,
        focus: groupRef.current?.querySelector<HTMLElement>('.ct-chip') ?? null,
        flash: groupRef.current,
      },
    ];
    for (const input of [name, phone, email]) {
      fields.push({
        ok: () => (input.current?.value.trim() ?? '') !== '',
        scroll: input.current,
        focus: input.current,
        flash: input.current,
      });
    }
    fields.push({
      ok: () => !!fileInput.current?.files?.length,
      scroll: fileName.current?.closest<HTMLElement>('.ct-file-row') ?? null,
      focus: fileButton.current,
      flash: fileName.current,
    });
    return fields;
  }, [role]);

  const refresh = useCallback(() => setReady(allFilled(requiredFields())), [requiredFields]);
  useEffect(refresh, [refresh]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bad = firstMissing(requiredFields());
    if (bad) {
      jumpToField(bad, { focusDelay: 420 });
      return;
    }
    // all required filled — actual send wired by the publisher
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={open ? 'rc-modal is-open' : 'rc-modal'}
      id="recruit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rc-title"
      aria-hidden={!open}
    >
      <div className="rc-modal-dim" aria-hidden="true" />
      <form
        className="rc-card rc-form"
        ref={cardRef}
        onSubmit={onSubmit}
        onInput={refresh}
        onChange={refresh}
        onClick={refresh}
      >
        {/* fixed top-right; floats over the scroll */}
        <button type="button" className="rc-close" aria-label="닫기" ref={closeRef} onClick={onClose}>
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
            <path
              d="M24 24L72 72M72 24L24 72"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* only the X stays fixed; Careers + copy + form scroll, the CTA is fixed below */}
        <div className="rc-scroll" data-lenis-prevent="">
          <div className="rc-head-text">
            <p className="rc-eyebrow" id="rc-title">
              Careers
            </p>
            <p className="rc-lead">
              인스플래닛은 기술보다 사람을, 속도보다 본질을 먼저 생각합니다.
              <br />
              좋은 경험은 혼자가 아니라, 함께 쌓아 올린 신뢰에서 완성되기 때문입니다.
              <br />그 길 위에서 새로운 설렘을 함께 만들어갈 동료를 기다립니다.
            </p>
          </div>
          <div className="rc-body">
            <div className="rc-row rc-row--mid">
              <p className="rc-label">지원분야</p>
              <div className="rc-fields">
                {/* 지원분야: 단일선택 */}
                <ChipGroup
                  options={RECRUIT_ROLES}
                  selected={role}
                  groupRef={groupRef}
                  onToggle={(option) =>
                    setRole((cur) => (cur.includes(option) ? [] : [option]))
                  }
                />
              </div>
            </div>
            <div className="rc-row rc-row--info">
              <p className="rc-label">기본정보</p>
              <div className="rc-fields">
                <div className="ct-input-row">
                  <input ref={name} className="ct-input" type="text" placeholder="이름*" />
                  <FilteredInput
                    inputRef={phone}
                    type="tel"
                    inputMode="numeric"
                    filter="num"
                    placeholder="연락처*"
                    hint="숫자만 입력할 수 있어요."
                  />
                </div>
                <div className="ct-input-row">
                  <FilteredInput
                    inputRef={email}
                    type="email"
                    inputMode="email"
                    filter="ascii"
                    placeholder="이메일*"
                    hint="영문으로 입력해 주세요."
                  />
                </div>
                <div className="ct-input-row">
                  <FilteredInput
                    inputRef={url}
                    type="url"
                    inputMode="url"
                    filter="ascii"
                    placeholder="포트폴리오 URL"
                    hint="영문으로 입력해 주세요."
                    prefillScheme
                  />
                </div>
                <FileRow
                  placeholder="최대 50MB 까지 첨부가 가능해요*"
                  fileInputRef={fileInput}
                  nameRef={fileName}
                  buttonRef={fileButton}
                  onChange={refresh}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="rc-footer">
          <div className="rc-footer-slot" aria-hidden="true" />
          <button type="submit" className={ready ? 'ct-submit is-ready' : 'ct-submit'}>
            <span>입사지원</span>
            <span className="ct-arrow" aria-hidden="true">
              <img src="/assets/icon_arrow.svg" alt="" />
            </span>
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRecruit, useRecruitDraftSync } from '@/components/contact/RecruitContext';
import MobileChipGroup from '@/components/mobile/MobileChipGroup';
import MobileFileRow from '@/components/mobile/MobileFileRow';
import MobileFilteredInput from '@/components/mobile/MobileFilteredInput';
import { RECRUIT_ROLES } from '@/data/contact';
import { allFilled, firstMissing, jumpToField, type RequiredField } from '@/lib/formGating';

type LenisLike = { stop?: () => void; start?: () => void };

/* Careers recruit popup — mobile-contact.html 의 #recruit-popup (.mr-*) 포트. PC RecruitModal.tsx 와
   달리 풀스크린 시트다(딤 배경 없음, X/ESC 로만 닫힌다). 잠금은 PC 와 같은 방식(html.rc-lock +
   Lenis stop)으로 충분하다 — .mr-popup 자체가 position:fixed;inset:0 전체화면이고 유일한 스크롤
   영역(.mr-scroll)에 overscroll-behavior:contain 이 걸려 있어, 정적 사이트가 썼던 구식 touchmove
   체이닝 방지까지는 필요 없다.

   #page-root 가 페이지 전환 시 transform 을 받으므로(PC RecruitModal 과 같은 이유) body 로
   포탈한다 — 그래야 position:fixed 가 뷰포트 기준을 유지한다. */
/* ⚠️ open 과 active 의 구분은 PC RecruitModal 과 같다 — 껍데기(.is-open)는 `open` 으로만
   그리고(그래야 경계를 넘을 때 깜박이지 않는다), 잠금·포커스·ESC·draft 동기화는 `active` 로 건다. */
export default function MobileRecruitModal({
  open,
  active,
  onClose,
}: {
  open: boolean;
  active: boolean;
  onClose: () => void;
}) {
  const { role, toggleRole } = useRecruit();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const phone = useRef<HTMLInputElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const url = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileName = useRef<HTMLInputElement>(null);
  const fileButton = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  // open / close: lock the page scroll (Lenis + html.rc-lock), reset the sheet's own scroll, move
  // focus into the dialog
  useEffect(() => {
    const html = document.documentElement;
    const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
    if (!active) return;
    lastFocus.current = document.activeElement;
    html.classList.add('rc-lock');
    lenis?.stop?.();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
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
  }, [active]);

  // close on ESC — full-screen, no backdrop, so no outside-click close
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [active, onClose]);

  /* 지원분야·이름·연락처·이메일·파일이 모두 채워질 때까지 비활성 (포트폴리오 URL은 선택). */
  const requiredFields = useCallback((): RequiredField[] => {
    const fields: RequiredField[] = [
      {
        ok: () => role.length > 0,
        scroll: groupRef.current?.closest<HTMLElement>('.mr-sec') ?? null,
        focus: groupRef.current?.querySelector<HTMLElement>('.mc-chip') ?? null,
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
      scroll: fileName.current?.closest<HTMLElement>('.mc-file') ?? null,
      focus: fileButton.current,
      flash: fileName.current,
    });
    return fields;
  }, [role]);

  const refresh = useCallback(() => setReady(allFilled(requiredFields())), [requiredFields]);
  useEffect(refresh, [refresh]);

  /* 폭 경계를 넘을 때 입력값·첨부파일을 PC 모달과 주고받는다 (RecruitContext 참고) */
  useRecruitDraftSync(active, { name, phone, email, url, fileInput }, refresh);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bad = firstMissing(requiredFields());
    if (bad) {
      jumpToField(bad, { focusDelay: 420, flashClass: 'mc-flash' });
      return;
    }
    // all required fields filled — actual send wired by the publisher (같은 이유로 PC 도 아직 없다)
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={open ? 'mr-popup is-open' : 'mr-popup'}
      id="mobile-recruit-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mr-title"
      aria-hidden={!active}
    >
      <form
        className="mr-form"
        onSubmit={onSubmit}
        onInput={refresh}
        onChange={refresh}
        onClick={refresh}
      >
        {/* fixed top-right; floats over the scroll */}
        <button type="button" className="mr-close" aria-label="닫기" ref={closeRef} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M0 0L24 24M24 0L0 24"
              stroke="currentColor"
              strokeWidth="1.125"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="mr-scroll" data-lenis-prevent="" ref={scrollRef}>
          <div className="mr-head">
            <p className="mr-title" id="mr-title">
              Careers
            </p>
            <p className="mr-lead">
              인스플래닛은 기술보다 사람을, 속도보다 본질을 먼저 생각합니다. 좋은 경험은 혼자가
              아니라, 함께 쌓아 올린 신뢰에서 완성되기 때문입니다. 그 길 위에서 새로운 설렘을 함께
              만들어갈 동료를 기다립니다.
            </p>
          </div>
          <div className="mr-sec mr-sec--field">
            <p className="mr-label">지원분야</p>
            {/* 지원분야: 단일선택 */}
            <MobileChipGroup
              options={RECRUIT_ROLES}
              selected={role}
              groupRef={groupRef}
              onToggle={toggleRole}
            />
          </div>
          <div className="mr-sec mr-sec--info">
            <p className="mr-label">기본정보</p>
            <div className="mc-inputs">
              <div className="mc-input-row">
                {/* 감싸는 게 없는 .mc-input 하나만 있으면 옆의 .mc-cell 보다 25px 더 넓어져
                    래핑한다(정적 사이트 주석 그대로 — 두 칸을 동일한 flex 너비로 맞추기 위함) */}
                <div className="mc-cell">
                  <input ref={name} className="mc-input" type="text" placeholder="이름*" />
                </div>
                <MobileFilteredInput
                  inputRef={phone}
                  type="tel"
                  inputMode="numeric"
                  filter="num"
                  placeholder="연락처*"
                  hint="숫자만 입력할 수 있어요."
                />
              </div>
              <div className="mc-input-row">
                <MobileFilteredInput
                  inputRef={email}
                  type="email"
                  inputMode="email"
                  filter="ascii"
                  placeholder="이메일*"
                  hint="영문으로 입력해 주세요."
                />
                <MobileFilteredInput
                  inputRef={url}
                  type="url"
                  inputMode="url"
                  filter="ascii"
                  placeholder="포트폴리오 URL"
                  hint="영문으로 입력해 주세요."
                  prefillScheme
                />
              </div>
              <MobileFileRow
                placeholder="최대 50MB 까지 첨부가능"
                fileInputRef={fileInput}
                nameRef={fileName}
                buttonRef={fileButton}
                onChange={refresh}
              />
            </div>
          </div>
        </div>
        <div className="mr-footer">
          <button type="submit" className={ready ? 'mc-submit mr-submit is-ready' : 'mc-submit mr-submit'}>
            <span>입사지원</span>
            <span className="mc-arrow" aria-hidden="true">
              <img src="/assets/icon_arrow.svg" alt="" />
            </span>
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

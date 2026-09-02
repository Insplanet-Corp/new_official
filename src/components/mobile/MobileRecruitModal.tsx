'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ConsentLinks from '@/components/contact/ConsentLinks';
import { useLegal } from '@/components/contact/LegalContext';
import { useRecruit, useRecruitDraftSync } from '@/components/contact/RecruitContext';
import MobileChipGroup from '@/components/mobile/MobileChipGroup';
import MobileFileRow from '@/components/mobile/MobileFileRow';
import MobileFilteredInput from '@/components/mobile/MobileFilteredInput';
import { RECRUIT_ROLES } from '@/data/contact';
import { allFilled, firstMissing, jumpToField, type RequiredField } from '@/lib/formGating';
import { submitRecruit } from '@/lib/recruits';
import { lockScroll } from '@/lib/scrollLock';

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
  const { role, toggleRole, resetRecruit } = useRecruit();
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formRef = useRef<HTMLFormElement>(null);
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
  const consent = useRef<HTMLInputElement>(null);
  const consentBox = useRef<HTMLSpanElement>(null);
  const consentLabel = useRef<HTMLLabelElement>(null);
  const lastFocus = useRef<Element | null>(null);

  /* 약관·방침 팝업이 이 시트 **위에** 뜬다(동의 문구의 링크) — 그동안은 ESC 를 넘기지 않는다.
     안 그러면 한 번에 둘 다 닫힌다. PC RecruitModal 과 같다. */
  const { doc: legalDoc } = useLegal();

  // open / close: lock the page scroll (Lenis + html.rc-lock), reset the sheet's own scroll, move
  // focus into the dialog
  useEffect(() => {
    if (!active) return;
    lastFocus.current = document.activeElement;
    const unlock = lockScroll(); // 겹쳐 뜨는 약관 팝업과 몫을 나눠 센다(scrollLock.ts)
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
      unlock();
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
  // 약관 팝업이 위에 떠 있으면 ESC 는 그쪽에 양보한다
  useEffect(() => {
    if (!active || legalDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [active, legalDoc, onClose]);

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
    // 개인정보 수집·이용 동의 — 문의 폼과 같은 규칙으로 제출을 막는다
    fields.push({
      ok: () => !!consent.current?.checked,
      scroll: consentLabel.current,
      focus: consent.current,
      flash: consentBox.current,
    });
    return fields;
  }, [role]);

  const refresh = useCallback(() => setReady(allFilled(requiredFields())), [requiredFields]);
  useEffect(refresh, [refresh]);

  /* 폭 경계를 넘을 때 입력값·첨부파일을 PC 모달과 주고받는다 (RecruitContext 참고) */
  useRecruitDraftSync(active, { name, phone, email, url, fileInput, consent }, refresh);

  /* 접수 — PC 모달(RecruitModal)과 **같은** submitRecruit 을 쓴다. 두 트리는 폭으로만
     갈릴 뿐 접수 규칙이 다를 이유가 없다. 성공 뒤 비우는 순서(DOM reset → resetRecruit →
     onClose)도 PC 와 같다 — 이유는 RecruitContext 의 resetRecruit 주석 참고. */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bad = firstMissing(requiredFields());
    if (bad) {
      jumpToField(bad, { focusDelay: 420, flashClass: 'mc-flash' });
      return;
    }
    if (sending) return;
    setSending(true);
    const { error } = await submitRecruit({
      role,
      name: name.current?.value ?? '',
      phone: phone.current?.value ?? '',
      email: email.current?.value ?? '',
      url: url.current?.value ?? '',
      file: fileInput.current?.files?.[0] ?? null,
    });
    setSending(false);

    if (error) {
      alert(`지원서 접수 중 오류가 발생했습니다.\n${error}`);
      return;
    }
    alert('지원서가 접수되었습니다. 검토 후 연락드리겠습니다!');

    formRef.current?.reset();
    fileInput.current?.dispatchEvent(new Event('change', { bubbles: true }));
    resetRecruit();
    setReady(false);
    onClose();
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
        ref={formRef}
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
          {/* consent: 문의 폼과 같은 .mc-consent (24px 원형 체크 + 약관/방침 링크) */}
          <label className="mc-consent" ref={consentLabel}>
            <input ref={consent} type="checkbox" className="mc-consent-input" />
            <span className="mc-consent-box" aria-hidden="true" ref={consentBox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.6 12 10.2 15.6 17.4 8.4"
                  stroke="currentColor"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {/* 두 링크는 약관/방침 팝업(LegalModal)을 연다 — 문의 폼과 같은 컴포넌트 */}
            <span className="mc-consent-text">
              <ConsentLinks />
            </span>
          </label>
          <button
            type="submit"
            className={ready ? 'mc-submit mr-submit is-ready' : 'mc-submit mr-submit'}
            disabled={sending}
          >
            <span>{sending ? '접수 중…' : '입사지원'}</span>
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

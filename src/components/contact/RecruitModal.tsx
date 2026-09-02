'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChipGroup from '@/components/contact/ChipGroup';
import ConsentLinks from '@/components/contact/ConsentLinks';
import { useLegal } from '@/components/contact/LegalContext';
import { useRecruit, useRecruitDraftSync } from '@/components/contact/RecruitContext';
import FileRow from '@/components/contact/FileRow';
import FilteredInput from '@/components/contact/FilteredInput';
import { RECRUIT_ROLES } from '@/data/contact';
import { allFilled, firstMissing, jumpToField, type RequiredField } from '@/lib/formGating';
import { submitRecruit } from '@/lib/recruits';
import { lockScroll } from '@/lib/scrollLock';

/* Careers recruit popup — opened by the Join Us 채용확인 button. Its leaf controls reuse the contact
   .ct-* classes (locked to their 2560 sizing via --v/--g:1 on .rc-modal). Rendered outside
   #page-root so position:fixed stays viewport-relative regardless of the page's enter transform. */
/* ⚠️ open 과 active 는 다르다.
   - `open`  = 팝업이 열려 있는가 (두 트리가 공유). **껍데기(.is-open)는 이 값으로만 그린다.**
     ≤1023 에서도 클래스를 계속 달고 있어야, 창을 키워 `display:none` 이 풀리는 순간 이미
     열린 모습으로 나타난다. `open` 을 폭으로 잘라 버리면 그 순간 `.is-open` 이 새로 붙어
     0.4s 페이드인이 처음부터 돌고, 그 사이 뒤의 Join Us 가 비쳐 **깜박인다.**
     (display 가 바뀌는 전환에서는 트랜지션이 안 돈다 — 그래서 즉시 나타난다.)
   - `active` = 지금 폭에서 **이쪽이 쓰이는가**. 스크롤 잠금·포커스·ESC·바깥클릭·draft 동기화는
     전부 이 값으로 건다. 안 그러면 감춰진 쪽이 보이는 쪽과 싸운다 — 특히 이 팝업의 바깥클릭
     닫기는 그 폭에서 `.rc-card` 가 `display:none` 이라 `contains()` 가 항상 false 여서
     **모바일 시트 안을 눌러도 닫아 버린다.** */
export default function RecruitModal({
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
  const consent = useRef<HTMLInputElement>(null);
  const consentBox = useRef<HTMLSpanElement>(null);
  const consentLabel = useRef<HTMLLabelElement>(null);
  const lastFocus = useRef<Element | null>(null);

  /* 약관·방침 팝업이 이 팝업 **위에** 뜬다(동의 문구의 링크). 그동안은 ESC·바깥클릭을
     넘기지 않는다 — 안 그러면 ESC 한 번에 둘 다 닫히고, 약관 카드 안을 누른 것이
     `.rc-card` 바깥이라 이 팝업이 닫혀 버린다. */
  const { doc: legalDoc } = useLegal();

  /* open / close: lock the page scroll and move focus into the dialog.
     잠금은 lockScroll() 로 세어서 건다 — 약관 팝업이 이 위에 겹쳐 열린다(scrollLock.ts). */
  useEffect(() => {
    if (!active) return;
    lastFocus.current = document.activeElement;
    const unlock = lockScroll();
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

  // close on ESC / on a click outside the card — 약관 팝업이 위에 떠 있으면 그쪽에 양보한다
  useEffect(() => {
    if (!active || legalDoc) return;
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
  }, [active, legalDoc, onClose]);

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

  /* 폭 경계를 넘을 때 입력값·첨부파일을 모바일 시트와 주고받는다. 텍스트 입력은 uncontrolled
     라(캐럿이 튀지 않게 필터가 값을 제자리에서 고쳐 쓴다) 값의 진실은 DOM 이고, 그래서
     상태를 끌어올리는 대신 **경계에서 DOM 값을 옮긴다.** 지원분야 칩은 원래 state 라
     프로바이더가 그대로 공유한다. */
  useRecruitDraftSync(active, { name, phone, email, url, fileInput, consent }, refresh);

  /* 접수 — Supabase recruits 테이블 + 비공개 recruit 버킷(018). 모바일 시트와 **같은**
     submitRecruit 을 쓴다. 성공하면 폼을 비우고 팝업을 닫는다.
     ⚠️ 값을 읽는 곳은 DOM 이다 — 텍스트 입력이 uncontrolled 라 여기가 진실이다. */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bad = firstMissing(requiredFields());
    if (bad) {
      jumpToField(bad, { focusDelay: 420 });
      return;
    }
    if (sending) return; // 더블클릭으로 두 번 접수되는 것을 막는다
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

    /* ⚠️ 순서가 중요하다. form.reset() 으로 DOM 을 먼저 비우고 resetRecruit() 로 공유
       상태를 비운 뒤 닫는다 — 닫히면서 도는 draft 동기화 cleanup 이 **이미 비워진** DOM 을
       담아야 값이 안 되살아난다.
       reset() 은 파일 입력도 비우지만 파일명 칸은 안 따라온다(FileRow 가 change 로만
       갱신한다) — 그래서 직접 쏜다. RecruitContext 의 복원 로직과 같은 이유다. */
    cardRef.current?.reset();
    fileInput.current?.dispatchEvent(new Event('change', { bubbles: true }));
    resetRecruit();
    setReady(false);
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={open ? 'rc-modal is-open' : 'rc-modal'}
      id="recruit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rc-title"
      aria-hidden={!active}
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
                  onToggle={toggleRole}
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
        {/* 빈 슬롯은 본문을 .rc-fields 열에 맞춰 들여쓴다 — 그 안에서 동의 줄이 버튼 위에 선다 */}
        <div className="rc-footer">
          <div className="rc-footer-slot" aria-hidden="true" />
          <div className="rc-footer-main">
            {/* consent: 문의 폼과 같은 .ct-consent (40px 원형 체크 + 약관/방침 링크) */}
            <label className="ct-consent" ref={consentLabel}>
              <input ref={consent} type="checkbox" className="ct-consent-input" />
              <span className="ct-consent-box" aria-hidden="true" ref={consentBox}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path
                    d="M11 20 17 26 29 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {/* 두 링크는 약관/방침 팝업(LegalModal)을 연다 — 문의 폼과 같은 컴포넌트 */}
              <span className="ct-consent-text">
                <ConsentLinks />
              </span>
            </label>
            <button
              type="submit"
              className={ready ? 'ct-submit is-ready' : 'ct-submit'}
              disabled={sending}
            >
              <span>{sending ? '접수 중…' : '입사지원'}</span>
              <span className="ct-arrow" aria-hidden="true">
                <img src="/assets/icon_arrow.svg" alt="" />
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

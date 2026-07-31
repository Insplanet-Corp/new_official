'use client';

import { useEffect, useRef, type RefObject } from 'react';

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/; // conjoining + compatibility jamo + composed syllables

const FILTERS = {
  num: (v: string) => v.replace(/[^0-9]/g, ''),
  ascii: (v: string) => v.replace(/[^\x00-\x7F]/g, ''),
} as const;

export type FilterKind = keyof typeof FILTERS;

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  type: 'tel' | 'email' | 'url';
  inputMode: 'numeric' | 'email' | 'url';
  placeholder: string;
  filter: FilterKind;
  hint: string;
  /** 기존 사이트 / 포트폴리오 URL: pre-fill the scheme on focus so the user only types the domain */
  prefillScheme?: boolean;
};

const PREFIX = 'https://www.';

/* Client-info input with a live restriction: 연락처 = digits only, 이메일/URL = ASCII only (blocks
   Korean). Filters as you type and keeps the caret; a rejected character surfaces the tooltip.
   Uncontrolled on purpose — the filter rewrites the value in place, exactly like the static build,
   which is what keeps the caret from jumping to the end. */
export default function FilteredInput({
  inputRef,
  type,
  inputMode,
  placeholder,
  filter,
  hint,
  prefillScheme,
}: Props) {
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    const cell = cellRef.current;
    if (!input) return;
    const fn = FILTERS[filter];
    let timer: ReturnType<typeof setTimeout>;

    const showHint = () => {
      if (!cell) return;
      cell.classList.add('show-hint');
      clearTimeout(timer);
      timer = setTimeout(() => cell.classList.remove('show-hint'), 2600);
    };
    // a Korean IME composes Hangul — surface the tooltip the instant it's detected
    const onComposition = (e: CompositionEvent) => {
      if (HANGUL.test(e.data || '')) showHint();
    };
    const onInput = () => {
      const start = input.selectionStart ?? 0;
      const before = input.value;
      const after = fn(before);
      if (after === before) return;
      showHint();
      input.value = after;
      const pos = Math.max(0, start - (before.length - after.length));
      try {
        input.setSelectionRange(pos, pos);
      } catch {
        /* type=email/url don't support selection in every browser */
      }
    };

    input.addEventListener('compositionupdate', onComposition);
    input.addEventListener('input', onInput);
    return () => {
      clearTimeout(timer);
      input.removeEventListener('compositionupdate', onComposition);
      input.removeEventListener('input', onInput);
    };
  }, [inputRef, filter]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !prefillScheme) return;
    const onFocus = () => {
      if (input.value !== '') return;
      input.value = PREFIX;
      const caret = () => {
        try {
          input.setSelectionRange(PREFIX.length, PREFIX.length);
        } catch {
          /* not selectable */
        }
      };
      caret();
      setTimeout(caret, 0); // re-place the caret at the end after a click's mouseup
    };
    // left at just the prefix -> clear, so the placeholder returns and it isn't a filled field
    const onBlur = () => {
      if (input.value === PREFIX) input.value = '';
    };
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    };
  }, [inputRef, prefillScheme]);

  return (
    <div className="ct-cell" ref={cellRef}>
      <input
        ref={inputRef}
        className="ct-input"
        type={type}
        inputMode={inputMode}
        data-filter={filter}
        placeholder={placeholder}
      />
      <span className="ct-hint" role="alert">
        <span className="ct-hint-ico" aria-hidden="true">
          !
        </span>
        <span className="ct-hint-msg">{hint}</span>
      </span>
    </div>
  );
}

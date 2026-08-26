'use client';

import { useEffect, useRef, type RefObject } from 'react';

const MAX = 50 * 1024 * 1024;

type Props = {
  placeholder: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  nameRef: RefObject<HTMLInputElement | null>;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  /** notify the owning form so submit gating re-evaluates */
  onChange?: () => void;
};

/* File attach: ONLY the 파일첨부 button opens the native dialog; the name field shows the picked
   file, capped at 50MB. The name field isn't readonly (so a caret renders) but it is value-locked —
   only the picker sets it. beforeinput blocks Latin typing/paste; a Korean IME slips past that, so
   `lock` hard-restores on every input/compositionend. Once attached it's focused, so Backspace or
   Delete removes the file. */
export default function FileRow({
  placeholder,
  fileInputRef,
  nameRef,
  buttonRef,
  onChange,
}: Props) {
  const officialRef = useRef('');

  useEffect(() => {
    const input = fileInputRef.current;
    const name = nameRef.current;
    if (!input || !name) return;

    const setName = (v: string) => {
      officialRef.current = v;
      name.value = v;
    };
    const clear = () => {
      input.value = '';
      setName('');
      onChange?.();
    };
    const lock = () => {
      if (name.value !== officialRef.current) name.value = officialRef.current;
    };
    /* ⚠️ 사용자가 고른 것만 처리하는 게 아니다 — RecruitContext 의 draft 복원이 `files` 를
       갈아끼운 뒤 `change` 를 직접 쏜다(그래야 파일명 칸과 officialRef 가 따라온다).
       그래서 ① 파일이 비면 이름도 비우고 ② 포커스는 `isTrusted` 일 때만 옮긴다(복원 때
       포커스를 뺏으면 닫기 버튼으로 가야 할 포커스가 파일명 칸에 앉는다). */
    const onPick = (e: Event) => {
      const file = input.files?.[0];
      if (!file) {
        setName('');
        onChange?.();
        return;
      }
      if (file.size > MAX) {
        alert('최대 50MB까지 첨부할 수 있어요.');
        clear();
        return;
      }
      setName(file.name);
      if (e.isTrusted) {
        try {
          name.focus({ preventScroll: true });
        } catch {
          /* focus can throw in odd states */
        }
      }
      onChange?.();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && officialRef.current) {
        e.preventDefault();
        clear();
      }
    };
    const onBeforeInput = (e: Event) => e.preventDefault();

    input.addEventListener('change', onPick);
    name.addEventListener('keydown', onKeyDown);
    name.addEventListener('beforeinput', onBeforeInput);
    name.addEventListener('input', lock);
    name.addEventListener('compositionend', lock);
    return () => {
      input.removeEventListener('change', onPick);
      name.removeEventListener('keydown', onKeyDown);
      name.removeEventListener('beforeinput', onBeforeInput);
      name.removeEventListener('input', lock);
      name.removeEventListener('compositionend', lock);
    };
  }, [fileInputRef, nameRef, onChange]);

  return (
    <div className="ct-file-row">
      <input
        ref={nameRef}
        className="ct-input ct-file-name"
        type="text"
        inputMode="none"
        aria-readonly="true"
        placeholder={placeholder}
      />
      <button
        ref={buttonRef}
        type="button"
        className="ct-file-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        파일첨부
      </button>
      <input ref={fileInputRef} type="file" className="ct-file-input" hidden />
    </div>
  );
}

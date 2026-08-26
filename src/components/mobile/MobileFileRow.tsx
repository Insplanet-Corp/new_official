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

/* PC FileRow 의 .mc-* 판. 마크업만 다르다 — PC 는 감싸는 .ct-file-row 가 있지만, mobile-contact.html
   의 .mc-file 자체가 이미 flex 행이라 여기선 래퍼 없이 .mc-file 을 바로 렌더한다. */
export default function MobileFileRow({
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
    <div className="mc-file">
      <input
        ref={nameRef}
        className="mc-input mc-file-name"
        type="text"
        inputMode="none"
        aria-readonly="true"
        placeholder={placeholder}
      />
      <button
        ref={buttonRef}
        type="button"
        className="mc-file-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        파일첨부
      </button>
      <input ref={fileInputRef} type="file" className="mc-file-input" hidden />
    </div>
  );
}

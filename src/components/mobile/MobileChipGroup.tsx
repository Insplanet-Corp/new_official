'use client';

import type { Ref } from 'react';

import { mobileChipLabel } from '@/data/contact';

type Props = {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  /** 다중선택 (업무 범위). Single-select groups clear on re-click. */
  multi?: boolean;
  groupRef?: Ref<HTMLDivElement>;
};

/** PC ChipGroup 의 .mc-* 판 — mobile-contact.html 의 칩 마크업/동작을 그대로 옮긴다. */
export default function MobileChipGroup({ options, selected, onToggle, multi, groupRef }: Props) {
  return (
    <div className="mc-chips" data-multi={multi ? '' : undefined} ref={groupRef}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={selected.includes(option) ? 'mc-chip is-selected' : 'mc-chip'}
          onClick={() => onToggle(option)}
        >
          {mobileChipLabel(option)}
        </button>
      ))}
    </div>
  );
}

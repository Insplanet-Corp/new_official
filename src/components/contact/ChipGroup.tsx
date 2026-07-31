'use client';

import type { Ref } from 'react';

type Props = {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  /** 다중선택 (업무 범위). Single-select groups clear on re-click. */
  multi?: boolean;
  groupRef?: Ref<HTMLDivElement>;
};

export default function ChipGroup({ options, selected, onToggle, multi, groupRef }: Props) {
  return (
    <div className="ct-chips" data-multi={multi ? '' : undefined} ref={groupRef}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={selected.includes(option) ? 'ct-chip is-selected' : 'ct-chip'}
          onClick={() => onToggle(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

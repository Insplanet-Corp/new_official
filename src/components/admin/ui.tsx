import type { ChangeEvent, ReactNode } from 'react';
import { ADMIN_TABS } from '@/components/admin/tabs';
import s from './ui.module.css';

/* Small shared presentational pieces so every tab page looks like the same product.
   No 'use client' here on purpose: these are imported by client pages and inherit that. */

/* ---- page head ---------------------------------------------------------- */
export function PageHead({ href, actions }: { href: string; actions?: ReactNode }) {
  const tab = ADMIN_TABS.find((t) => t.href === href);
  if (!tab) return null;
  return (
    <div className={s.pageHead}>
      <div>
        <p className={s.eyebrow}>{tab.eyebrow}</p>
        <h1 className={s.title}>{tab.title}</h1>
        <p className={s.desc}>{tab.desc}</p>
      </div>
      {actions ? <div className={s.pageActions}>{actions}</div> : null}
    </div>
  );
}

/* ---- stat tiles --------------------------------------------------------- */
export function Stats({ items }: { items: { label: string; value: ReactNode; unit?: string }[] }) {
  return (
    <div className={s.stats}>
      {items.map((stat) => (
        <div className={s.stat} key={stat.label}>
          <p className={s.statLabel}>{stat.label}</p>
          <p className={s.statValue}>
            {stat.value}
            {stat.unit ? <small>{stat.unit}</small> : null}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---- toolbar controls --------------------------------------------------- */
export function Search({
  value,
  onChange,
  placeholder = '검색',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={s.search}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="6.2" cy="6.2" r="4.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.6 9.6L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      className={s.select}
      aria-label={label}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* the status <select> inside a table cell reuses the toolbar control's look */
export const selectClass = s.select;

/* ---- states ------------------------------------------------------------- */
export function Empty({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2.8" y="4.2" width="14.4" height="11.6" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2.8 8.2h14.4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <p className={s.emptyTitle}>{title}</p>
      {desc ? <p className={s.emptyDesc}>{desc}</p> : null}
    </div>
  );
}

export function Skeleton() {
  return (
    <div className={s.skeleton} aria-busy="true" aria-label="불러오는 중">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

export function Note({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return <div className={`${s.note}${warn ? ` ${s.noteWarn}` : ''}`}>{children}</div>;
}

/* ---- badge -------------------------------------------------------------- */
export type BadgeTone = 'plain' | 'blue' | 'green' | 'amber' | 'red';

const BADGE_TONE: Record<Exclude<BadgeTone, 'plain'>, string> = {
  blue: s.badgeBlue,
  green: s.badgeGreen,
  amber: s.badgeAmber,
  red: s.badgeRed,
};

export function Badge({ tone = 'plain', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`${s.badge}${tone === 'plain' ? '' : ` ${BADGE_TONE[tone]}`}`}>{children}</span>;
}

/* ---- misc --------------------------------------------------------------- */
export function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

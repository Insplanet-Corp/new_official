import type { ChangeEvent, ReactNode } from "react";
import { ADMIN_TABS } from "@/components/admin/tabs";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import Text from "@/components/text/Text";
import { Icon } from "@/components/icon/Icon";
import s from "./ui.module.css";

/* Small shared presentational pieces so every tab page looks like the same product.
   No 'use client' here on purpose: these are imported by client pages and inherit that.

   타이포·간격·아이콘은 공용 컴포넌트(Text / Heading / Flex / Icon)가 담당하고,
   ui.module.css 에는 컴포넌트로 표현할 수 없는 것(입력 컨트롤 외형, 스켈레톤
   애니메이션, 안내문 배경색 등)만 남긴다. 색은 admin theme 토큰을 그대로 쓴다 —
   토큰이 CSS 커스텀 프로퍼티라 var(--muted) 를 문자열로 넘기면 그대로 상속된다. */

/* ---- page head ---------------------------------------------------------- */
function Head({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <Flex row wrap="wrap" align="center" justify="between" gap={24} mb={24}>
      <Flex gap={7}>
        <Text
          as="p"
          size="1"
          fontSize="11px"
          weight="700"
          color="var(--faint)"
          className={s.eyebrow}
        >
          {eyebrow}
        </Text>
        <Heading as="h1" size="6" fontSize="26px" weight="700">
          {title}
        </Heading>
        {desc ? (
          <Text
            as="p"
            size="2"
            fontSize="13.5px"
            color="var(--muted)"
            className={s.desc}
          >
            {desc}
          </Text>
        ) : null}
      </Flex>
      {actions ? (
        <Flex row align="center" gap={8}>
          {actions}
        </Flex>
      ) : null}
    </Flex>
  );
}

export function PageHead({
  href,
  actions,
}: {
  href: string;
  actions?: ReactNode;
}) {
  const tab = ADMIN_TABS.find((t) => t.href === href);
  if (!tab) return null;
  return (
    <Head
      eyebrow={tab.eyebrow}
      title={tab.title}
      desc={tab.desc}
      actions={actions}
    />
  );
}

/* 목록 하위 화면(등록/조회/수정)의 페이지 헤드 — 탭 목록에 없는 화면이라 직접 받는다 */
export function SubHead({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return <Head eyebrow={eyebrow} title={title} desc={desc} actions={actions} />;
}

/* ---- stat tiles --------------------------------------------------------- */
export function Stats({
  items,
}: {
  items: { label: string; value: ReactNode; unit?: string }[];
}) {
  return (
    <div className={s.stats}>
      {items.map((stat) => (
        <Flex key={stat.label} gap={6} px={18} py={16} className={s.stat}>
          <Text as="p" size="1" weight="700" color="var(--muted)">
            {stat.label}
          </Text>
          <Flex row align="baseline" gap={3}>
            <Text size="6" fontSize="26px" weight="700" className={s.statValue}>
              {stat.value}
            </Text>
            {stat.unit ? (
              <Text size="2" fontSize="13px" weight="700" color="var(--faint)">
                {stat.unit}
              </Text>
            ) : null}
          </Flex>
        </Flex>
      ))}
    </div>
  );
}

/* ---- toolbar controls --------------------------------------------------- */
export function Search({
  value,
  onChange,
  placeholder = "검색",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={s.search}>
      <Icon name="search" size={14} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
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

/* ---- states ------------------------------------------------------------- */
export function Empty({ title, desc }: { title: string; desc?: string }) {
  return (
    <Flex align="center" gap={6} px={24} py={64}>
      <Flex
        row
        align="center"
        justify="center"
        width={44}
        height={44}
        radius={12}
        mb={8}
        className={s.emptyIcon}
      >
        <Icon name="information" size={20} />
      </Flex>
      <Text as="p" size="2" weight="700">
        {title}
      </Text>
      {desc ? (
        <Text
          as="p"
          size="2"
          fontSize="13px"
          color="var(--muted)"
          align="center"
        >
          {desc}
        </Text>
      ) : null}
    </Flex>
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

export function Note({
  children,
  warn,
}: {
  children: ReactNode;
  warn?: boolean;
}) {
  return (
    <Flex
      row
      gap={10}
      px={16}
      py={14}
      mb={20}
      className={`${s.note}${warn ? ` ${s.noteWarn}` : ""}`}
    >
      <Icon name={warn ? "warning" : "information"} size={16} />
      <Text as="div" size="2" fontSize="13px">
        {children}
      </Text>
    </Flex>
  );
}

/* ---- misc --------------------------------------------------------------- */
export function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

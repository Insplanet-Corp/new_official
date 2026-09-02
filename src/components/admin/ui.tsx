import type { ChangeEvent, ReactNode } from "react";
import { ADMIN_TABS } from "@/components/admin/tabs";
import Badge from "@/components/badge/Badge";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import Text from "@/components/text/Text";
import { Icon } from "@/components/icon/Icon";
import { type Portfolio, categoriesOf } from "@/lib/portfolios";
import { type ColorType } from "@/styles/theme";
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

/* ---- 목록·조회가 함께 쓰는 배지 --------------------------------------------
   같은 값(분류 · 진행 상태 · 메인 · 지원분야)을 목록에서는 배지로, 조회에서는
   맨 텍스트로 그리고 있었다. 두 화면이 **한 정의**를 보도록 여기로 모은다 —
   새 배지 컴포넌트나 CSS 클래스를 만들지 말고 공용 <Badge> 를 그대로 쓸 것.

   ⚠️ 색은 옆 칸과 겹치지 않게 고른 것이라 한 곳만 바꾸면 두 화면이 갈린다. */

/* 분류별 배지 색. 눈으로 바로 갈라 보려고 셋을 다르게 뒀다.

   ⚠️ 옆 칸(진행 상태)이 진행중=BLUE · 종료=GREEN 을 쓰고 [메인] 배지도 BLUE 다.
      그래서 여기서는 **GREEN 을 피하고** RED(오류로 읽힌다)도 안 쓴다. Web 의 BLUE 만
      "진행중" 과 같은 색인데, 진행중인 행이 드물어 나란히 보일 일이 거의 없다.
      더 갈라 놓고 싶으면 여기 색을 바꾸지 말고 진행 상태 쪽 variant 를 solid 로
      올리는 편이 낫다 — 분류는 셋 다 채워야 해서 쓸 수 있는 색이 더 적다. */
export const CATEGORY_COLOR: Record<string, ColorType> = {
  Web: "BLUE",
  Mobile: "TEAL",
  Consulting: "ORANGE",
};

/** 진행 상태 — 포트폴리오(ongoing/done) */
export const PORTFOLIO_STATUS_COLOR: Record<string, ColorType> = {
  ongoing: "BLUE",
  done: "GREEN",
};

/** 진행 상태 — 견적문의(pending/in_progress/completed) */
export const QUOTE_STATUS_COLOR: Record<string, ColorType> = {
  pending: "BLUE",
  in_progress: "ORANGE",
  completed: "GREEN",
};

/* 목록·조회가 함께 쓰는 배지 한 장. 값이 없으면 표와 같은 '-' 로 떨어진다. */
export function ValueBadge({
  label,
  color,
  style,
}: {
  label?: string | null;
  color: ColorType;
  style?: React.CSSProperties;
}) {
  if (!label)
    return (
      <Text size="2" color="var(--muted)">
        -
      </Text>
    );
  return (
    <Badge
      label={label}
      color={color}
      variant="surface"
      size="1"
      radius="medium"
      style={style}
    />
  );
}

/* 분류는 여러 개일 수 있다(022). 하나로 이어 붙이면 'Web, Mobile' 이 배지 **하나**에
   들어가 칸을 뚫고 길쭉해진다 — 개수만큼 배지를 그린다.

   ⚠️ **접지 않는다(nowrap).** 접으면 그 행만 키가 커져서 표의 가로선 간격이 들쭉날쭉해진다
      (사용자 지적, 2026-09-01). nowrap 이면 이 칸의 min-content 폭이 "배지 3개 + gap"
      으로 잡혀 브라우저가 칸을 그보다 좁히지 못한다 — 즉 폭을 픽셀로 맞출 필요 없이
      **항상 한 줄**이 보장되고, 분류가 늘어나도 알아서 넓어진다.
      표가 넘치면 `.tableWrap` 이 가로로 스크롤한다(원래 그런 표다).
   ℹ️ 조회 화면에서는 이 Flex 가 내용 폭이라 justify 가 아무 일도 하지 않는다 —
      같은 컴포넌트를 두 화면이 그대로 쓸 수 있는 이유다. */
export function CategoryCell({ row }: { row: Portfolio }) {
  const cats = categoriesOf(row);
  if (!cats.length)
    return (
      <Text size="2" color="var(--muted)">
        -
      </Text>
    );
  return (
    <Flex row wrap="nowrap" gap={4} justify="center" align="center">
      {cats.map((c) => (
        <ValueBadge key={c} label={c} color={CATEGORY_COLOR[c] ?? "GRAY"} />
      ))}
    </Flex>
  );
}

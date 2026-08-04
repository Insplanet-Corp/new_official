"use client";

import type { ChangeEvent, ReactNode } from "react";
import s from "./form.module.css";
import kit from "./kit.module.css";
import Button from "../button/Button";
import Flex from "../layouts/Flex";
import Heading from "../text/Heading";
import Text from "../text/Text";

/* 기획서(관리자시스템_화면설계서)의 등록 / 조회 / 수정 화면 공용 조각.
   지금 단계는 "틀"이므로 저장·삭제 같은 실제 동작은 붙이지 않았다 —
   각 화면에서 onSubmit / onClick 을 넘겨 채워 넣으면 된다. */

/* ---- 라벨 | 컨트롤 행 ---------------------------------------------------- */
export function Row({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.row}>
      <Text
        as="div"
        size="2"
        fontSize="13px"
        weight="700"
        color="var(--ink-2)"
        className={`${s.label}${required ? ` ${s.req}` : ""}`}
      >
        {label}
      </Text>
      <div className={s.control}>
        {children}
        {hint ? (
          <Text as="p" size="1" color="var(--muted)" className={s.hint}>
            {hint}
          </Text>
        ) : null}
      </div>
    </div>
  );
}

/* 조회 화면의 읽기 전용 값 */
export function ReadOnly({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  const empty = children === null || children === undefined || children === "";
  return (
    <Flex
      row
      align="center"
      className={`${s.readonly}${muted || empty ? ` ${s.readonlyMuted}` : ""}`}
    >
      <Text as="div" size="2" fontSize="13.5px">
        {empty ? "-" : children}
      </Text>
    </Flex>
  );
}

/* ---- 입력 ---------------------------------------------------------------- */
type Size = "short" | "medium" | "full";
const sizeClass = (size?: Size) =>
  size === "short" ? ` ${s.short}` : size === "medium" ? ` ${s.medium}` : "";

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  size,
  disabled,
  maxLength,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  size?: Size;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      className={`${s.input}${sizeClass(size)}`}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange?.(e.target.value)
      }
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      className={s.textarea}
      value={value}
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
        onChange?.(e.target.value)
      }
    />
  );
}

export function SelectBox({
  value,
  onChange,
  options,
  size = "medium",
  ariaLabel,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  size?: Size;
  ariaLabel: string;
}) {
  return (
    <select
      className={`${s.input}${sizeClass(size)}`}
      aria-label={ariaLabel}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
        onChange?.(e.target.value)
      }
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ---- 라디오 (사용여부 Y/N, 진행 상태 …) ---------------------------------- */
export function Radios({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={s.choices}>
      {options.map((o) => (
        <Text
          as="label"
          size="2"
          fontSize="13.5px"
          className={s.choice}
          key={o.value}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange?.(o.value)}
          />
          {o.label}
        </Text>
      ))}
    </div>
  );
}

/* ---- 메뉴권한 체크 그리드 ------------------------------------------------- */
export function CheckGrid({
  options,
  selected,
  onToggle,
  onToggleAll,
  allLabel = "전체메뉴",
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle?: (v: string) => void;
  onToggleAll?: (next: boolean) => void;
  allLabel?: string;
}) {
  const all =
    options.length > 0 && options.every((o) => selected.includes(o.value));
  return (
    <div className={s.checkGrid}>
      <Text
        as="label"
        size="2"
        fontSize="13.5px"
        weight="700"
        className={`${s.choice} ${s.checkAll}`}
      >
        <input
          type="checkbox"
          checked={all}
          onChange={() => onToggleAll?.(!all)}
        />
        {allLabel}
      </Text>
      {options.map((o) => (
        <Text
          as="label"
          size="2"
          fontSize="13.5px"
          className={s.choice}
          key={o.value}
        >
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle?.(o.value)}
          />
          {o.label}
        </Text>
      ))}
    </div>
  );
}

/* ---- 파일 업로드 (파일명 + 파일찾기 + 미리보기 자리) ---------------------- */
export function FilePick({
  fileName,
  onPick,
  preview,
  size = "000*000",
  disabled,
}: {
  fileName?: string;
  onPick?: () => void;
  /** 등록된 이미지 URL — 없으면 (000*000) 자리 표시 */
  preview?: string;
  size?: string;
  /** 진행 상태에 따라 쓰지 않는 항목 (기획서 포트폴리오 등록 화면) */
  disabled?: boolean;
}) {
  return (
    <>
      <div className={s.file}>
        <Text
          as="span"
          size="2"
          fontSize="13.5px"
          truncate
          className={`${s.fileName}${fileName ? "" : ` ${s.fileEmpty}`}`}
        >
          {fileName || (disabled ? "해당 없음" : "선택된 파일 없음")}
        </Text>
        <Button
          label="파일찾기"
          variant="outline"
          color="GRAY"
          size="1"
          radius="medium"
          onClick={onPick}
          disabled={disabled}
        />
      </div>
      <div className={s.thumbBox}>
        {preview ? <img src={preview} alt="" /> : `(${size})`}
      </div>
    </>
  );
}

/* 조회 화면의 읽기 전용 이미지 자리 — 파일찾기 버튼 없이 미리보기만 */
export function ThumbView({
  src,
  size = "000*000",
}: {
  src?: string;
  size?: string;
}) {
  return (
    <div className={s.thumbBox}>
      {src ? <img src={src} alt="" /> : `(${size})`}
    </div>
  );
}

/* 첨부파일 다운로드 (견적문의 / 리크루트 조회) */
export function FileLink({
  name,
  href,
}: {
  name?: string | null;
  href?: string | null;
}) {
  if (!name) return <ReadOnly muted>{null}</ReadOnly>;
  return (
    <div className={s.readonly}>
      <a className={s.fileLink} href={href ?? "#"} download>
        {name}
      </a>
    </div>
  );
}

/* ---- 섹션 (조회 화면의 의뢰인 정보 / 프로젝트 정보 …) --------------------- */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`${kit.card} ${s.section}`}>
      <Heading
        as="h2"
        size="2"
        fontSize="13px"
        weight="700"
        className={s.sectionHead}
      >
        {title}
      </Heading>
      {children}
    </section>
  );
}

/* ---- 하단 액션 바 -------------------------------------------------------- */
export function Actions({ children }: { children: ReactNode }) {
  return (
    <Flex row align="center" justify="center" gap={8} mt={20}>
      {children}
    </Flex>
  );
}

/* 한 줄에 여러 컨트롤 (기간 시작~종료, ID+중복확인) */
export function Inline({ children }: { children: ReactNode }) {
  return (
    <Flex row align="center" wrap="wrap" gap={8}>
      {children}
    </Flex>
  );
}

export function Sep({ children = "~" }: { children?: ReactNode }) {
  return (
    <Text size="2" fontSize="13px" color="var(--faint)">
      {children}
    </Text>
  );
}

export const formStyles = s;

"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import s from "./form.module.css";
import kit from "./kit.module.css";
import Button from "../button/Button";
import Flex from "../layouts/Flex";
import Heading from "../text/Heading";
import Text from "../text/Text";
import { Icon } from "../icon/Icon";
import { Color } from "@/styles/theme";

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

/* 단일 체크박스 (수상 여부 등). CheckGrid 와 같은 .choice 스타일을 쓴다. */
export function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Text
      as="label"
      size="2"
      fontSize="13.5px"
      className={`${s.choice}${disabled ? ` ${s.choiceOff}` : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
    </Text>
  );
}

/* ---- 이미지 업로드 (파일찾기 + 미리보기) ----------------------------------
   Supabase Storage 의 portfolio 버킷(006 마이그레이션)에 올리고, 공개 URL 을
   value 로 돌려준다. DB 에는 <img src> 에 그대로 넣을 URL 문자열만 저장한다.

   ⚠️ 파일 입력은 보이지 않게 두고 버튼이 대신 연다. <input type="file"> 을
   그대로 노출하면 브라우저마다 생김새가 달라 기획서 화면과 어긋난다. */
export function FilePick({
  value,
  onChange,
  size = "000*000",
  disabled,
  bucket = "portfolio",
  folder = "",
  accept = "image/*",
  preview = true,
}: {
  /** 업로드된 파일의 공개 URL (또는 기존 경로) */
  value?: string;
  onChange?: (url: string) => void;
  size?: string;
  disabled?: boolean;
  bucket?: string;
  folder?: string;
  /** 이미지 외(상세 HTML 등)를 받을 때 바꾼다 */
  accept?: string;
  /** HTML 처럼 썸네일이 의미 없는 파일은 미리보기 칸을 숨긴다 */
  preview?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fileName = value
    ? decodeURIComponent(value.split("/").pop() ?? "")
    : "";

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    // 같은 이름을 덮어쓰지 않도록 타임스탬프를 붙인다. 한글·공백 파일명은
    // Storage 키로 쓰기 곤란해서 안전한 문자만 남긴다.
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder ? `${folder}/` : ""}${Date.now()}_${safe}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      setBusy(false);
      setErr(
        /bucket/i.test(error.message)
          ? `Storage 버킷 '${bucket}' 이 없습니다. 006_portfolio_storage.sql 을 실행해 주세요.`
          : error.message,
      );
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    setBusy(false);
    onChange?.(publicUrl);
  };

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
          {busy ? "업로드 중…" : fileName || "선택된 파일 없음"}
        </Text>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            // 같은 파일을 다시 골라도 change 가 나도록 값을 비운다
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
        <Button
          label={busy ? "업로드 중…" : "파일찾기"}
          variant="outline"
          color="GRAY"
          size="1"
          radius="medium"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
        />
        {value ? (
          <Button
            label="지우기"
            variant="ghost"
            color="GRAY"
            size="1"
            radius="medium"
            onClick={() => onChange?.("")}
            disabled={disabled || busy}
          />
        ) : null}
      </div>
      {err ? (
        <Text as="p" size="1" fontSize="12px" color="var(--danger, #d33)">
          {err}
        </Text>
      ) : null}
      {preview ? (
        <div className={s.thumbBox}>
          {value ? <img src={value} alt="" /> : `(${size})`}
        </div>
      ) : null}
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

/* 첨부파일 다운로드 (견적문의 / 리크루트 조회)

   ⚠️ 비공개 버킷의 파일은 href 를 미리 박아 둘 수 없다 — 서명 URL 이 짧게 만료되므로
      조회 화면을 열어 둔 채 나중에 누르면 죽은 주소가 된다. 그래서 onClick 을 받아
      **누를 때마다 새 주소를 만들어** 쓰는 길을 열어 뒀다(리크루트가 그렇게 쓴다).
      onClick 이 있으면 기본 이동을 막고 그 쪽에 맡긴다. */
export function FileLink({
  name,
  href,
  onClick,
  busy,
}: {
  name?: string | null;
  href?: string | null;
  onClick?: () => void;
  busy?: boolean;
}) {
  if (!name) return <ReadOnly muted>{null}</ReadOnly>;
  return (
    <div className={s.readonly}>
      <a
        className={s.fileLink}
        href={href ?? "#"}
        download
        onClick={
          onClick
            ? (e) => {
                e.preventDefault();
                onClick();
              }
            : undefined
        }
      >
        {busy ? "준비 중…" : name}
      </a>
    </div>
  );
}

/* ---- 섹션 (조회 화면의 의뢰인 정보 / 프로젝트 정보 …) --------------------- */
export function Section({
  title,
  children,
  onClick,
}: {
  title: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <section className={`${kit.card} ${s.section}`}>
      <Flex row gap={12} fullWidth className={s.sectionHead} align="center">
        <Heading
          as="h2"
          size="2"
          fontSize="13px"
          weight="700"
          // className={s.sectionHead}
        >
          {title}
        </Heading>
        {onClick && (
          <Icon
            name="information"
            color={Color.GRAY_700}
            size="18"
            onClick={onClick}
          />
        )}
      </Flex>

      {children}
    </section>
  );
}

/* ---- 하단 액션 바 -------------------------------------------------------- */
export function Actions({ children }: { children: ReactNode }) {
  return (
    <Flex row align="center" justify="center" gap={8} mt={20} mb={20}>
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

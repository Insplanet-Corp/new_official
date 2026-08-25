// Button.tsx
import React from "react";
import Link from "next/link";
import clsx from "clsx";
import styles from "./Button.module.css";
import { ColorType, Radius } from "@/styles/theme";
import { IconName } from "../icon/icon-data";
import { Icon } from "../icon/Icon";
import Text from "../text/Text";

export type ButtonVariant = "solid" | "outline" | "surface" | "ghost";
export type ButtonSize = "1" | "2" | "3" | "4";

interface ButtonOwnProps {
  size?: ButtonSize;
  variant?: ButtonVariant;
  color?: ColorType;
  label: string;
  startIcon?: IconName;
  endIcon?: IconName;
  radius?: keyof typeof Radius;
  width?: React.CSSProperties["width"];
  disabled?: boolean;
}

type OwnKeys = keyof ButtonOwnProps;

type ButtonAsButton = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, OwnKeys> & {
    href?: undefined;
  };

/* href 를 넘기면 <button> 대신 next/link 로 렌더한다.
   이동용 버튼을 <Link><Button/></Link> 로 감싸면 <a> 안에 <button> 이 중첩돼
   HTML 스펙 위반 + 키보드 포커스가 두 번 잡히므로, 이동은 이 형태를 쓸 것.

   ⚠️ reload 를 주면 next/link 대신 맨 <a> 로 렌더해서 **문서를 새로 로드**한다.
   어드민 → 마케팅 페이지 이동에는 반드시 이걸 쓸 것 — 마케팅 쪽은 레거시 런타임
   (public/js/main.js)이 문서 로드 시점에 한 번 바인딩하는 구조라 클라이언트 라우팅으로
   들어가면 화면이 죽는다. 자세한 이유는 LegacyRuntime.tsx 주석 참고. */
type ButtonAsLink = ButtonOwnProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, OwnKeys> & {
    href: string;
    reload?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/* 라벨은 <Text> 로 그리는데 Text 는 자기 size 클래스(기본 "2" = 14px)를 항상 달고 나온다.
   그래서 .button 의 size_N { font-size } 는 라벨에 절대 닿지 않는다 — size="1" 버튼도
   24px 높이에 14px 글자가 들어갔다. 버튼 크기에 맞는 Text size 를 직접 넘긴다. */
const LABEL_SIZE: Record<ButtonSize, "1" | "2" | "3"> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "3",
};

const Button = (props: ButtonProps) => {
  const {
    size = "2",
    variant = "solid",
    color = "BLUE",
    label,
    startIcon,
    endIcon,
    disabled,
    radius = "none",
    width = "fit-content",
    href,
    reload,
    className,
    style,
    ...rest
  } = props as ButtonOwnProps &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, OwnKeys> & {
      href?: string;
      reload?: boolean;
    };

  const shared = {
    className: clsx(styles.button, styles[`size_${size}`], className),
    "data-color": color,
    "data-variant": variant,
    style: {
      ...style,
      "--btn-width": width,
      "--btn-radius": Radius[radius],
    } as React.CSSProperties,
  };

  const content = (
    <>
      {startIcon && <Icon name={startIcon} />}
      <Text
        size={LABEL_SIZE[size]}
        weight="600"
        style={{ padding: "0 4px", position: "relative", zIndex: 1 }}
      >
        {label}
      </Text>
      {endIcon && <Icon name={endIcon} />}
    </>
  );

  if (href !== undefined) {
    // reload: next/link 를 거치지 않는 맨 <a> — 브라우저가 문서를 새로 받는다
    if (reload) {
      return (
        <a
          href={href}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          {...shared}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        href={href}
        // <a> 에는 disabled 가 없다 — 시각 상태(.button[aria-disabled])와
        // 포커스 제외만 흉내 낸다
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        {...shared}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      {...shared}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
};

export default Button;

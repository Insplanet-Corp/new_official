// Text.tsx
import React from "react";
import clsx from "clsx";
import styles from "./Text.module.css";

export type TextSize = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type TextWeight = "300" | "400" | "500" | "600" | "700";
export type TextWrap = "wrap" | "nowrap" | "balance" | "pretty";
export type TextTrim = "normal" | "start" | "end" | "both";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "span" | "div" | "label" | "p";
  /** as="label" 일 때만 의미가 있다 */
  htmlFor?: string;
  size?: TextSize;
  fontSize?: string;
  weight?: TextWeight;
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  lineClamp?: number;
  align?: React.CSSProperties["textAlign"];
  wrap?: TextWrap;
  trim?: TextTrim;
  truncate?: boolean;
}

export const Text = ({
  as: Component = "span",
  size = "2",
  fontSize,
  weight = "400",
  color,
  children,
  truncate,
  lineClamp,
  align,
  wrap,
  trim = "normal",
  style,
  className,
  ...rest
}: TextProps) => {
  return (
    <Component
      className={clsx(
        styles.text,
        styles[`size_${size}`],
        styles[`weight_${weight}`],
        fontSize && styles.customSize,
        truncate && styles.truncate,
        lineClamp && styles.lineClamp,
        trim !== "normal" && styles[`trim_${trim}`],
        className,
      )}
      style={
        {
          ...style,
          "--text-color": color,
          "--custom-font-size": fontSize,
          "--text-align": align,
          "--text-wrap": wrap,
          "--line-clamp": lineClamp,
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Text;

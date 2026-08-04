// Heading.tsx
import React from "react";
import clsx from "clsx";
import styles from "./Heading.module.css";

export type HeadingSize = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type HeadingWeight = "300" | "400" | "500" | "700";
export type HeadingWrap = "wrap" | "nowrap" | "balance" | "pretty";
export type HeadingTrim = "normal" | "start" | "end" | "both";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: HeadingSize;
  fontSize?: string;
  weight?: HeadingWeight;
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  lineClamp?: number;
  align?: React.CSSProperties["textAlign"];
  wrap?: HeadingWrap;
  trim?: HeadingTrim;
  truncate?: boolean;
}

const Heading = ({
  as: Component = "h1",
  size = "6",
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
}: HeadingProps) => {
  return (
    <Component
      className={clsx(
        styles.heading,
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
          "--heading-color": color,
          "--custom-font-size": fontSize,
          "--heading-align": align,
          "--heading-wrap": wrap,
          "--line-clamp": lineClamp,
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Heading;

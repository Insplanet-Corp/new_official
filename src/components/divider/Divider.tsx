// Divider.tsx
import React from "react";
import clsx from "clsx";
import styles from "./Divider.module.css";
import { toCssValue, SpaceValue } from "../layouts/system";
import { Color } from "@/styles/theme";

// 1. 필요한 Props만 엄격하게 정의 (...rest 및 HTMLAttributes 상속 제거)
export interface DividerProps {
  size?: SpaceValue; // Vertical은 height, Horizontal은 width로 작용
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const VerticalDivider = ({
  size,
  color = Color.GRAY_200,
  className,
  style,
}: DividerProps) => {
  return (
    <div
      className={clsx(styles.base, styles.vertical, className)}
      style={
        {
          ...style,
          "--divider-size": toCssValue(size),
          "--divider-color": color,
        } as React.CSSProperties
      }
    />
  );
};

export const HorizontalDivider = ({
  size,
  color = Color.GRAY_200,
  className,
  style,
}: DividerProps) => {
  return (
    <div
      className={clsx(styles.base, styles.horizontal, className)}
      style={
        {
          ...style,
          "--divider-size": toCssValue(size),
          "--divider-color": color,
        } as React.CSSProperties
      }
    />
  );
};

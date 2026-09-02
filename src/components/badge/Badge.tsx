// Badge.tsx
import React from "react";
import clsx from "clsx";
import styles from "./Badge.module.css";
import { IconName } from "../icon/icon-data";
import { ColorType, Radius } from "@/styles/theme";
import Text from "../text/Text";
import { Icon } from "../icon/Icon";

export type BadgeVariant = "solid" | "surface" | "outline";
export type BadgeSize = "1" | "2" | "3";

export interface BadgeProps {
  label: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
  startIcon?: IconName;
  endIcon?: IconName;
  color: ColorType;
  radius?: keyof typeof Radius;
  style?: React.CSSProperties;
}

/* Button 과 같은 이유 — Text 가 자기 size 클래스를 항상 달고 나오므로
   .badge 의 size_N { font-size } 가 라벨에 닿지 않는다. 크기를 맞춰 넘긴다. */
const LABEL_SIZE: Record<BadgeSize, "1" | "2" | "3"> = {
  "1": "1",
  "2": "2",
  "3": "3",
};

const Badge = ({
  label,
  size = "2",
  variant = "surface",
  startIcon,
  endIcon,
  color,
  radius = "medium",
  style,
}: BadgeProps) => {
  return (
    <div
      className={clsx(styles.badge, styles[`size_${size}`])}
      data-color={color}
      data-variant={variant}
      style={
        {
          "--badge-radius": Radius[radius],
          ...style,
        } as React.CSSProperties
      }
    >
      {startIcon && <Icon name={startIcon} size="1em" color="currentColor" />}
      <Text size={LABEL_SIZE[size]} weight="600" trim="end">
        {label}
      </Text>
      {endIcon && <Icon name={endIcon} size="1em" color="currentColor" />}
    </div>
  );
};

export default Badge;

"use client";

import React from "react";
import clsx from "clsx";
import styles from "./DropdownMenuItem.module.css";
import Text from "../text/Text";
import { SpaceValue, toCssValue } from "../layouts/system";
import { Icon } from "../icon/Icon";

export interface DropdownMenuItemProps {
  name?: string;
  value?: string;
  gap?: SpaceValue;
  selected?: boolean;
  selectedSetting?: boolean; // 설정 팝업에서 선택되었을 때
  children: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const DropdownMenuItem = ({
  name,
  value,
  gap = "0px",
  selected = false,
  selectedSetting = false,
  children,
  startIcon,
  endIcon,
  className,
  style,
  onClick,
}: DropdownMenuItemProps) => {
  return (
    <div
      className={clsx(
        styles.container,
        selectedSetting && styles.selectedSetting,
        className,
      )}
      style={
        {
          ...style,
          "--item-gap": toCssValue(gap),
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className={clsx(styles.button, selected && styles.selected)}
        onClick={onClick}
        name={name}
        value={value}
      >
        {startIcon && <div className={styles.startIcon}>{startIcon}</div>}

        <span className={styles.menuLabel}>
          <Text size="2">{children}</Text>
        </span>

        {selected && (
          <span className={styles.endIcon}>
            <Icon name="check" />
          </span>
        )}

        {endIcon && <div className={styles.endIcon}>{endIcon}</div>}
      </button>
    </div>
  );
};

export default DropdownMenuItem;

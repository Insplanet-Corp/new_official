"use client";

import React from "react";
import clsx from "clsx";
import styles from "./DropdownTrigger.module.css";
import { Icon } from "../icon/Icon";
import TextInput, { InputSizeType } from "../input/TextInput";

export interface DropdownTriggerProps {
  size?: InputSizeType;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  isOpen?: boolean;
  width?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const DropdownTrigger = ({
  size,
  value,
  placeholder,
  width,
  readOnly = false,
  isOpen = false,
  className,
  style,
  onClick,
}: DropdownTriggerProps) => {
  return (
    <TextInput
      width={width}
      size={size}
      value={value}
      placeholder={placeholder}
      rightIcon={<Icon name="chevron-down" size={20} />}
      readOnly={readOnly}
      hasPointCursor
      noIconEvent
      onClick={onClick}
      className={clsx(styles.trigger, isOpen && styles.opened, className)}
      style={style}
    />
  );
};

export default DropdownTrigger;

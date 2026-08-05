"use client";

import React, { forwardRef } from "react";
import clsx from "clsx";
import styles from "./TextInput.module.css";

export type InputSizeType = "small" | "medium" | "small-medium";

// 엄격하게 관리되는 Custom Props 인터페이스 유지
export interface ISearchInputProps {
  size?: InputSizeType;
  value?: string;
  placeholder?: string;
  width?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  readOnly?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onClick?: React.MouseEventHandler<HTMLElement>;
  hasPointCursor?: boolean;
  className?: string;
  fullWidth?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  noIconEvent?: boolean; // for pointer-event - right-icon
  textAlign?: React.CSSProperties["textAlign"];
}

const TextInput = forwardRef<HTMLInputElement, ISearchInputProps>(
  (
    {
      size = "small",
      placeholder,
      leftIcon,
      rightIcon,
      value,
      width = "100%",
      readOnly,
      disabled,
      fullWidth,
      onChange = () => {},
      onFocus,
      onBlur,
      onKeyDown,
      onClick,
      hasPointCursor,
      className,
      style,
      inputStyle,
      noIconEvent,
      textAlign = "start",
    },
    ref,
  ) => {
    // 1. 사이즈별 클래스 매핑 키 생성
    const sizeClassName =
      size === "small-medium"
        ? styles.size_small_medium
        : styles[`size_${size}`];

    return (
      <div
        className={clsx(
          styles.wrapper,
          sizeClassName,
          fullWidth && styles.fullWidth,
          noIconEvent && styles.noIconEvent,
          className,
        )}
        style={
          {
            ...style,
            "--input-width": width,
            "--text-align": textAlign,
          } as React.CSSProperties
        }
      >
        {leftIcon && <div className="left-icon">{leftIcon}</div>}

        <input
          ref={ref}
          value={value ?? ""}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onClick={onClick}
          className={clsx(
            styles.input,
            leftIcon && styles.hasLeftIcon,
            hasPointCursor && styles.hasPointCursor,
          )}
          style={inputStyle}
        />

        {rightIcon && (
          <div className="right-icon" onClick={onClick}>
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);

TextInput.displayName = "TextInput";

export default TextInput;

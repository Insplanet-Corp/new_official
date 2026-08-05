import React, { forwardRef } from "react";
import clsx from "clsx";
import styles from "./DropdownContent.module.css";

export interface DropdownContentProps {
  width?: string;
  height?: string;
  padding?: string;
  radius?: string;
  isCentered?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
  (
    {
      width,
      height,
      padding,
      radius,
      isCentered = false,
      children,
      className,
      style,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          styles.container,
          isCentered && styles.centered,
          className,
        )}
        style={
          {
            ...style,
            "--dc-width": width,
            "--dc-height": height,
            "--dc-padding": padding,
            "--dc-radius": radius,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    );
  },
);

DropdownContent.displayName = "DropdownContent";

export default DropdownContent;

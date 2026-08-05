"use client";

import React, { useState } from "react";
import clsx from "clsx";
import styles from "./Dropdown.module.css";
import {
  useFloating,
  autoUpdate,
  offset as floatingOffset,
  useClick,
  useHover,
  useDismiss,
  useInteractions,
  FloatingPortal,
  Placement,
  flip,
  shift,
} from "@floating-ui/react";

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode | ((closeDropdown: () => void) => React.ReactNode);
  placement?: Placement;
  open?: boolean;
  triggerMode?: "click" | "hover" | "both" | "disabled";
  onOpenChange?: (open: boolean) => void;
  offset?: number;
  variant?: "fixed" | "absolute";
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  placement: _placement = "bottom-start",
  open: controlledOpen,
  triggerMode = "click",
  onOpenChange,
  offset = 4,
  variant = "absolute",
  fullWidth,
  className,
  style,
}) => {
  const placement = _placement || "bottom-start";
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean | ((prev: boolean) => boolean)) => {
    const resolvedOpen =
      typeof nextOpen === "function"
        ? nextOpen(controlledOpen ?? uncontrolledOpen)
        : nextOpen;

    if (controlledOpen === undefined) {
      setUncontrolledOpen(resolvedOpen);
    }
    onOpenChange?.(resolvedOpen);
  };

  const closeDropdown = () => setOpen(false);

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: variant === "fixed" ? "fixed" : "absolute",
    whileElementsMounted: autoUpdate,
    middleware: [floatingOffset(offset), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context, {
    enabled: triggerMode === "click" || triggerMode === "both",
  });

  const hover = useHover(context, {
    enabled: triggerMode === "hover" || triggerMode === "both",
    delay: { close: 100 },
  });

  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    hover,
    dismiss,
  ]);

  return (
    <div
      className={clsx(
        styles.container,
        fullWidth && styles.fullWidth,
        open && styles.opened,
        className,
      )}
      style={style}
    >
      <div ref={refs.setReference} {...getReferenceProps()}>
        {trigger}
      </div>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              visibility: isPositioned ? "visible" : "hidden",
              zIndex: 1200,
            }}
            {...getFloatingProps()}
          >
            {typeof children === "function"
              ? children(closeDropdown)
              : children}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

export default Dropdown;

// Avatar.tsx
import React from "react";
import clsx from "clsx";
import styles from "./Avatar.module.css";
import { Color, Radius } from "@/styles/theme";

const toCssValue = (value?: string | number) => {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
};

export interface AvatarProps {
  size: string | number;
  color?: string;
  radius?: keyof typeof Radius;
  fallback?: React.ReactNode;
  src?: string;
  onClick?: () => void;
}

const Avatar = ({
  size,
  color = Color.GRAY_400,
  radius = "medium",
  fallback,
  src,
  onClick,
}: AvatarProps) => {
  const cssSize = toCssValue(size);

  const renderContent = () => {
    if (src) {
      return <img src={src} alt="avatar image" className={styles.image} />;
    }
    if (fallback) {
      return <span className={styles.fallback}>{fallback}</span>;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        styles.avatar,
        onClick && styles.interactive, // onClick prop이 있으면 interactive 오버레이 활성화
      )}
      style={
        {
          "--avatar-size": cssSize,
          "--avatar-color": color,
          "--avatar-radius": Radius[radius],
        } as React.CSSProperties
      }
    >
      {renderContent()}
    </div>
  );
};

export default Avatar;

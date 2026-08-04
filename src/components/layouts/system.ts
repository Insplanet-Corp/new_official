// system.ts
import { CSSProperties } from "react";

export type SpaceValue = string | number;

export interface LayoutsProps {
  p?: SpaceValue;
  px?: SpaceValue;
  py?: SpaceValue;
  pt?: SpaceValue;
  pr?: SpaceValue;
  pb?: SpaceValue;
  pl?: SpaceValue;

  m?: SpaceValue;
  mx?: SpaceValue;
  my?: SpaceValue;
  mt?: SpaceValue;
  mr?: SpaceValue;
  mb?: SpaceValue;
  ml?: SpaceValue;

  width?: SpaceValue;
  height?: SpaceValue;

  fullWidth?: boolean;

  bg?: CSSProperties["background"];
  radius?: SpaceValue;
}

export const toCssValue = (value?: SpaceValue): string | undefined => {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
};

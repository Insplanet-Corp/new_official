// Flex.tsx
import React, { forwardRef } from "react";
import clsx from "clsx";
import styles from "./Flex.module.css";
import { LayoutsProps, SpaceValue, toCssValue } from "./system";

export interface FlexProps
  extends React.HTMLAttributes<HTMLElement>, LayoutsProps {
  as?: "div" | "span";
  display?: "none" | "inline-flex" | "flex";
  row?: boolean;
  direction?: React.CSSProperties["flexDirection"];
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  bg?: string;
  gap?: SpaceValue;
  gapX?: SpaceValue;
  gapY?: SpaceValue;
}

const Flex = forwardRef<HTMLElement, FlexProps>(
  (
    {
      as: Component = "div",
      display = "flex",
      row,
      direction,
      align,
      justify,
      wrap,
      gap,
      gapX,
      gapY,
      // LayoutsProps
      p,
      px,
      py,
      pt,
      pr,
      pb,
      pl,
      m,
      mx,
      my,
      mt,
      mr,
      mb,
      bg,
      ml,
      width,
      height,
      fullWidth,
      radius,
      // Common HTML
      className,
      style,
      children,
      ...rest
    },
    ref,
  ) => {
    // 1. row prop 여부나 direction prop에 따라 flexDirection 결정
    const resolvedDirection = direction || (row ? "row" : "column");

    // 2. flex 축은 CSS 변수로 (모두 fallback 이 있어 안전하다)
    const cssVariables: Record<string, string | undefined> = {
      "--flex-display": display,
      "--flex-direction": resolvedDirection,
      "--flex-wrap": wrap,
      "--flex-gap": toCssValue(gap),
      "--flex-gap-x": toCssValue(gapX),
      "--flex-gap-y": toCssValue(gapY),
    };

    /* 3. 여백·크기는 실제 CSS 속성으로 직접 넣는다 — CSS 변수로 두면 안 된다.
       `padding-left: var(--layout-pl)` 처럼 정의되지 않은 변수를 참조하는 선언은
       무효(IACVT)가 되면서 그 속성을 초기값 0 으로 리셋해 버린다. 스타일시트에
       shorthand(padding) 다음에 longhand(padding-left)를 나열해 두면, pl 을 안 넘겼을 때
       longhand 가 px/p 로 넣은 값을 매번 지운다 — px·py·p·m·mx·my 가 통째로 죽는다.
       인라인 속성으로 넣으면 넘긴 것만 DOM 에 실리므로 이 문제가 없고,
       prop 을 안 주면 className 이 건 padding 이 그대로 살아남는다.
       (shorthand → longhand 순서로 넣어야 pt 같은 개별 지정이 p 를 이긴다) */
    const layout: React.CSSProperties = {};
    if (p !== undefined) layout.padding = toCssValue(p);
    if (px !== undefined) {
      layout.paddingLeft = toCssValue(px);
      layout.paddingRight = toCssValue(px);
    }
    if (py !== undefined) {
      layout.paddingTop = toCssValue(py);
      layout.paddingBottom = toCssValue(py);
    }
    if (pt !== undefined) layout.paddingTop = toCssValue(pt);
    if (pr !== undefined) layout.paddingRight = toCssValue(pr);
    if (pb !== undefined) layout.paddingBottom = toCssValue(pb);
    if (pl !== undefined) layout.paddingLeft = toCssValue(pl);

    if (m !== undefined) layout.margin = toCssValue(m);
    if (mx !== undefined) {
      layout.marginLeft = toCssValue(mx);
      layout.marginRight = toCssValue(mx);
    }
    if (my !== undefined) {
      layout.marginTop = toCssValue(my);
      layout.marginBottom = toCssValue(my);
    }
    if (mt !== undefined) layout.marginTop = toCssValue(mt);
    if (mr !== undefined) layout.marginRight = toCssValue(mr);
    if (mb !== undefined) layout.marginBottom = toCssValue(mb);
    if (ml !== undefined) layout.marginLeft = toCssValue(ml);

    if (width !== undefined) layout.width = toCssValue(width);
    if (height !== undefined) layout.height = toCssValue(height);
    if (bg !== undefined) layout.background = bg;
    if (radius !== undefined) layout.borderRadius = toCssValue(radius);

    return (
      <Component
        ref={ref as any}
        className={clsx(styles.flex, fullWidth && styles.fullWidth, className)}
        // 4. data-* 속성으로 align, justify 조건부를 가장 깔끔하게 주입
        data-align={align}
        data-justify={justify}
        style={
          {
            ...style,
            ...cssVariables,
            ...layout,
          } as React.CSSProperties
        }
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

Flex.displayName = "Flex";

export default Flex;

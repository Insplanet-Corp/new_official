"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// cursor 커지는 className
const GROW_SEL = [
  "#ci-logo",
  "#menu-logo",
  "#lets-talk",
  "#full-menu",
  "#menu-close",
  ".menu-item",
  ".m-menu-brief",
  ".brief-btn",
  ".project-head",
  ".footer-links a",
  ".proj-more", // main projct btn
  ".m-proj-more",

  ".m-cta-arrow",

  // contect mobile
  ".ct-brief",
  ".ct-chips button",
  ".ct-input",
  ".ct-textarea",
  ".ct-file-btn",
  ".ct-consent-box",
  ".ct-submit",
  ".ct-join-btn",
  ".rc-close",

  // contect mobile
  ".mc-brief",
  ".mc-chips button",
  ".mc-input",
  ".mc-textarea",
  ".mc-file-btn",
  ".mc-consent-box",
  ".mc-submit",
  ".mc-join-btn",
  ".mr-close",

  ".ps-close",

  ".pj-cat",
  ".pj-status",
].join(",");

/* Panels that turn the cursor into the solid "View Project" button.
   .m-proj-card 는 홈 모바일 캐러셀의 카드다 — PC 패널(.proj-visual)과 같은 상세 시트를
   열므로 커서도 같아야 한다. 실제 폰은 coarse 포인터라 커서 자체가 꺼져 있고, 이 값은
   좁은 창의 데스크톱 브라우저에서만 의미가 있다.
   ⚠️ 캐러셀 화살표(.m-proj-nav)는 카드 바깥(.m-proj-carousel 직속)이라 여기 안 걸린다 —
   화살표 위에서는 평범한 커서가 유지된다. 화살표를 카드 안으로 옮기면 깨진다. */
const VIEW_SEL = ".proj-visual,.pj-card,.m-proj-card";

/* smooth follow (no momentum): moves fast when far, decelerates to a soft stick as it nears. */
const FOLLOW = 0.13;

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = usePathname()?.startsWith("/admin") ?? false;

  useEffect(() => {
    const cur = ref.current;
    if (
      isAdmin ||
      !cur ||
      !matchMedia("(hover:hover) and (pointer:fine)").matches
    )
      return;

    let mx = innerWidth / 2;
    let my = innerHeight / 2;
    let cx = mx;
    let cy = my;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      framed = null;
    };
    addEventListener("mousemove", onMove);

    /* 프로젝트 상세는 sandbox iframe 안에 있다. 포인터가 그 위로 올라가면 mousemove 가
       이 문서에 도달하지 않아 커서가 그 자리에 그대로 멈춘다 — iframe 안의
       bridge.js 가 좌표를 넘겨 준다. iframe 이 화면 전체를 덮으므로 좌표는 1:1 이고,
       elementFromPoint 로는 iframe 밖에 안 보이므로 모드도 같이 받는다. */
    let framed: null | { grow: boolean } = null;
    const onFramedMove = (e: MessageEvent) => {
      const m = (
        e.data as { pdMouse?: { x: number; y: number; grow?: boolean } } | null
      )?.pdMouse;
      if (!m || typeof m.x !== "number" || typeof m.y !== "number") return;
      mx = m.x;
      my = m.y;
      framed = { grow: !!m.grow };
    };
    addEventListener("message", onFramedMove);

    // Decide the cursor MODE each frame from the topmost element under the pointer (single source of
    // truth via elementFromPoint) instead of per-element mouseenter/leave. The top buttons overlap the
    // project panel AND drift (magnetic hover), which made enter/leave race and flicker is-view<->grow.
    let mode = "";
    let raf = 0;
    const loop = () => {
      const el = framed ? null : document.elementFromPoint(mx, my);
      let m = framed && framed.grow ? "grow" : "";
      if (el) {
        if (el.closest(".cta-arrow"))
          m = "hide"; // the CTA arrow IS the cursor here -> hide the dot
        else if (el.closest(GROW_SEL)) m = "grow";
        else if (el.closest(VIEW_SEL)) m = "view"; // projects-page cards -> "View Project" cursor
      }
      if (m !== mode) {
        mode = m;
        cur.classList.toggle("is-view", m === "view");
        cur.style.opacity = m === "hide" ? "0" : ""; // reappears on leave
        cur.style.width = m === "grow" ? "80px" : ""; // grow=80 inline; view(96)/normal(32) from CSS
        cur.style.height = m === "grow" ? "80px" : "";
      }
      cx += (mx - cx) * FOLLOW;
      cy += (my - cy) * FOLLOW;
      const r = cur.offsetWidth / 2;
      cur.style.transform = `translate3d(${cx - r}px,${cy - r}px,0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      removeEventListener("mousemove", onMove);
      removeEventListener("message", onFramedMove);
      cancelAnimationFrame(raf);
    };
    // re-runs across the site <-> admin boundary so the follow loop is torn down with the dot
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <div id="cursor" ref={ref} aria-hidden="true">
      <span className="cursor-label">
        View
        <br />
        Project
      </span>
    </div>
  );
}

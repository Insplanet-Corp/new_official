'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectCard } from '@/data/projectsPage';
import { prefersReducedMotion } from '@/lib/dom';

type LenisLike = { stop?: () => void; start?: () => void; resize?: () => void; destroy?: () => void };
type LenisCtor = new (opts: {
  wrapper: HTMLElement;
  content: HTMLElement;
  lerp: number;
  smoothWheel: boolean;
  autoRaf: boolean;
}) => LenisLike & { raf: (t: number) => void };

/* ===== project-detail SHEET =====
   Clicking a project card on /projects no longer navigates: the detail rises from the bottom in a
   full-screen sheet while the list stays put underneath. Ported from the static site's
   js/project-sheet.js — same .ps-* markup and CSS (src/styles/style.css), same beats:
   load behind a top progress bar → slide up → sheet-local Lenis → ESC/X/back closes.

   ⚠️ ONE deliberate difference from the static original: it fetches the detail HTML and injects it
   into the page. We do NOT. The publisher's document keeps running inside DetailFrame's sandboxed
   iframe, because injecting it would run the publisher's scripts in OUR document — with read access
   to the Supabase session token in localStorage. See DetailFrame for the sandbox rationale. The
   knock-on effects: progress comes from the iframe's load + first height message instead of
   counting images, and the detail's own controls (.pd-close / .pd-btn) can't be reached from here,
   so the generic .ps-close is always the way out.

   The route /projects/<id> still renders the same detail as a normal page — deep links, refresh and
   crawlers keep working; the sheet is what you get when you arrive from the list. */

/* ---- progress bar ----
   realP = what actually happened; shownP = what's drawn, chasing realP at a CAPPED speed so a fast
   local load still takes a readable moment instead of flashing past. The sheet only slides once the
   DRAWN bar has arrived at 1. */
const BAR_RATE = 1.65; // bar-widths per second → a full bar takes ≥ ~0.6s
const SLIDE_MS = 1400; // failsafe: must exceed the CSS slide (1.2s)
const LOAD_GUARD_MS = 8000; // never hang the open on one stuck document

export default function ProjectSheet({ cards }: { cards: ProjectCard[] }) {
  const [mounted, setMounted] = useState(false);
  const [src, setSrc] = useState<string | null>(null); // iframe src of the detail being shown
  const [open, setOpen] = useState(false); // sheet is up (drives the slide)
  const [loaded, setLoaded] = useState(false); // .ps-body fade-in
  const [barOn, setBarOn] = useState(false); // 진행 바가 보이는가
  const [atEnd, setAtEnd] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // 상세 문서가 알려 오는 높이 (_height.js). DetailFrame 과 같은 다리를 쓴다.
  const [height, setHeight] = useState(1200);

  /* 어디까지 진행했는지 — 렌더에 쓰지 않으므로 ref 로 둔다 (매 프레임 setState 를 피한다) */
  const bar = useRef({ real: 0, shown: 0, raf: 0, last: 0, trickle: 0, onFull: null as null | (() => void) });
  const seq = useRef(0); // open/close 마다 증가 — 늦게 도착한 로드가 닫힌 시트를 열지 못하게
  const pushed = useRef(false); // 이 탭이 직접 pushState 한 항목인가 (닫을 때 back 으로 빠질 수 있는가)
  const savedY = useRef(0);
  const lenis = useRef<(LenisLike & { raf: (t: number) => void }) | null>(null);
  const lenisRaf = useRef(0);
  const guard = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useRef(false);

  useEffect(() => {
    setMounted(true);
    reduce.current = prefersReducedMotion();
  }, []);

  /* ---- 진행 바 ------------------------------------------------------------ */
  const barDraw = useCallback(() => {
    const el = barRef.current;
    if (el) el.style.transform = `scaleX(${Math.max(0, Math.min(1, bar.current.shown)).toFixed(3)})`;
  }, []);

  const barKick = useCallback(() => {
    const b = bar.current;
    if (b.raf) return;
    b.last = 0;
    const loop = (t: number) => {
      b.raf = 0;
      const dt = b.last ? Math.min(0.1, (t - b.last) / 1000) : 0.016;
      b.last = t;
      const target = Math.min(1, b.real);
      if (b.shown < target) b.shown = Math.min(target, b.shown + BAR_RATE * dt);
      barDraw();
      if (b.onFull && b.shown >= 0.999) {
        const cb = b.onFull;
        b.onFull = null;
        cb();
        return;
      }
      b.raf = requestAnimationFrame(loop);
    };
    b.raf = requestAnimationFrame(loop);
  }, [barDraw]);

  const stopTrickle = useCallback(() => {
    if (bar.current.trickle) {
      clearInterval(bar.current.trickle);
      bar.current.trickle = 0;
    }
  }, []);

  /* 한 단계가 진행 중인 동안 다음 지점을 향해 조금씩 기어간다 — 점근이라 도달하지는
     않는다 (실제 이벤트가 그 지점을 찍는다). 바가 멈춰 보이지 않게 하는 장치. */
  const trickle = useCallback(
    (from: number, to: number) => {
      stopTrickle();
      if (bar.current.real < from) bar.current.real = from;
      bar.current.trickle = window.setInterval(() => {
        bar.current.real += (to - bar.current.real) * 0.035;
        barKick();
      }, 100);
    },
    [barKick, stopTrickle],
  );

  const barReal = useCallback(
    (p: number) => {
      if (p > bar.current.real) bar.current.real = Math.min(1, p);
      barKick();
    },
    [barKick],
  );

  const barReset = useCallback(() => {
    stopTrickle();
    const b = bar.current;
    if (b.raf) cancelAnimationFrame(b.raf);
    b.raf = 0;
    b.real = 0;
    b.shown = 0;
    b.onFull = null;
    barDraw();
  }, [barDraw, stopTrickle]);

  /* ---- 스크롤 잠금 -------------------------------------------------------
     사이트 표준 방식: savedY + body position:fixed. overflow:hidden 은 쓰지 않는다 —
     body 가 스크롤 컨테이너가 되면서 다른 곳의 position:sticky 가 죽는다. */
  const lockScroll = useCallback((on: boolean) => {
    const s = document.body.style;
    const page = (window as Window & { __lenis?: LenisLike }).__lenis;
    if (on) {
      savedY.current = window.scrollY || 0;
      s.position = 'fixed';
      s.top = `${-savedY.current}px`;
      s.left = '0';
      s.right = '0';
      s.width = '100%';
      page?.stop?.();
    } else {
      s.position = '';
      s.top = '';
      s.left = '';
      s.right = '';
      s.width = '';
      window.scrollTo(0, savedY.current);
      /* Lenis 재동기화. start() 는 이미 복원된 window.scrollY 를 내부 값으로 복사하고,
         resize() 는 캐시한 치수를 지금 다시 잰다 — body 가 position:fixed 인 동안
         문서가 뷰포트 높이였던 탓에 Lenis 의 limit 이 0 으로 캐시돼 있다.
         ⚠️ 여기서 scrollTo(savedY,{immediate}) 를 부르면 안 된다. limit 이 아직 0 이라
         0 으로 클램프되어 "맨 위로 튀는" 증상이 된다. */
      page?.start?.();
      page?.resize?.();
    }
  }, []);

  /* ---- 시트 전용 Lenis — 페이지와 같은 탄성 휠 감각 ---------------------- */
  const startSheetLenis = useCallback(() => {
    const Ctor = (window as Window & { Lenis?: LenisCtor }).Lenis;
    if (lenis.current || !Ctor || reduce.current || !scrollRef.current || !bodyRef.current) return;
    try {
      const l = new Ctor({
        wrapper: scrollRef.current,
        content: bodyRef.current,
        lerp: 0.09,
        smoothWheel: true,
        autoRaf: false,
      });
      lenis.current = l;
      const loop = (t: number) => {
        if (!lenis.current) return;
        lenis.current.raf(t);
        lenisRaf.current = requestAnimationFrame(loop);
      };
      lenisRaf.current = requestAnimationFrame(loop);
    } catch {
      lenis.current = null;
    }
  }, []);

  const stopSheetLenis = useCallback(() => {
    if (lenisRaf.current) cancelAnimationFrame(lenisRaf.current);
    lenisRaf.current = 0;
    if (lenis.current) {
      try {
        lenis.current.destroy?.();
      } catch {
        /* 이미 파기됐을 수 있다 */
      }
      lenis.current = null;
    }
  }, []);

  /* ---- 열기 / 닫기 -------------------------------------------------------- */

  /** 로드가 끝났다 — 바를 걷고 시트를 올린다. 높이 통지와 보호 타이머가 같이 쓴다. */
  const reveal = useCallback(() => {
    if (guard.current) clearTimeout(guard.current);
    stopTrickle();
    setBarOn(false);
    setLoaded(true);
    setOpen(true);
  }, [stopTrickle]);

  const openSheet = useCallback(
    (detail: string, push: string | null) => {
      seq.current += 1;
      const mine = seq.current;
      if (push) {
        history.pushState({ psDetail: detail }, '', push);
        pushed.current = true;
      }
      setHeight(1200);
      setLoaded(false);
      setAtEnd(false);
      barReset();
      // 시트가 아직 올라오지 않은 동안에도 html 의 스크롤바 자리를 미리 없앤다 —
      // 슬라이드 첫 프레임에 리플로우가 겹치지 않도록
      document.documentElement.classList.add('ps-open');
      setBarOn(true);
      setSrc(detail);
      barReal(0.08);
      trickle(0.08, 0.35);
      if (guard.current) clearTimeout(guard.current);
      /* 보호 타이머는 rAF 를 거치지 않고 직접 연다.
         ⚠️ 평소 공개는 그려진 바가 1 에 닿는 rAF 루프가 맡는데, 백그라운드 탭에서는
         rAF 가 아예 멈춘다 — 거기에 매달아 두면 카드를 누른 사람이 주소만 바뀐 채
         아무것도 못 보는 상태로 남는다. */
      guard.current = setTimeout(() => {
        if (mine !== seq.current) return;
        stopTrickle();
        bar.current.real = 1;
        bar.current.shown = 1;
        bar.current.onFull = null;
        barDraw();
        reveal();
      }, LOAD_GUARD_MS);
    },
    [barDraw, barReal, barReset, reveal, stopTrickle, trickle],
  );

  const closeSheet = useCallback(() => {
    seq.current += 1;
    if (guard.current) clearTimeout(guard.current);
    stopSheetLenis();
    barReset();
    setBarOn(false);
    document.documentElement.classList.remove('ps-open');
    pushed.current = false;
    setOpen(false);
    setLoaded(false);
    // 슬라이드가 끝난 뒤에 iframe 을 버린다 — 내려가는 도중 내용이 사라지면 빈 판이 보인다
    setTimeout(() => setSrc(null), reduce.current ? 0 : SLIDE_MS);
  }, [barReset, stopSheetLenis]);

  /* 사용자가 누른 닫기(X / ESC): 우리가 만든 history 항목이면 뒤로 빠진다(popstate 가
     closeSheet 를 부른다). 아니면 — /projects/<id> 로 바로 들어와 시트가 열린 경우 —
     항목을 하나 더 쌓지 않고 주소만 목록으로 되돌린 뒤 직접 닫는다. */
  const requestClose = useCallback(() => {
    if (!src) return;
    if (pushed.current) history.back();
    else {
      history.replaceState(null, '', '/projects');
      closeSheet();
    }
  }, [closeSheet, src]);

  /* 시트가 열린 상태(open)로 전환되면 잠금·Lenis 를 건다 */
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    startSheetLenis();
    const sheet = sheetRef.current;
    const scroll = scrollRef.current;
    // 상세가 자기 fixed 크롬을 콘텐츠 가장자리 기준으로 놓을 수 있도록 스크롤바 폭을 알려준다
    const syncSbw = () => {
      if (sheet && scroll) sheet.style.setProperty('--ps-sbw', `${scroll.offsetWidth - scroll.clientWidth}px`);
    };
    syncSbw();
    addEventListener('resize', syncSbw);
    return () => {
      removeEventListener('resize', syncSbw);
      lockScroll(false);
    };
  }, [open, lockScroll, startSheetLenis]);

  /* 목록의 카드 링크를 가로챈다 — 같은 주소로 pushState 하고 시트를 올린다 */
  useEffect(() => {
    const byHref = new Map(cards.filter((c) => c.href && c.detail).map((c) => [c.href as string, c.detail as string]));
    const onClick = (e: MouseEvent) => {
      // 새 탭/새 창으로 열려는 조작은 그대로 둔다
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="/projects/"]');
      if (!(a instanceof HTMLAnchorElement)) return;
      const detail = byHref.get(new URL(a.href, location.href).pathname);
      if (!detail) return;
      e.preventDefault();
      openSheet(detail, new URL(a.href, location.href).pathname);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [cards, openSheet]);

  /* 뒤로/앞으로: 주소가 /projects/<id> 면 열고, 아니면 닫는다 */
  useEffect(() => {
    const onPop = () => {
      const m = /^\/projects\/([^/]+)\/?$/.exec(location.pathname);
      const detail = m ? cards.find((c) => c.id === decodeURIComponent(m[1]))?.detail ?? null : null;
      if (detail) openSheet(detail, null);
      else closeSheet();
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [cards, closeSheet, openSheet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [requestClose]);

  /* 상세 문서가 알려 오는 높이. 첫 통지 = 레이아웃이 잡혔다는 신호라 바를 끝까지 민다. */
  useEffect(() => {
    if (!src) return;
    let first = true;
    const onMessage = (e: MessageEvent) => {
      // sandbox iframe 의 origin 은 'null' 이라 origin 으로 못 거른다. source 로 확인한다.
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const h = (e.data as { __portfolioHeight?: number })?.__portfolioHeight;
      if (typeof h !== 'number' || h <= 0) return;
      setHeight(h);
      if (!first) return;
      first = false;
      const mine = seq.current;
      stopTrickle();
      bar.current.real = 1;
      bar.current.onFull = () => {
        if (mine !== seq.current) return; // 그 사이 닫혔다면 올리지 않는다
        reveal();
      };
      barKick();
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [src, barKick, reveal, stopTrickle]);

  useEffect(() => () => {
    stopTrickle();
    stopSheetLenis();
    if (guard.current) clearTimeout(guard.current);
  }, [stopSheetLenis, stopTrickle]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ⚠️ transform 은 JSX style 에 두지 않는다 — rAF 로 매 프레임 쓰는 값이라
          다른 state 로 리렌더가 한 번 일어나면 그때마다 0 으로 되돌아간다.
          CSS(.ps-bar)가 이미 scaleX(0) 으로 시작시킨다. */}
      <div className="ps-bar" ref={barRef} aria-hidden="true" style={{ opacity: barOn ? 1 : 0 }} />
      <div
        id="project-sheet"
        className={`ps-sheet${open ? ' is-open' : ''}${atEnd ? ' is-at-end' : ''}`}
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={open ? 'false' : 'true'}
        inert={!open}
      >
        <button type="button" className="ps-close" aria-label="닫기" onClick={requestClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M0 0L24 24M24 0L0 24"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          className="ps-scroll"
          ref={scrollRef}
          data-lenis-prevent
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * 0.5);
          }}
        >
          <div className={`ps-body${loaded ? ' is-loaded' : ''}`} ref={bodyRef}>
            {src ? (
              <iframe
                ref={frameRef}
                src={src}
                title="프로젝트 상세"
                sandbox="allow-scripts"
                onLoad={() => {
                  stopTrickle();
                  barReal(0.7);
                  trickle(0.7, 0.95);
                }}
                style={{ display: 'block', width: '100%', height, border: 0 }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

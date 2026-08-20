'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectCard } from '@/data/projectsPage';

type LenisLike = { stop?: () => void; start?: () => void; resize?: () => void; destroy?: () => void };
/* ===== project-detail SHEET =====
   Clicking a project card on /projects no longer navigates: the detail rises from the bottom in a
   full-screen sheet while the list stays put underneath. Ported from the static site's
   js/project-sheet.js — same .ps-* markup and CSS (src/styles/style.css):
   load behind a top progress bar → slide up → ESC / the detail's own close / back closes.

   ⚠️ ONE deliberate difference from the static original: it fetches the detail HTML and injects it
   into the page. We do NOT. The publisher's document keeps running inside a sandboxed iframe,
   because injecting it would run the publisher's scripts in OUR document — with read access to the
   Supabase session token in localStorage. See DetailFrame for the sandbox rationale.

   Three consequences, all handled by public/portfolio/_shared/bridge.js inside the detail:

   1. ⚠️ THE IFRAME MUST BE A FIXED VIEWPORT (100% of the sheet), NOT sized to its content.
      _shared/project-detail.css builds the detail around `height:100vh` (hero) and
      `position:fixed` (close, SCROLL hint) — it assumes it IS the viewport. Size the iframe to the
      document height instead and both break: `100vh` resolves to the iframe's own height, so the
      hero grows every time the height is reported back (a runaway loop), and `position:fixed` pins
      to the top of the document. There is no sheet-local Lenis for the same reason — the scrolling
      happens inside the detail document now.
   2. The detail's close (.pd-close) cannot navigate out of a sandbox, and it would otherwise open
      the LIST PAGE INSIDE THE IFRAME. The bridge relays the click (pdClose) and tells us it owns a
      close button (pdReady/ownClose) so we hide our generic .ps-close — otherwise two X's show.
   3. The custom cursor freezes over the iframe (mousemove never reaches this document). The bridge
      relays coordinates; Cursor.tsx picks them up.

   The iframe is kept mounted after closing, so reopening the same project is instant instead of
   re-downloading — see closeSheet.

   The route /projects/<id> still renders the same detail as a normal page — deep links, refresh and
   crawlers keep working; the sheet is what you get when you arrive from the list. */

/* ---- progress bar ----
   realP = what actually happened; shownP = what's drawn, chasing realP at a CAPPED speed so a fast
   local load still takes a readable moment instead of flashing past. The sheet only slides once the
   DRAWN bar has arrived at 1. */
const BAR_RATE = 1.65; // bar-widths per second → a full bar takes ≥ ~0.6s
const LOAD_GUARD_MS = 8000; // never hang the open on one stuck document
/** 내려가는 슬라이드 길이. ⚠️ .ps-sheet 의 transform transition(1.2s)과 같아야 한다 — style.css */
const SLIDE_MS = 1200;
/** history.back() 이 우리 항목으로 돌아왔는지 확인하고 직접 닫기까지 기다리는 시간 */
const CLOSE_FALLBACK_MS = 600;
/** /projects/<id> — 목록 주소와 상세 주소를 가르는 유일한 기준 (popstate 판정·엔트리 판정이 같이 쓴다) */
const DETAIL_PATH = /^\/projects\/([^/]+)\/?$/;

export default function ProjectSheet({ cards }: { cards: ProjectCard[] }) {
  const [mounted, setMounted] = useState(false);
  const [src, setSrc] = useState<string | null>(null); // iframe src of the detail being shown
  const [open, setOpen] = useState(false); // sheet is up (drives the slide)
  const [loaded, setLoaded] = useState(false); // .ps-body fade-in
  const [ownClose, setOwnClose] = useState(false); // 상세가 자기 닫기 버튼을 갖고 있는가
  const [barOn, setBarOn] = useState(false); // 진행 바가 보이는가

  const barRef = useRef<HTMLDivElement>(null);


  /* 어디까지 진행했는지 — 렌더에 쓰지 않으므로 ref 로 둔다 (매 프레임 setState 를 피한다) */
  const bar = useRef({ real: 0, shown: 0, raf: 0, last: 0, trickle: 0, onFull: null as null | (() => void) });
  const seq = useRef(0); // open/close 마다 증가 — 늦게 도착한 로드가 닫힌 시트를 열지 못하게
  const pushed = useRef(false); // 이 탭이 직접 pushState 한 항목인가 (닫을 때 back 으로 빠질 수 있는가)
  const savedY = useRef(0);
  const guard = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* 이미 다 불러서 띄운 적이 있는 상세. 닫아도 iframe 을 버리지 않으므로
     같은 프로젝트를 다시 열면 로딩 없이 바로 올라온다. */
  const ready = useRef<string | null>(null);
  /* 지금 이 시트가 붙들고 있는 상세 — 불러오는 중이든 올라와 있든. ready 와 다르다:
     ready 는 "받아 온 적이 있다"(닫아도 남는다), 이쪽은 "지금 이걸 보여주고 있다"(닫으면 비운다).
     같은 상세를 다시 열라는 요청을 여기서 걸러 낸다. */
  const showing = useRef<string | null>(null);
  /* 내려가는 슬라이드가 끝나는 시점 — 그때까지 뒤쪽 목록의 클릭을 막아 둔다 */
  const slideOut = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* history.back() 이 시트를 못 닫았을 때 직접 닫는 안전망 (requestClose 참고) */
  const closeFallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

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
      /* ⚠️ 재진입 가드 — 같은 상세를 이미 붙들고 있으면 아무것도 하지 않는다.
         이게 없으면 썸네일을 누른 횟수만큼 열기 시퀀스가 통째로 다시 돈다:
         history 항목이 매번 하나씩 쌓이고, barReset() 이 진행 바를 0 으로 되돌려
         눈에 보이게 처음부터 다시 차며, 같은 src 를 다시 넣어 봐야 iframe 은
         재로드되지 않으므로 load 이벤트가 안 와서 공개가 8초 보호 타이머로 밀린다.
         목록으로 돌아가려면 누른 횟수만큼 뒤로가기를 해야 했다.
         뒤로 나오는 길에 popstate 가 같은 주소를 물고 오는 경우도 여기서 걸린다. */
      if (showing.current === detail) return;
      showing.current = detail;
      seq.current += 1;
      const mine = seq.current;
      if (push) {
        /* 이미 상세 주소에 서 있으면(로딩 중에 다른 카드를 누른 경우) 항목을 새로
           쌓지 않고 갈아끼운다 — 목록으로 나가는 뒤로가기는 언제나 한 번이어야 한다. */
        if (DETAIL_PATH.test(location.pathname)) {
          history.replaceState({ psDetail: detail }, '', push);
        } else {
          history.pushState({ psDetail: detail }, '', push);
          pushed.current = true;
        }
      }
      // 시트가 아직 올라오지 않은 동안에도 html 의 스크롤바 자리를 미리 없앤다 —
      // 슬라이드 첫 프레임에 리플로우가 겹치지 않도록
      document.documentElement.classList.add('ps-open');
      /* 뒤쪽 목록의 카드 링크를 죽인다 (style.css 의 html.ps-busy).
         ⚠️ inert 도 translateY(100%) 도 "안 보이는데 눌리는" 구간을 못 막는다 —
         로딩 중에는 시트가 화면 밖이라 목록이 멀쩡히 눌리고, 닫는 중에는 시트가
         아직 화면을 덮고 있는데 inert 라 클릭이 그 아래로 지나간다. */
      if (slideOut.current) clearTimeout(slideOut.current);
      slideOut.current = null;
      document.documentElement.classList.add('ps-busy');
      if (closeFallback.current) clearTimeout(closeFallback.current);
      closeFallback.current = null;

      /* 같은 상세를 다시 여는 경우: iframe 이 그대로 살아 있으므로 진행 바 없이 바로 올린다.
         닫을 때 iframe 을 버리면 다시 열 때마다 처음부터 받아 와 오히려 더 느려지고,
         받아 오는 동안 시트의 흰 바탕이 그대로 보인다. */
      if (ready.current === detail) {
        setSrc(detail);
        reveal();
        return;
      }

      setLoaded(false);
      setOwnClose(false); // 새 상세가 알려 줄 때까지는 우리 X 를 쓴다
      barReset();
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
        ready.current = detail;
        reveal();
      }, LOAD_GUARD_MS);
    },
    [barDraw, barReal, barReset, reveal, stopTrickle, trickle],
  );

  const closeSheet = useCallback(() => {
    seq.current += 1;
    showing.current = null;
    if (guard.current) clearTimeout(guard.current);
    if (closeFallback.current) clearTimeout(closeFallback.current);
    closeFallback.current = null;
    barReset();
    setBarOn(false);
    document.documentElement.classList.remove('ps-open');
    /* ps-busy 는 슬라이드가 끝난 뒤에 뗀다 — inert 는 이 자리에서 바로 붙는데
       시트는 1.2초에 걸쳐 내려간다. 그 사이에 목록을 열어 두면 화면에 보이지도 않는
       카드가 눌린다. */
    if (slideOut.current) clearTimeout(slideOut.current);
    slideOut.current = setTimeout(() => {
      slideOut.current = null;
      document.documentElement.classList.remove('ps-busy');
    }, SLIDE_MS);
    pushed.current = false;
    setOpen(false);
    /* ⚠️ iframe 을 버리지 않는다(setSrc(null) 하지 않는다).
       예전에는 슬라이드가 끝나면 지웠는데 두 가지가 걸렸다 —
       (1) 다시 열 때마다 문서를 처음부터 받아 와 오히려 느려진다,
       (2) 1.4초 타이머가 도는 동안 다시 열면 그 타이머가 방금 띄운 iframe 을
           지워 버려서 시트의 흰 바탕만 남는다.
       내려간 시트는 inert 라 접근되지 않으므로 그대로 두는 편이 낫다. */
  }, [barReset]);

  /* 사용자가 누른 닫기(X / ESC): 우리가 만든 history 항목이면 뒤로 빠진다(popstate 가
     closeSheet 를 부른다). 아니면 — /projects/<id> 로 바로 들어와 시트가 열린 경우 —
     항목을 하나 더 쌓지 않고 주소만 목록으로 되돌린 뒤 직접 닫는다. */
  const requestClose = useCallback(() => {
    /* ⚠️ src 로 판정하면 안 된다 — 닫아도 iframe 을 버리지 않으므로 src 는 계속 남는다.
       목록만 보고 있을 때 누른 ESC 가 replaceState 까지 하고 가는 일이 없도록,
       "지금 붙들고 있는 상세"로 판정한다. */
    if (!showing.current) return;
    if (!pushed.current) {
      history.replaceState(null, '', '/projects');
      closeSheet();
      return;
    }
    history.back();
    /* ⚠️ back() 한 번이 우리 항목으로 돌아간다는 보장이 없다.
       iframe 은 부모와 **세션 히스토리를 공유한다** — 상세를 바꿔 끼우거나 상세 문서가
       자기 안에서 이동하면 그 항목이 우리 항목 위에 쌓인다. 그러면 back() 은 iframe 만
       되돌리고 부모 주소·시트는 그대로다: 닫기를 눌러도 아무 일이 안 일어나 보이고
       두 번 눌러야 닫혔다. iframe 을 src 마다 새로 만들어(key) 항목이 쌓이지 않게
       했지만, 상세 문서 안의 이동까지는 우리가 못 막으므로 안전망을 남긴다. */
    if (closeFallback.current) clearTimeout(closeFallback.current);
    closeFallback.current = setTimeout(() => {
      closeFallback.current = null;
      if (!showing.current) return; // popstate 가 이미 제대로 닫았다
      history.replaceState(null, '', '/projects');
      closeSheet();
    }, CLOSE_FALLBACK_MS);
  }, [closeSheet]);

  /* 상세(iframe)가 보내오는 신호 — public/portfolio/_shared/bridge.js.
     sandbox iframe 의 origin 은 'null' 이라 origin 으로 못 거른다. 우리가 아는 모양의
     메시지만 받고, 좌표 같은 값은 커서 위치에만 쓰므로 위험한 입력이 아니다. */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as {
        pdReady?: boolean;
        ownClose?: boolean;
        pdClose?: boolean;
        pdEsc?: boolean;
      } | null;
      if (!d || typeof d !== 'object') return;
      // 상세가 자기 닫기 버튼을 갖고 있으면 우리 X 를 숨긴다 (닫기가 두 개로 보이지 않게)
      if (d.pdReady) {
        setOwnClose(!!d.ownClose);
        /* 상세의 Copy URL 이 쓸 공유 주소를 알려 준다. iframe 안에서는 location 이
           /portfolio/<슬러그>/… 라 그대로 복사하면 목록을 거치지 않는 내부 경로가 된다. */
        const w = (e.source as Window | null) ?? null;
        w?.postMessage({ pdShareUrl: location.href }, '*');
      }
      // 상세의 닫기를 눌렀다. sandbox 라 iframe 이 스스로 상위 이동을 못 한다 —
      // 가로채지 않으면 iframe 안에서 목록 페이지가 열려 버린다.
      if (d.pdClose) requestClose();
      /* 상세 안에서 누른 ESC. 키 이벤트는 프레임 경계를 넘지 않으므로, 본문을 한 번이라도
         클릭해 포커스가 iframe 으로 넘어가면 아래 keydown 리스너에는 영영 안 온다. */
      if (d.pdEsc) requestClose();
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [requestClose]);

  /* 시트가 올라오면 뒤쪽 목록의 스크롤을 잠근다 */
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [open, lockScroll]);

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
      const m = DETAIL_PATH.exec(location.pathname);
      const detail = m ? cards.find((c) => c.id === decodeURIComponent(m[1]))?.detail ?? null : null;
      if (!detail) {
        closeSheet();
        return;
      }
      /* 되짚어 나오는 길에 이미 띄워 둔 상세를 다시 만났다 — 다시 올리지 않는다.
         (openSheet 의 가드가 어차피 막지만, 여기가 그 상황이 실제로 생기는 자리다) */
      if (showing.current === detail) return;
      openSheet(detail, null);
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


  useEffect(() => () => {
    stopTrickle();
    if (guard.current) clearTimeout(guard.current);
    if (slideOut.current) clearTimeout(slideOut.current);
    if (closeFallback.current) clearTimeout(closeFallback.current);
    // 언마운트되는데 클래스가 남으면 목록이 영영 안 눌린다
    document.documentElement.classList.remove('ps-open', 'ps-busy');
  }, [stopTrickle]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ⚠️ transform 은 JSX style 에 두지 않는다 — rAF 로 매 프레임 쓰는 값이라
          다른 state 로 리렌더가 한 번 일어나면 그때마다 0 으로 되돌아간다.
          CSS(.ps-bar)가 이미 scaleX(0) 으로 시작시킨다. */}
      <div className="ps-bar" ref={barRef} aria-hidden="true" style={{ opacity: barOn ? 1 : 0 }} />
      <div
        id="project-sheet"
        className={`ps-sheet${open ? ' is-open' : ''}${ownClose ? ' is-own-close' : ''}`}
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
        {/* ⚠️ .ps-scroll 은 더 이상 스크롤하지 않는다 — 스크롤은 iframe 안에서 일어난다.
            여기서는 iframe 이 height:100% 를 풀 수 있도록 확정 높이를 주는 역할만 한다. */}
        <div className="ps-scroll" style={{ overflow: 'hidden' }}>
          <div
            className={`ps-body${loaded ? ' is-loaded' : ''}`}
            style={{ height: '100%' }}
          >
            {src ? (
              /* ⚠️ key={src} — src 를 갈아끼우지 않고 iframe 요소를 새로 만든다.
                 iframe 은 부모와 세션 히스토리를 공유해서, 살아 있는 iframe 의 src 를
                 바꾸면 그게 히스토리 항목으로 쌓인다(실측: history.length +1). 그러면
                 닫기의 back() 이 iframe 만 되돌리고 시트는 안 닫힌다 — 두 번 눌러야 했다.
                 새로 만든 iframe 의 첫 로드는 항목을 만들지 않는다(replace 취급).
                 같은 src 면 key 도 같아 재마운트되지 않으므로, 같은 상세를 다시 열 때
                 로딩 없이 바로 올라오는 캐시는 그대로다. */
              <iframe
                key={src}
                src={src}
                title="프로젝트 상세"
                sandbox="allow-scripts"
                onLoad={() => {
                  const mine = seq.current;
                  const loadedSrc = src;
                  stopTrickle();
                  bar.current.real = 1;
                  bar.current.onFull = () => {
                    if (mine !== seq.current) return; // 그 사이 닫혔다면 올리지 않는다
                    ready.current = loadedSrc; // 다음에 같은 상세를 열면 로딩을 건너뛴다
                    reveal();
                  };
                  barKick();
                }}
                style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

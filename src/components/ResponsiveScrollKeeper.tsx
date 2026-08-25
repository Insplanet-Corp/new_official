'use client';

import { useEffect } from 'react';

/* 창 폭이 1024 경계를 넘을 때 **보고 있던 챕터를 그대로 유지**한다.

   왜 필요한가 —
   한 라우트가 PC/모바일 마크업을 둘 다 들고 CSS 로만 가르므로(34번), 경계를 넘는 순간
   문서 높이가 통째로 달라진다. 브라우저는 스크롤을 px 로만 기억하기 때문에 "Our Projects
   를 보다가 창을 줄였더니 엉뚱한 데" 가 된다. 문서가 짧아지는 방향이면 스크롤이 바닥으로
   잘리기까지 한다.

   방법 — 챕터 짝을 알고 있으므로, 스크롤할 때마다 "몇 번째 챕터의 몇 % 지점" 인지를
   기록해 두고 경계를 넘은 뒤 반대편 챕터의 같은 지점으로 즉시 옮긴다.

   ⚠️ 기록은 **모드별로 따로** 둔다. 레이아웃이 바뀐 직후에도 scroll 이벤트가 한 번 더
      들어올 수 있는데, 그게 하나뿐인 기록을 덮으면 복원할 값이 사라진다. 넘어간 뒤에는
      "방금 떠나온 모드" 의 기록만 읽으므로 그 경합에 영향을 받지 않는다. */

/** [PC 선택자, 모바일 선택자] — 위에서 아래 순서(문서 순서)로. 없는 페이지의 짝은 그냥 건너뛴다. */
const PAIRS: readonly (readonly [string, string])[] = [
  // 홈 챕터 (styles/home-responsive.css 가 감추는 목록과 같은 짝)
  ['.pin-beyond', '.m-beyond-pin'],
  ['.pin-insight', '.m-insight-pin'],
  ['.services', '.m-svc'],
  ['.partners', '.m-partners'],
  ['.projects', '.m-proj'],
  ['.contact-cta', '.m-cta'],
  // about·contact·projects 는 트리 하나씩이다 — 챕터 단위가 아니라 페이지 비율로 맞춘다
  ['main.about', '.m-about'],
  ['main.contact', '.m-contact'],
  ['main.pj', '.m-projects'],
  // 푸터는 마지막. PC 푸터는 모바일 푸터가 있는 페이지에서만 숨으므로 짝이 성립한다
  ['.footer', '.m-footer'],
] as const;

type Span = { top: number; h: number };
/** i = PAIRS 인덱스, -1 = 첫 챕터보다 위(= 히어로, PC/모바일이 DOM 을 공유한다) */
type Anchor = { i: number; p: number };

const DESKTOP = '(min-width: 1024px)';

/** 지금 화면에 실제로 그려지는 쪽을 고른다 — 어느 모드인지 따로 안 물어봐도 된다 */
function visible(sel: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(sel);
  return el && el.offsetHeight > 0 ? el : null;
}

/** 지금 보이는 챕터들의 문서 좌표. 없는 짝은 null 로 남겨 인덱스를 유지한다 */
function measure(): (Span | null)[] {
  const y = scrollY;
  return PAIRS.map(([d, m]) => {
    const el = visible(d) ?? visible(m);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + y, h: r.height };
  });
}

function readAnchor(spans: (Span | null)[]): Anchor | null {
  const y = scrollY;
  let first: Span | null = null;
  for (let i = 0; i < spans.length; i++) {
    const s = spans[i];
    if (!s || s.h <= 0) continue;
    if (!first) first = s;
    if (y >= s.top && y < s.top + s.h) return { i, p: (y - s.top) / s.h };
  }
  // 첫 챕터 위(히어로)면 그 구간의 비율로 기억한다
  if (first && y < first.top) return { i: -1, p: first.top > 0 ? y / first.top : 0 };
  return null;
}

function targetY(a: Anchor, spans: (Span | null)[]): number | null {
  if (a.i === -1) {
    const first = spans.find((s): s is Span => !!s && s.h > 0);
    return first ? first.top * a.p : null;
  }
  const s = spans[a.i];
  if (!s || s.h <= 0) return null;
  return s.top + a.p * s.h;
}

export default function ResponsiveScrollKeeper() {
  useEffect(() => {
    const mq = matchMedia(DESKTOP);
    // 모드별 마지막 기록 ('pc' | 'm')
    const saved: Record<string, Anchor | null> = { pc: null, m: null };
    const mode = () => (mq.matches ? 'pc' : 'm');

    let ticking = false;
    const record = () => {
      ticking = false;
      const a = readAnchor(measure());
      if (a) saved[mode()] = a;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(record);
    };
    // 리사이즈 중에도 기록을 갱신한다 — 경계를 넘기 직전의 값이 복원의 기준이 된다
    let wasDesktop = mq.matches;

    let timers: number[] = [];
    const stopPasses = () => {
      for (const t of timers) clearTimeout(t);
      timers = [];
    };

    /* ⚠️ 경계를 넘기 전에 PC "Our Projects" 챕터의 **스크롤 잠금**부터 푼다.

       main.js 의 그 챕터는 섹션이 화면을 채우면 `locked=true` 로 들어가서 wheel 을
       preventDefault 하고(비-passive 리스너다) Lenis 를 stop 시킨 뒤, 휠 한 번에 프로젝트
       한 장씩만 넘긴다. 그런데 그 IIFE 에는 **resize 처리가 없다** — 잠긴 채로 창을 1024
       아래로 줄이면 `.projects` 가 display:none 이 되어 화면에서 사라지는데도 잠금은 그대로
       남아, 모바일 화면에서 **휠이 통째로 먹히고 스크롤이 죽는다**(실측: vw 900 에서
       cancelable wheel 이 계속 preventDefault 됨). 창을 키웠다 줄였다 하다 보면 걸리는
       "갑자기 스크롤이 안 되는" 증상이 이것이다.

       `__projUnlock` 은 main.js 가 로고("맨 위로")를 위해 이미 노출해 둔 하드 릴리스다 —
       잠겨 있지 않으면 아무 것도 하지 않으므로 양방향에서 그냥 부르면 된다.
       .projects 가 없는 라우트에서는 정의되지 않으므로 옵셔널 호출이다.
       (이 잠금은 아래 jump() 도 무력화한다 — 잠긴 동안 main.js 의 onScroll 이 섹션
        상단으로 되돌려 버린다. 그래서 어차피 여기서 먼저 풀어야 한다.) */
    const releaseChapterLock = () => {
      (window as Window & { __projUnlock?: () => void }).__projUnlock?.();
    };

    const jump = (a: Anchor) => {
      const lenis = (
        window as Window & { __lenis?: { scrollTo: (y: number, o?: object) => void; resize?: () => void } }
      ).__lenis;
      /* ⚠️ Lenis 에게 먼저 치수를 다시 재게 한다. Lenis 는 스크롤 목표를 **자기가 캐시한
         limit** 으로 자르는데, 그 값은 ResizeObserver→rAF 로 늦게 갱신된다. 그대로 두면
         모바일 문서 높이 기준으로 잘려서 목표보다 위에 멈춘다(실측: 12199 요청 → 12028). */
      lenis?.resize?.();
      const y = targetY(a, measure());
      if (y == null) return;
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const to = Math.max(0, Math.min(y, max));
      // main.js 67 번 줄과 같은 방식 — Lenis 가 있으면 그쪽으로 가야 관성 값까지 같이 리셋된다
      if (lenis) lenis.scrollTo(to, { immediate: true, force: true });
      else scrollTo(0, to);
      /* 옮긴 자리를 새 모드의 기록으로 남긴다 — 스크롤 없이 곧바로 경계를 되넘어도
         돌아갈 지점이 있어야 한다(scroll 이벤트를 기다리면 그 사이가 빈다). */
      record();
    };

    /* ⚠️ matchMedia 의 change 이벤트만 믿지 않는다. resize 로도 같은 판정을 하고
       wasDesktop 가드로 한 번만 복원한다 — 두 이벤트가 다 와도 두 번 뛰지 않는다. */
    const onChange = () => {
      const nowDesktop = mq.matches;
      if (nowDesktop === wasDesktop) {
        record(); // 경계를 안 넘었으면 기록만 갱신 (리사이즈로 높이가 조금씩 달라진다)
        return;
      }
      wasDesktop = nowDesktop;
      // TEMP A/B: releaseChapterLock();
      const from = nowDesktop ? 'm' : 'pc'; // 방금 떠나온 쪽
      const a = saved[from];
      if (!a) return;
      jump(a);
      /* ⚠️ 한 번으로는 부족하다 — change 시점엔 새 레이아웃의 높이가 아직 확정되지 않는다
         (Lenis 가 자기 치수를 다시 재기 전이고, 이미지·폰트가 늦게 앉기도 한다).
         같은 앵커로 두 번 더 맞춘다. 사용자가 직접 스크롤을 시작하면 즉시 그만둔다. */
      stopPasses();
      timers = [
        setTimeout(() => jump(a), 0),
        setTimeout(() => jump(a), 160),
      ] as unknown as number[];
    };

    record();
    addEventListener('scroll', onScroll, { passive: true });
    for (const ev of ['wheel', 'touchstart', 'keydown'] as const)
      addEventListener(ev, stopPasses, { passive: true });
    mq.addEventListener('change', onChange);
    addEventListener('resize', onChange);
    return () => {
      stopPasses();
      removeEventListener('scroll', onScroll);
      for (const ev of ['wheel', 'touchstart', 'keydown'] as const)
        removeEventListener(ev, stopPasses);
      mq.removeEventListener('change', onChange);
      removeEventListener('resize', onChange);
    };
  }, []);

  return null;
}

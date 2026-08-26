'use client';

import { useEffect, useRef, useState } from 'react';
import Lines from '@/components/Lines';
import type { ShowcaseItem } from '@/data/home';

/* Chapter 06 (mobile): Our Projects — 가로 스와이프 캐러셀.

   PC 챕터(main.js)와 달리 스크롤 잠금이 없다. 트랙을 손가락으로 밀면 그 scrollLeft 로
   현재 카드를 정하고, 닷과 아래 정보 슬라이드를 같이 바꾼다.

   ⚠️ 현재 카드는 index * width 로 계산하지 않는다 — 카드 사이 12px gap 때문에 어긋난다.
      각 카드의 offsetLeft 로 제일 가까운 것을 고른다(정적 사이트와 같은 방식).
   ⚠️ offsetLeft 는 offsetParent(.m-proj) 기준이라 첫 카드가 섹션의 20px 거터에서
      시작한다. 그 값을 빼서 트랙의 실제 스크롤 좌표로 맞춘다. */
export default function MobileProjects({ items }: { items: ShowcaseItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  /** 지금 화면에 있는 카드 — 닷과 아래 정보 슬라이드를 고른다 (스크롤이 진실) */
  const [active, setActive] = useState(0);

  /* 화살표가 "다음에 갈 곳" 을 세는 기준. active 를 그대로 쓰면 안 된다 —
     scrollTo({behavior:'smooth'}) 는 400ms 가량 걸리는데 active 는 그게 끝나야
     갱신되므로, 연타하면 두 번째 클릭이 **같은 카드**를 다시 요청한다(실제로 겪음).
     그래서 목표는 따로 들고, 스크롤이 **멎은 뒤에만** 실제 위치로 맞춘다
     (부드러운 스크롤이 지나가는 중간 카드로 목표가 되감기지 않게). */
  const [target, setTarget] = useState(0);
  const targetRef = useRef(0);
  const setTargetBoth = (i: number) => {
    targetRef.current = i;
    setTarget(i);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = [...track.querySelectorAll<HTMLElement>('.m-proj-card')];
    if (!cards.length) return;
    const base = cards[0].offsetLeft;

    let ticking = false;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        let best = 0;
        let bestD = Infinity;
        cards.forEach((c, i) => {
          const d = Math.abs(c.offsetLeft - base - track.scrollLeft);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setActive(best);
        if (settle) clearTimeout(settle);
        settle = setTimeout(() => setTargetBoth(best), 140);
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (settle) clearTimeout(settle);
    };
  }, [items.length]);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = [...track.querySelectorAll<HTMLElement>('.m-proj-card')];
    if (!cards[i]) return;
    setTargetBoth(i);
    track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
  };

  /* 마우스로도 넘길 수 있게 좌우 화살표를 둔다 — 손가락으로는 트랙을 밀면 되지만
     포인터에는 그런 수단이 없었다. 캐러셀에 호버할 때만 나타나고(style.css 의 :hover),
     터치 기기에서는 @media (hover:hover) 밖이라 아예 그려지지 않는다. */
  const last = items.length - 1;
  const step = (dir: 1 | -1) => goTo(Math.max(0, Math.min(last, targetRef.current + dir)));

  return (
    <section className="m-proj">
      <h2 className="m-proj-title">Our Projects</h2>
      <div className="m-proj-carousel">
        {/* data-lenis-prevent: 가로 스와이프를 Lenis 가 세로 스크롤로 먹지 않게 한다 */}
        <div className="m-proj-track" data-lenis-prevent ref={trackRef}>
          {items.map((p, i) => {
            // src="" 는 현재 페이지를 다시 받아온다 — 비어 있으면 아예 그리지 않는다
            const art = p.image ? (
              <img
                src={p.image}
                alt={`${p.name.join(' ')}${p.client ? ` — ${p.client}` : ''}`}
                loading="lazy"
                draggable={false}
              />
            ) : null;
            /* 상세가 등록된 카드만 링크가 된다. 클릭을 시트로 바꾸는 것은 여기가 아니라
               ProjectSheet 다 — document 클릭에서 a[href^="/projects/"] 를 가로챈다
               (/projects 목록·PC 패널과 완전히 같은 경로).
               ⚠️ draggable=false — 안 주면 마우스로 트랙을 밀 때 브라우저의 링크 끌기가
               먼저 잡혀서 가로 스크롤이 안 된다. */
            return p.href ? (
              <a
                className="m-proj-card"
                style={{ background: p.background }}
                href={p.href}
                draggable={false}
                aria-label={`${p.name.join(' ')} 프로젝트 상세 보기`}
                key={i}
              >
                {art}
              </a>
            ) : (
              <div className="m-proj-card" style={{ background: p.background }} key={i}>
                {art}
              </div>
            );
          })}
        </div>
        {/* ⚠️ 화살표는 카드 바깥(.m-proj-carousel 직속)에 둔다 — 카드 안에 넣으면
            Cursor.tsx 의 VIEW_SEL(.m-proj-card)에 걸려 화살표 위에서도 "View Project"
            커서가 뜬다. */}
        <button
          type="button"
          className="m-proj-nav m-proj-nav--prev"
          onClick={() => step(-1)}
          disabled={target === 0}
          aria-label="이전 프로젝트"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="m-proj-nav m-proj-nav--next"
          onClick={() => step(1)}
          disabled={target === last}
          aria-label="다음 프로젝트"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="m-proj-dots" aria-hidden="true">
          {items.map((_, i) => (
            <span
              className={i === active ? 'is-active' : undefined}
              key={i}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
      <div className="m-proj-info">
        {items.map((p, i) => (
          <article className={i === active ? 'm-proj-slide is-active' : 'm-proj-slide'} key={i}>
            <h3 className="m-proj-name">
              <Lines text={p.name} />
            </h3>
            {/* 값이 없으면 <dt>만 남아 라벨이 덩그러니 보이므로 줄째로 뺀다 (PC 와 같다) */}
            <dl className="m-proj-meta">
              {p.client ? (
                <>
                  <dt>Client</dt>
                  <dd>{p.client}</dd>
                </>
              ) : null}
              {p.launch ? (
                <>
                  <dt>Launch</dt>
                  <dd>{p.launch}</dd>
                </>
              ) : null}
            </dl>
          </article>
        ))}
      </div>
      <a className="m-proj-more" href="/projects">
        <span>See More Projects</span>
        <span className="m-proj-more-ico">
          <img src="/assets/icon_arrow_more.svg" alt="" />
        </span>
      </a>
    </section>
  );
}

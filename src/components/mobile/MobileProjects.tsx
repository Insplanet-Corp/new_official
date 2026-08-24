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
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = [...track.querySelectorAll<HTMLElement>('.m-proj-card')];
    if (!cards.length) return;
    const base = cards[0].offsetLeft;

    let ticking = false;
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
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [items.length]);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = [...track.querySelectorAll<HTMLElement>('.m-proj-card')];
    if (!cards[i]) return;
    track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
  };

  return (
    <section className="m-proj">
      <h2 className="m-proj-title">Our Projects</h2>
      <div className="m-proj-carousel">
        {/* data-lenis-prevent: 가로 스와이프를 Lenis 가 세로 스크롤로 먹지 않게 한다 */}
        <div className="m-proj-track" data-lenis-prevent ref={trackRef}>
          {items.map((p, i) => (
            <div className="m-proj-card" style={{ background: p.background }} key={i}>
              {/* src="" 는 현재 페이지를 다시 받아온다 — 비어 있으면 아예 그리지 않는다 */}
              {p.image ? <img src={p.image} alt="" loading="lazy" /> : null}
            </div>
          ))}
        </div>
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, revealOnScroll } from '@/lib/dom';
import useMagneticCards from '@/lib/hooks/useMagneticCards';
import {
  CATEGORIES,
  ONGOING_ROWS,
  PROJECT_CARDS,
  type Category,
} from '@/data/projectsPage';

type Status = 'done' | 'ongoing';

/* Filter bar + the two status panels (완료 grid / 진행중 table).
   The chips do a visual active-switch and filter by category; only the 완료/진행중 toggle swaps
   panels. The card data itself — which projects exist, newest-first — is rendered by the publisher
   from the DB; PROJECT_CARDS is the seeded dummy set. */
export default function ProjectsExplorer() {
  const [status, setStatus] = useState<Status>('done');
  const [filter, setFilter] = useState<Category>('all');
  const gridRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useMagneticCards(gridRef, '.pj-card');

  // Reveal: the FIRST ROW plays its sequential rise on load (no scroll needed); the filter bar and
  // every card from row 2 on reveals on scroll-in. Per-column transition-delay staggers L→R.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
    const allCards = [...grid.querySelectorAll<HTMLElement>('.pj-card')];
    const firstRow = allCards.slice(0, cols); // the visible first row, whatever the column count
    const onScroll: Element[] = [
      ...(filterRef.current?.querySelectorAll('.pj-cat, .pj-toggle') ?? []),
      ...allCards.slice(cols),
    ];

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      [...firstRow, ...onScroll].forEach((el) => el.classList.add('in'));
      return;
    }
    // commit the from-below start state (force reflow) then add .in, so the rise plays on load
    void document.body.offsetHeight;
    firstRow.forEach((el) => el.classList.add('in'));
    return revealOnScroll(onScroll, 0.18);
  }, []);

  const pickStatus = (next: Status) => {
    setStatus(next);
    // 진행중 has no category filter — the lone ALL chip must read as selected, and the (hidden)
    // 완료 grid resets to All so it matches when you switch back.
    if (next === 'ongoing') setFilter('all');
  };

  const pickFilter = (next: Category) => {
    setFilter(next);
    // a card filtered into view shouldn't sit at its pre-reveal opacity
    gridRef.current?.querySelectorAll<HTMLElement>('.pj-card').forEach((card) => {
      if (next === 'all' || card.dataset.category === next) card.classList.add('in');
    });
  };

  return (
    <>
      <section className={status === 'ongoing' ? 'pj-filter is-ongoing' : 'pj-filter'}>
        <div className="pj-inner pj-filter-inner" ref={filterRef}>
          <div className="pj-cats" role="tablist" aria-label="카테고리">
            {CATEGORIES.map((c) => (
              <button
                key={c.filter}
                type="button"
                className={filter === c.filter ? 'pj-cat is-active' : 'pj-cat'}
                data-filter={c.filter}
                onClick={() => pickFilter(c.filter)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div
            className={status === 'ongoing' ? 'pj-toggle is-ongoing' : 'pj-toggle'}
            role="group"
            aria-label="상태"
          >
            {(['done', 'ongoing'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={status === s ? 'pj-status is-active' : 'pj-status'}
                data-status={s}
                onClick={() => pickStatus(s)}
              >
                {s === 'done' ? '완료' : '진행중'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 완료 — card grid */}
      <section className="pj-list" data-status-panel="done" hidden={status !== 'done'}>
        <div className="pj-inner pj-grid" ref={gridRef}>
          {PROJECT_CARDS.map((card) => (
            <article
              className="pj-card"
              data-category={card.category}
              key={card.id}
              hidden={filter !== 'all' && card.category !== filter}
            >
              <img
                className="pj-card-img"
                src={card.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <div className="pj-card-over">
                {card.award ? (
                  <img
                    className="pj-card-award"
                    src="/assets/projects/wa-symbol.png"
                    alt="수상"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="pj-card-info">
                  <span className="pj-card-cat">{card.cat}</span>
                  <h3 className="pj-card-name">
                    {card.name[0]}
                    <br />
                    {card.name[1]}
                  </h3>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 진행중 — 고객사 / 프로젝트명 / 분류 / 수행기간 */}
      <section className="pj-list" data-status-panel="ongoing" hidden={status !== 'ongoing'}>
        <div className="pj-inner">
          <div className="pj-table">
            <div className="pj-thead">
              <div className="pj-th">고객사</div>
              <div className="pj-th">프로젝트명</div>
              <div className="pj-th">분류</div>
              <div className="pj-th">수행기간</div>
            </div>
            {ONGOING_ROWS.map((row, i) => (
              <div className="pj-tr" key={`${row.project}-${i}`}>
                <div className="pj-td">
                  <span className="pj-logo">
                    <img src={row.logo} alt={row.client} loading="lazy" />
                  </span>
                </div>
                <div className="pj-td">{row.project}</div>
                <div className="pj-td">{row.category}</div>
                <div className="pj-td">{row.period}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

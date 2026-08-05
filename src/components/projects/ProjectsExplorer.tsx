'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, revealOnScroll } from '@/lib/dom';
import useMagneticCards from '@/lib/hooks/useMagneticCards';
import {
  CATEGORIES,
  type Category,
  type OngoingRow,
  type ProjectCard,
} from '@/data/projectsPage';

type Status = 'done' | 'ongoing';

/* Filter bar + the two status panels (완료 grid / 진행중 table).
   The chips do a visual active-switch and filter by category; only the 완료/진행중 toggle swaps
   panels.

   ⚠️ Cards arrive as PROPS, fetched on the server (app/projects/page.tsx). They must exist in the
   DOM at mount: the reveal effect below counts `.pj-card` once, on mount, to work out the first
   row. Fetch them client-side instead and the effect sees an empty grid — no card ever gets `.in`
   and the whole thing stays at opacity:0. */
export default function ProjectsExplorer({
  cards,
  ongoingRows,
}: {
  cards: ProjectCard[];
  ongoingRows: OngoingRow[];
}) {
  const [status, setStatus] = useState<Status>('done');
  const [filter, setFilter] = useState<Category>('all');
  const [barIn, setBarIn] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useMagneticCards(gridRef, '.pj-card');

  // Reveal: the FIRST ROW plays its sequential rise on load (no scroll needed); the filter bar and
  // every card from row 2 on reveals on scroll-in. Per-column transition-delay staggers L→R.
  //
  // ⚠️ The bar's reveal is React state (`barIn`), NOT a hand-added `.in` class like the cards'.
  // Its chips and toggle re-render on every click, and React rewrites their whole className from
  // the JSX — an imperatively added class is wiped the instant you press 완료/진행중, leaving the
  // bar stuck at its pre-reveal opacity:0 forever (the IO has already unobserved).
  // The cards can stay imperative only because their className is a constant string.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
    const allCards = [...grid.querySelectorAll<HTMLElement>('.pj-card')];
    const firstRow = allCards.slice(0, cols); // the visible first row, whatever the column count
    const onScroll: Element[] = allCards.slice(cols);

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      [...firstRow, ...onScroll].forEach((el) => el.classList.add('in'));
      setBarIn(true);
      return;
    }
    // commit the from-below start state (force reflow) then add .in, so the rise plays on load
    void document.body.offsetHeight;
    firstRow.forEach((el) => el.classList.add('in'));
    const stopCards = revealOnScroll(onScroll, 0.18);

    const bar = filterRef.current;
    if (!bar) return stopCards;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setBarIn(true);
        io.disconnect();
      },
      { threshold: 0.18 },
    );
    io.observe(bar);
    return () => {
      stopCards();
      io.disconnect();
    };
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
                className={`pj-cat${barIn ? ' in' : ''}${filter === c.filter ? ' is-active' : ''}`}
                data-filter={c.filter}
                onClick={() => pickFilter(c.filter)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div
            className={`pj-toggle${barIn ? ' in' : ''}${status === 'ongoing' ? ' is-ongoing' : ''}`}
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
          {cards.map((card) => (
            <article
              className="pj-card"
              data-category={card.category}
              key={card.id}
              hidden={filter !== 'all' && card.category !== filter}
            >
              {/* 썸네일이 비어 있으면 <img src=""> 가 현재 페이지를 다시 받아온다 */}
              {card.image ? (
                <img
                  className="pj-card-img"
                  src={card.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
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
                    {/* 프로젝트명의 \n 이 여기서 <br> 이 된다 */}
                    {card.lines.map((line, i) => (
                      <Fragment key={i}>
                        {i > 0 ? <br /> : null}
                        {line}
                      </Fragment>
                    ))}
                  </h3>
                </div>
              </div>
              {/* 카드 전체를 덮는 링크. <article> 을 <a> 로 바꾸지 않는 이유는
                  .pj-card 를 레거시 Cursor.tsx 가 잡고 있고, projects.css 가
                  블록 요소를 전제로 크기를 주기 때문이다. */}
              {card.href ? (
                <a
                  href={card.href}
                  aria-label={`${card.lines.join(' ')} 상세 보기`}
                  style={{ position: 'absolute', inset: 0, zIndex: 3 }}
                />
              ) : null}
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
            {ongoingRows.map((row) => (
              <div className="pj-tr" key={row.id}>
                <div className="pj-td">
                  <span className="pj-logo">
                    {/* 고객사명 텍스트 필드는 기획서에 없다 — alt 는 프로젝트명으로 채운다 */}
                    {row.logo ? (
                      <img src={row.logo} alt={row.project} loading="lazy" />
                    ) : null}
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

'use client';

import { useEffect, useRef, useState } from 'react';
import MobileFooter from '@/components/mobile/MobileFooter';
import {
  CATEGORIES,
  type Category,
  type OngoingRow,
  type ProjectCard,
} from '@/data/projectsPage';
import { afterFonts, prefersReducedMotion, revealOnScroll } from '@/lib/dom';
import { LOGO_RENDER, cardSrc, cardSrcSet, storageRender } from '@/lib/images';
import { flushLeftLogo } from '@/lib/logoTrim';

/* Projects 의 모바일 화면 (Figma official_05_projects_01_375 · node 2489:51127,
   진행중 패널은 official_05_projects_02_375 · node 2588:45051).

   마크업·수치는 정적 사이트 mobile-projects.html 을 그대로 옮겼다 — 퍼블리셔가 같은
   Figma 로 만든 것이라 다시 해석하는 것보다 정확하다. CSS(.mp-*)는 이미 style.css 에
   들어와 있다(14번에서 style.css 를 통째로 흡수할 때 같이 왔다).

   ⚠️ 정적 사이트와 다른 점 — 카드가 더미가 아니라 PC 그리드와 **같은 DB 데이터**다.
      cards/ongoingRows 를 props 로 받는다(조회는 app/projects/page.tsx 서버에서 한 번).
      정적 사이트의 project-sheet.js 도 쓰지 않는다 — 카드에 PC 와 같은
      <a href="/projects/<id>"> 를 깔면 ProjectSheet 가 document 클릭을 가로채 시트를
      올린다. 시트는 body 로 portal 되므로 PC 트리가 display:none 이어도 살아 있다.

   ⚠️ 컴포넌트를 MobileProjects 로 부르지 않는다 — 그 이름은 홈의 프로젝트 캐러셀이 쓴다. */

/** 카드 폭 = (100vw - 좌우 20*2 - 열 간격 8) / 2. .mp-grid-section 의 padding·gap 과 같아야 한다 */
const MP_CARD_SIZES = 'calc((100vw - 48px) / 2)';

type Status = 'done' | 'ongoing';

export default function MobileProjectsPage({
  cards,
  ongoingRows,
}: {
  cards: ProjectCard[];
  ongoingRows: OngoingRow[];
}) {
  const [status, setStatus] = useState<Status>('done');
  const [filter, setFilter] = useState<Category>('all');
  const [heroIn, setHeroIn] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const ongoingRef = useRef<HTMLDivElement>(null);

  /* 히어로 로드 리빌 — 세리프 웹폰트를 기다렸다가 켠다(최종 글리프로 blur 가 풀리도록).
     ⚠️ 카드와 달리 클래스를 손으로 붙이지 않고 state 로 둔다. .mp-hero 안의 필터바가
        클릭마다 리렌더되는데, 그때 React 가 JSX 의 className 을 그대로 다시 쓰므로
        손으로 붙인 .in 은 완료/진행중을 누르는 순간 지워진다 — PC 필터바(barIn)가
        같은 이유로 state 다. */
  useEffect(() => afterFonts(() => setHeroIn(true)), []);

  /* 그리드 리빌 — PC .pj-grid 와 같은 방식. 첫 행(2장)은 로드와 함께 올라오고
     2행부터는 스크롤로 들어올 때 켠다. 카드의 className 은 상수라(필터는 hidden
     속성만 바꾼다) 여기서는 손으로 .in 을 붙여도 지워지지 않는다. */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const all = [...grid.querySelectorAll<HTMLElement>('.mp-card')];
    const cols = 2; // .mp-grid-section 는 2열 고정이다
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      all.forEach((c) => c.classList.add('in'));
      return;
    }
    void document.body.offsetHeight; // 시작 상태를 커밋한 뒤 첫 행의 트랜지션을 태운다
    all.slice(0, cols).forEach((c) => c.classList.add('in'));
    return revealOnScroll(all.slice(cols), 0.18);
  }, []);

  const pickStatus = (next: Status) => {
    setStatus(next);
    /* 진행중에는 카테고리 필터가 없다(Figma 에서 All 칩이 40% 로 죽어 있다).
       완료로 돌아왔을 때 숨은 그리드와 칩 라벨이 어긋나지 않도록 All 로 되돌린다. */
    if (next === 'ongoing') setFilter('all');
  };

  const pickFilter = (next: Category) => {
    setFilter(next);
    /* 필터로 들어온 카드가 리빌 전 상태(opacity:0)로 남지 않게 한다 — 화면 아래에 있어
       IO 임계치를 한 번도 넘지 않은 카드는 "보이는데 안 보이는" 상태가 된다. */
    gridRef.current?.querySelectorAll<HTMLElement>('.mp-card').forEach((card) => {
      if (next === 'all' || card.dataset.category === next) card.classList.add('in');
    });
  };

  const ongoing = status === 'ongoing';

  /* 진행중 카드의 고객사 CI 를 상자 왼쪽 끝에 붙인다 — CI 파일마다 다른 투명 여백을 재서
     그만큼 밀어낸다. 왜 CSS 만으로는 안 되는지는 lib/logoTrim.ts 주석에 있다.
     ⚠️ 상자가 실제로 그려진 뒤여야 잰다. 이 패널은 ① ≥1024 에서 display:none 이고
        ② 완료 탭에서는 hidden 이라 clientWidth 가 0 인 때가 있다. 그래서 마운트 한 번으로
        끝내지 않고 패널이 열릴 때·폭이 바뀔 때·이미지가 늦게 도착할 때 다시 부른다
        (loading="lazy" 라 패널을 처음 열어야 비로소 받는 이미지가 있다). */
  useEffect(() => {
    const root = ongoingRef.current;
    if (!root) return;
    const logos = [...root.querySelectorAll<HTMLImageElement>('.mp-ocard-logo')];
    const run = () => logos.forEach(flushLeftLogo);
    run();
    logos.forEach((img) => img.addEventListener('load', run));
    window.addEventListener('resize', run);
    return () => {
      logos.forEach((img) => img.removeEventListener('load', run));
      window.removeEventListener('resize', run);
    };
  }, [ongoing, ongoingRows]);

  return (
    <div className="m-projects ct-rv">
      <section className={heroIn ? 'mp-hero in' : 'mp-hero'}>
        <div className="mp-head">
          <img className="mp-symbol" src="/assets/symbol.svg" alt="" />
          <h1 className="mp-title">
            <span className="mp-title-lines">
              <span className="mp-t1">Our</span>
              <span className="mp-t2">
                Projects
                <i className="mp-dot" aria-hidden="true" />
              </span>
            </span>
          </h1>
        </div>
        <div className="mp-sub">
          <p className="mp-sub-head">
            결과로 증명하는 것,
            <br />
            그것이 인스플래닛의 방식입니다.
          </p>
          <p className="mp-sub-body">
            눈에 보이는 화면을 넘어 비즈니스의 본질을 꿰뚫고,
            <br />
            정교한 전략과 기술로 고객의 문제를 실질적인 가치로
            <br />
            바꿔왔습니다.
          </p>
        </div>

        {/* 필터바: 왼쪽 카테고리 칩 + 오른쪽 완료/진행중 토글.
            ⚠️ 카테고리는 네이티브 <select> 를 칩 위에 투명하게 덮는다 — 그래야 탭했을 때
               iOS/Android 의 OS 기본 피커(바텀시트)가 열린다. 직접 만든 드롭다운보다
               좁은 화면에서 다루기 쉽다. */}
        <div className="mp-filter">
          <div className={ongoing ? 'mp-all is-disabled' : 'mp-all'}>
            <span className="mp-all-label">
              {CATEGORIES.find((c) => c.filter === filter)?.label}
            </span>
            <svg
              className="mp-all-ico"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 10L12.0008 14.58L17 10"
                stroke="#FFF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <select
              className="mp-all-select"
              aria-label="카테고리 필터"
              value={filter}
              disabled={ongoing}
              onChange={(e) => pickFilter(e.target.value as Category)}
            >
              {/* ⚠️ 선택지를 손으로 다시 적지 않는다 — PC 칩과 같은 CATEGORIES 에서 나온다.
                  값이 갈리면 필터가 아무것도 못 거른다(견적문의에서 겪은 사고와 같은 형태). */}
              {CATEGORIES.map((c) => (
                <option key={c.filter} value={c.filter}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div
            className={ongoing ? 'mp-toggle is-ongoing' : 'mp-toggle'}
            role="group"
            aria-label="상태"
          >
            {(['done', 'ongoing'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={status === s ? 'mp-status is-active' : 'mp-status'}
                data-status={s}
                aria-pressed={status === s}
                onClick={() => pickStatus(s)}
              >
                {s === 'done' ? '완료' : '진행중'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mp-grid-section" ref={gridRef}>
        {/* 완료 — 2열 카드 그리드. 카드에는 이미지만 있다(PC 와 달리 분류·프로젝트명
            오버레이가 없다 — Figma 그대로). */}
        <div className="mp-panel" data-status-panel="done" hidden={ongoing}>
          {cards.map((card) => (
            <article
              className="mp-card"
              data-category={card.category}
              key={card.id}
              hidden={filter !== 'all' && card.category !== filter}
            >
              {/* 썸네일이 비어 있으면 <img src=""> 가 현재 페이지를 다시 받아온다 */}
              {card.image ? (
                <img
                  src={cardSrc(card.image)}
                  srcSet={cardSrcSet(card.image)}
                  sizes={MP_CARD_SIZES}
                  /* 검색·AI 크롤러가 실적을 읽는 유일한 텍스트다 — PC 카드와 같은 규칙 */
                  alt={`${card.lines.join(' ')} 프로젝트 썸네일`}
                  /* ⚠️ loading="lazy" 를 빼지 말 것. ≥1024 에서 이 트리는 display:none 인데,
                     레이아웃 박스가 없는 lazy 이미지는 지연 대상으로 남아 아예 받지 않는다 —
                     PC 에서 모바일 썸네일을 통째로 내려받는 것을 이 한 줄이 막는다(34번). */
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              {/* 카드 전체를 덮는 링크. ProjectSheet 가 document 클릭에서 이 href 를 잡아
                  상세를 시트로 올린다 — 자바스크립트가 없으면 그대로 이동한다. */}
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

        {/* 진행중 — PC 표의 한 행이 카드 하나가 된다 (고객사 CI + 분류 / 프로젝트명 / 수행기간) */}
        <div
          className="mp-panel mp-list"
          data-status-panel="ongoing"
          hidden={!ongoing}
          ref={ongoingRef}
        >
          {ongoingRows.map((row) => (
            <article className="mp-ocard" key={row.id}>
              <div className="mp-ocard-top">
                {/* 고객사"명" 텍스트 필드는 기획서에 없다 — PC 와 같이 alt 를 프로젝트명으로 채운다 */}
                {row.logo ? (
                  <img
                    className="mp-ocard-logo"
                    src={storageRender(row.logo, LOGO_RENDER)}
                    alt={row.project}
                    /* ⚠️ 투명 여백을 캔버스로 재려면 필요하다 — 없으면 다른 출처라 캔버스가
                       오염돼 SecurityError 가 난다(15번 함정과 같은 뿌리). Storage 는
                       Access-Control-Allow-Origin: * 를 준다. */
                    crossOrigin="anonymous"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="mp-ocard-cat">{row.category}</span>
              </div>
              <h3 className="mp-ocard-name">{row.project}</h3>
              <p className="mp-ocard-period">{row.period}</p>
            </article>
          ))}
        </div>
      </section>

      <MobileFooter />
    </div>
  );
}

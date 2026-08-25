'use client';

import { useEffect, useRef } from 'react';
import MobileFooter from '@/components/mobile/MobileFooter';
import { clamp01, prefersReducedMotion, revealOnScroll } from '@/lib/dom';

/* About 의 모바일 화면 (Figma official_03_about_375 · node 2489:50521).

   마크업·수치는 정적 사이트 mobile-about.html 을 그대로 옮겼다 — 퍼블리셔가 같은 Figma 로
   만든 것이라 다시 해석하는 것보다 정확하다. CSS(.ma-*)는 이미 style.css 에 들어와 있다.

   ⚠️ 블랙홀 캔버스(#about-blackhole)는 여기서 그리지 않는다. about-blackhole.js 가
      getElementById 로 하나만 잡기 때문에 PC 히어로에 한 번만 두고 ResponsiveSlot 이
      .ma-banner 안으로 옮겨 준다. */

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 고정 헤더 글자색을 어두운 카드 위에서 흰색으로 뒤집는다 */
function setChrome(topOn: boolean, botOn: boolean) {
  const flip = (id: string, on: boolean) =>
    document.getElementById(id)?.classList.toggle('on-dark', on);
  flip('ci-logo', topOn);
  flip('lets-talk', topOn);
  flip('full-menu', topOn);
  flip('scroll-hint', botOn);
}

export default function MobileAbout() {
  const heroRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLElement>(null);

  /* 01 히어로 — 아래에 걸쳐 있던 블랙홀 카드가 스크롤을 따라 화면을 덮는다.
     ⚠️ vh 는 innerHeight 가 아니라 sticky 스테이지의 실제 높이를 쓴다. 모바일 주소창이
        보이는 동안 innerHeight 가 줄어드는데, 텍스트는 같은 스테이지 안에 있어서
        innerHeight 로 재면 카드가 글자에서 어긋난다. */
  useEffect(() => {
    const sec = heroRef.current;
    const card = sec?.querySelector<HTMLElement>('.ma-banner');
    const head = sec?.querySelector<HTMLElement>('.ma-head');
    const pin = sec?.querySelector<HTMLElement>('.ma-hero-pin');
    if (!sec || !card || prefersReducedMotion()) return;

    const PEEK = 81; // 쉬고 있을 때 아래에서 보이는 높이 (css .ma-banner 와 같아야 한다)
    const GUT = 20;
    const H = 480;
    const RAD = 24;
    let ticking = false;

    const render = () => {
      ticking = false;
      /* ⚠️ 폭이 ≥1024 면 이 트리는 display:none 이다 — 그때는 아무것도 쓰지 않는다.
         `.on-dark` 는 데스크톱 About(public/js/about-hero.js)와 **같은 전역 플래그**라,
         안 보이는 쪽이 매 스크롤마다 false 를 덮으면 보이는 쪽이 방금 켠 것을 지운다. */
      if (!sec.getClientRects().length) return;
      const cw = document.documentElement.clientWidth;
      const vh = pin?.offsetHeight || innerHeight;
      const r = sec.getBoundingClientRect();
      const scrub = sec.offsetHeight - vh;
      const q = smoothstep(scrub > 0 ? clamp01(-r.top / scrub) : 0);

      card.style.top = `${lerp(vh - PEEK, 0, q).toFixed(1)}px`;
      card.style.left = `${lerp(GUT, 0, q).toFixed(1)}px`;
      card.style.right = 'auto';
      card.style.width = `${lerp(cw - GUT * 2, cw, q).toFixed(1)}px`;
      card.style.height = `${lerp(H, vh, q).toFixed(1)}px`;
      card.style.borderRadius = `${lerp(RAD, 0, q).toFixed(1)}px`;

      /* 글자를 밝게 뒤집는 시점은 진행도가 아니라 카드의 실제 위치로 판정한다 —
         터치 스크럽이 느려서 진행도로 재면 흰 글자가 흰 배경에 얹히는 순간이 생겼다. */
      const c = card.getBoundingClientRect();
      const ht = head?.getBoundingClientRect().top ?? 0;
      sec.classList.toggle('is-covered', c.top <= ht + 20 && c.bottom >= ht);
      setChrome(c.top <= 40 && c.bottom >= 27, c.top <= vh - 70 && c.bottom >= vh - 24);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', render);
    render();
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', render);
    };
  }, []);

  /* 05 마무리 이미지 — 가운데 작은 카드가 스크롤을 따라 화면을 꽉 채운다.
     래퍼가 정확히 100vh 라 다 커지는 즉시 sticky 가 풀린다(멈춰 있는 구간이 없다). */
  useEffect(() => {
    const wrap = closeRef.current;
    const box = wrap?.querySelector<HTMLElement>('.ma-close-box');
    const img = box?.querySelector('img');
    if (!wrap || !box) return;
    const reduce = prefersReducedMotion();
    const START_W = 0.25;
    const ASPECT = 0.62;
    const RAD = 12;
    let ticking = false;

    const render = () => {
      ticking = false;
      if (!wrap.getClientRects().length) return;   // ≥1024: 이 트리는 display:none — 위 히어로와 같은 이유
      const cw = document.documentElement.clientWidth;
      const vh = innerHeight;
      const startW = cw * START_W;
      const startH = startW * ASPECT;
      const r = wrap.getBoundingClientRect();

      if (!reduce) {
        const q = easeInOutCubic(clamp01((vh - r.top) / vh));
        box.style.left = `${lerp((cw - startW) / 2, 0, q).toFixed(1)}px`;
        box.style.right = 'auto';
        box.style.top = `${lerp((vh - startH) / 2, 0, q).toFixed(1)}px`;
        box.style.width = `${lerp(startW, cw, q).toFixed(1)}px`;
        box.style.height = `${lerp(startH, vh, q).toFixed(1)}px`;
        box.style.borderRadius = `${lerp(RAD, 0, q).toFixed(1)}px`;
        if (img) img.style.transform = `scale(${lerp(1.08, 1, q).toFixed(3)})`;
      }

      /* ⚠️ 히어로 스크럽도 매 프레임 같은 on-dark 플래그를 쓴다. 두 구간이 겹치지 않으므로
         이 섹션이 화면 근처일 때만 헤더를 건드려서 서로 싸우지 않게 한다. */
      if (r.bottom > -vh && r.top < vh * 2) {
        const b = box.getBoundingClientRect();
        const wide = b.left <= 20 && b.right >= cw - 12;
        setChrome(
          wide && b.top <= 75 && b.bottom >= 16,
          wide && b.top <= vh - 24 && b.bottom >= vh - 88,
        );
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', render);
    render();
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', render);
    };
  }, []);

  /* 히어로 등장 — 세리프 웹폰트가 준비된 뒤에 띄운다(글자가 바뀌며 흔들리지 않게).
     폰트를 못 기다려도 800ms 뒤엔 무조건 보여 준다. */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (prefersReducedMotion()) {
      hero.classList.add('in');
      return;
    }
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => hero.classList.add('in'));
    };
    document.fonts?.ready.then(reveal);
    const t = setTimeout(reveal, 800);
    return () => clearTimeout(t);
  }, []);

  /* [data-rv] 스크롤 리빌 — PC 와 같은 늦은 게이트(threshold .15 + 아래 -25%).
     자식들의 시차는 CSS transition-delay 가 준다. 카드마다 따로 관찰하는 이유는
     세로로 쌓인 모바일 열이 뷰포트보다 훨씬 길어서, 한 덩어리로 묶으면 화면 밖에서
     리빌이 끝나 버리기 때문이다. */
  useEffect(() => {
    const roots = [...document.querySelectorAll('.m-about [data-rv]')];
    return revealOnScroll(roots, 0.15, '0px 0px -25% 0px');
  }, []);

  return (
    <div className="m-about ct-rv">
      <section className="ma-hero" ref={heroRef}>
        <div className="ma-hero-pin">
          <div className="ma-hero-inner">
            <div className="ma-head">
              <img className="ma-symbol" src="/assets/symbol.svg" alt="" />
              <h1 className="ma-title">
                <span className="ma-title-lines">
                  <span className="ma-t1">Who</span>
                  <span className="ma-t2">
                    We Are
                    <i className="ma-dot" aria-hidden="true" />
                  </span>
                </span>
              </h1>
            </div>
            <div className="ma-sub">
              <p className="ma-sub-head">
                새롭고 독창적인 탐색,
                <br />
                인스플래닛은 경험을 만들어 갑니다.
              </p>
              <p className="ma-sub-body">
                인스플래닛은 고객이 생각하는 그 이상을 연구하고
                <br />
                고민합니다. 고객의 가치실현을 위한 신뢰할 수 있는
                <br />
                파트너로 함께 성장하고 있습니다.
              </p>
            </div>
          </div>
          {/* 캔버스는 ResponsiveSlot 이 PC 히어로에서 옮겨 온다 */}
          <div className="ma-banner" />
        </div>
      </section>

      <section className="ma-mission">
        <header className="ma-mission-head" data-rv>
          <p className="ma-eyebrow">Mission &amp; Vision</p>
          <h2 className="ma-headline">
            기술에 가치를 더해,
            <br />
            내일의 설렘을 완성합니다.
          </h2>
          <p className="ma-paragraph">
            우리는 차가운 기술 그 자체가 아닌, 그 기술이
            <br />
            비즈니스와 일상에서 만들어낼 본질적인 가치에
            <br />
            집중합니다. 정교한 분석과 끊임없는 고민으로 기술에
            <br />
            생명력을 불어넣고, 고객이 꿈꿔온 미래를 가장 기분 좋은 설렘으로 마주할 수 있도록 완벽한
            디지털 경험을 설계합니다.
          </p>
        </header>
        <ul className="ma-values">
          {[
            {
              pill: 'Insight',
              title: '데이터 너머의 본질을 봅니다.',
              body: ['단순히 현상을 관찰하는 것에 그치지 않고,', '깊이 있는 분석을 통해 비즈니스가 나아가야 할', '숨겨진 가치와 정답을 찾아냅니다.'],
            },
            {
              pill: 'Interest',
              title: '사람을 향한 호기심에서 시작합니다.',
              body: ['기술이 일상에 자연스럽게 스며들 수 있도록', '사용자의 작은 목소리에도 귀를 기울이며, 모두가', '즐겁게 누릴 수 있는 최적의 경험을 탐구합니다.'],
            },
            {
              pill: 'Innovation',
              title: '당연함을 의심하며 내일을 앞당깁니다.',
              body: ['익숙한 방식에 안주하지 않고', '가장 진보된 기술을 유연하게 도입하여, 상상이', '현실이 되는 새로운 디지털 기준을 세워갑니다.'],
            },
          ].map((v) => (
            <li className="ma-value" data-rv key={v.pill}>
              <span className="ma-value-pill">{v.pill}</span>
              <div className="ma-value-text">
                <h3 className="ma-value-title">{v.title}</h3>
                <p className="ma-value-body">
                  {v.body.map((line, i) => (
                    <span key={i}>
                      {i > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ma-exp">
        <h2 className="ma-exp-title" data-rv>
          Experience
        </h2>
        <p className="ma-exp-copy" data-rv>
          산업의 본질을 꿰뚫는
          <br />
          인사이트에 디자인의 정교함을 더해, 세상에 없던 경험을 연결합니다.
        </p>
        <ul className="ma-caps">
          {[
            {
              icon: 'icon-mega-finance',
              title: ['Mega Finance', 'DNA'],
              desc: '신한 ‘슈퍼SOL’ 6년 전담 운영을 비롯해 KB·IBK·우리카드 등 핵심 플랫폼의 혁신을 주도해온 검증된 전문성을 갖췄습니다.',
            },
            {
              icon: 'icon-cross-industry',
              title: ['Cross-Industry', 'Insight'],
              desc: '금융, 공공, 항공, 유통, 엔터프라이즈까지 산업의 경계를 넘어 축적한 경험으로 어떤 비즈니스에도 최적의 답을 제시합니다.',
            },
            {
              icon: 'icon-si-synergy',
              title: ['SI Synergy &', 'Partnership'],
              desc: 'LG CNS, 신한DS의 공식 협력사로서 대형 SI 주사업자와의 완벽한 시너지로 프로젝트의 성공을 이끕니다.',
            },
            {
              icon: 'icon-ax-tech',
              title: ['AX Tech &', 'Design System'],
              desc: '고유 디자인 시스템과 자체 AX 솔루션 R&D를 통해 프로젝트 생산성과 기술 경쟁력을 극대화합니다.',
            },
          ].map((c) => (
            <li className="ma-cap" data-rv key={c.icon}>
              <span className="ma-cap-icon">
                <img src={`/assets/about/${c.icon}.svg`} alt="" aria-hidden="true" />
              </span>
              <h3 className="ma-cap-title">
                {c.title[0]}
                <br />
                {c.title[1]}
              </h3>
              <p className="ma-cap-desc">{c.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 사진 밴드 — 4장 + 복제 4장이 오른쪽에서 왼쪽으로 흐른다(트랙 -50% 에서 이어 붙는다).
          복제본은 aria-hidden. 리빌 전에는 CSS 가 멈춰 둔다. */}
      <div className="ma-gallery" data-rv>
        <div className="ma-gallery-track">
          {[1, 2, 3, 4].map((n) => (
            <figure className="ma-gallery-item" key={n}>
              <img src={`/assets/about/gallery-${n}.jpg`} alt="" decoding="async" />
            </figure>
          ))}
          {[1, 2, 3, 4].map((n) => (
            <figure className="ma-gallery-item" aria-hidden="true" key={`dup-${n}`}>
              <img src={`/assets/about/gallery-${n}.jpg`} alt="" loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
      </div>

      <section className="ma-beyond">
        <div className="ma-beyond-head" data-rv>
          <h2 className="ma-beyond-title">
            <span className="line-1">Beyond UX</span>
            <span className="line-2">The AX Creator</span>
          </h2>
          <div className="ma-beyond-copy">
            <p className="ma-beyond-lead">
              단순한 경험의 개선을 넘어, <br />
              기술이 스스로 가치를 창출하는 시대를 엽니다.
            </p>
            <p className="ma-beyond-para">
              우리는 기존의 사용자 경험(UX)이라는 틀에
              <br />
              안주하지 않습니다. 인스플래닛의 사고방식은 고도화된 <br />
              AI 기술을 비즈니스 본질에 이식하여, 스스로 진화하고 <br />
              최적의 해답을 제시하는 AX(AI Experience)를 <br />
              설계하는 데 있습니다.
            </p>
            <p className="ma-beyond-para">
              우리는 고객의 요청을 구현하는 것에 그치지 않고, <br />
              데이터 너머의 맥락을 읽어내어 비즈니스의 다음 차원을 창조합니다.
            </p>
          </div>
        </div>
        <dl className="ma-stats" data-rv>
          <div className="ma-stat ma-stat-projects">
            <dt className="ma-stat-label">Projects done</dt>
            <dd className="ma-stat-num">
              <img src="/assets/about/stat-projects.svg" alt="100+" />
            </dd>
          </div>
          <div className="ma-stats-row">
            <div className="ma-stat ma-stat-years">
              <dt className="ma-stat-label">Years of experience</dt>
              <dd className="ma-stat-num">
                <img src="/assets/about/stat-years.svg" alt="8+" />
              </dd>
            </div>
            <div className="ma-stat ma-stat-team">
              <dt className="ma-stat-label">Team members</dt>
              <dd className="ma-stat-num">
                <img src="/assets/about/stat-team.svg" alt="30+" />
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <section className="ma-close" ref={closeRef}>
        <div className="ma-close-pin">
          <div className="ma-close-box">
            <img src="/assets/about/fullbleed.jpg" alt="" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      <MobileFooter />
    </div>
  );
}

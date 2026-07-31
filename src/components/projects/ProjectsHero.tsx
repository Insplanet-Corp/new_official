'use client';

import { useRef } from 'react';
import useHeroReveal from '@/lib/hooks/useHeroReveal';

/* Hero: symbol + "Our Projects." + lead/desc. `.in` drives the blur reveal (see projects.css). */
export default function ProjectsHero() {
  const ref = useRef<HTMLElement>(null);
  useHeroReveal(ref);

  return (
    <section className="pj-hero" ref={ref}>
      <div className="pj-inner">
        <img className="pj-symbol" src="/assets/symbol.svg" alt="" aria-hidden="true" />
        <div className="pj-hero-head">
          <h1 className="pj-title-row">
            <span className="pj-title">
              Our Projects
              <i className="pj-dot" aria-hidden="true" />
            </span>
          </h1>
          <p className="pj-lead">결과로 증명하는 것, 그것이 인스플래닛의 방식입니다.</p>
          <p className="pj-desc">
            눈에 보이는 화면을 넘어 비즈니스의 본질을 꿰뚫고, 정교한 전략과 기술로
            <br />
            고객의 문제를 실질적인 가치로 바꿔왔습니다. 인스플래닛이 함께 만들어온 변화의 기록입니다.
          </p>
        </div>
      </div>
    </section>
  );
}

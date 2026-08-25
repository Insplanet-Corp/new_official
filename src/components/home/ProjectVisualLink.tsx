'use client';

import { useEffect, useState } from 'react';
import type { ShowcaseItem } from '@/data/home';

/* 홈 "Our Projects" 오른쪽 비주얼 패널을 눌러 상세 시트를 여는 투명 링크.

   왜 오버레이 하나인가 —
   패널은 `.proj-vis` 레이어 여러 장이 겹쳐 있고 어느 것이 보이는지는 main.js 가
   **인라인 opacity 로** 정한다. CSS 로는 그 상태를 못 읽으니 레이어마다 링크를 깔면
   안 보이는 레이어의 링크가 클릭을 먹는다. 그래서 링크는 한 장만 깔고 href 만 바꾼다.

   현재 슬라이드를 아는 방법 —
   main.js 의 renderAf() 가 매 프레임 `.proj-indicator .proj-dot` 에 `.is-active` 를
   토글한다(라인 ~768). 그게 이 챕터에서 활성 인덱스를 알 수 있는 유일한 공개 신호라
   MutationObserver 로 그 클래스 변화만 지켜본다. rAF 로 매 프레임 읽지 않는 이유는
   실제로 바뀌는 순간에만 리렌더하면 되기 때문이다.

   ⚠️ 클릭을 시트로 바꾸는 것은 여기가 아니라 ProjectSheet 다 — document 클릭에서
   `a[href^="/projects/"]` 를 가로챈다. 그래서 이 링크는 평범한 <a> 여야 하고,
   시트가 없는 화면(상세 미등록)에서는 그냥 /projects/<id> 로 이동한다.
   ⚠️ next/link 를 쓰지 않는다 — 마케팅 라우트는 문서를 새로 로드해야 한다
   (LegacyRuntime.tsx 주석). 시트가 가로채면 이동 자체가 일어나지 않는다. */
export default function ProjectVisualLink({ items }: { items: ShowcaseItem[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ind = document.querySelector('.proj-indicator');
    if (!ind) return;
    const read = () => {
      const dots = [...ind.querySelectorAll('.proj-dot')];
      const i = dots.findIndex((d) => d.classList.contains('is-active'));
      if (i >= 0) setActive(i);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(ind, { attributes: true, attributeFilter: ['class'], subtree: true });
    return () => mo.disconnect();
  }, []);

  // 상세가 등록된 슬라이드에서만 링크가 생긴다 (없으면 눌러도 아무 일 없음 — 목록과 같은 규칙)
  const href = items[active]?.href;
  if (!href) return null;

  return (
    <a
      className="proj-vis-link"
      href={href}
      aria-label={`${items[active].name.join(' ')} 프로젝트 상세 보기`}
    />
  );
}

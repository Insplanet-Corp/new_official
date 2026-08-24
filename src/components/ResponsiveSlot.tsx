'use client';

import { useEffect } from 'react';

/* 폭에 따라 **노드 하나**를 PC 프레임과 모바일 프레임 사이로 옮긴다.

   왜 필요한가 —
   한 라우트가 PC/모바일 마크업을 둘 다 들고 있는데, 레거시 스크립트 몇 개가
   `getElementById(...)` 로 **첫 번째 하나**만 찾아 거기에 붙는다:

     public/js/insight-background.bundle.js  ->  #insight-shader  (React 루트를 만든다)
     public/js/about-blackhole.js            ->  #about-blackhole (WebGL 컨텍스트를 만든다)

   그래서 노드를 두 벌 두면 한쪽은 영영 빈 상자다. 노드는 PC 쪽에 한 번만 두고
   (SSR 로 이미 있으니 스크립트가 붙을 대상이 확실하다) 폭이 모바일이면 여기서 옮긴다.
   **캔버스는 부모가 바뀌어도 컨텍스트를 잃지 않고, React 루트도 노드에 붙어 따라간다.**

   ⚠️ 옮기는 노드는 React 가 렌더한 것이다. 지금 두 프레임 모두 정적이라 안전하다 —
      어느 한쪽에 상태를 넣어 리렌더가 생기면 이 방식을 다시 볼 것. */
export default function ResponsiveSlot({
  id,
  desktop,
  mobile,
  query = '(max-width: 1023px)',
}: {
  /** 옮길 노드의 id */
  id: string;
  /** PC 에서의 부모 (CSS 선택자) */
  desktop: string;
  /** 모바일에서의 부모 */
  mobile: string;
  query?: string;
}) {
  useEffect(() => {
    const mq = matchMedia(query);

    const place = () => {
      const node = document.getElementById(id);
      if (!node) return;
      const host = document.querySelector(mq.matches ? mobile : desktop);
      if (!host || node.parentElement === host) return;
      host.appendChild(node);
      /* 옮긴 뒤 크기가 달라진다. 두 스크립트 다 window resize 로 버퍼를 다시 잡으므로
         한 번 알려 준다 (사용자가 창을 조절해서 넘어온 경우엔 이미 왔겠지만,
         첫 배치처럼 resize 없이 옮기는 경우가 있다). */
      dispatchEvent(new Event('resize'));
    };

    place();
    mq.addEventListener?.('change', place);
    addEventListener('resize', place);
    return () => {
      mq.removeEventListener?.('change', place);
      removeEventListener('resize', place);
    };
  }, [id, desktop, mobile, query]);

  return null;
}

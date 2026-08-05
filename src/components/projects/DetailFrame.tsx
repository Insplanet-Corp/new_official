'use client';

import { useEffect, useRef, useState } from 'react';

/* 퍼블리셔 HTML 을 담는 iframe.

   ⚠️ sandbox 에 allow-same-origin 을 넣지 말 것. 넣는 순간 iframe 이 우리와 같은
   출처가 되어, 그 안의 스크립트가 부모의 localStorage(= Supabase 세션 토큰)를
   읽을 수 있다. allow-scripts 만 주면 불투명 출처라 접근이 막히고, 아래 높이
   동기화에 쓰는 postMessage 는 그대로 동작한다.

   높이는 문서가 스스로 알려준다 — 불투명 출처라 부모가 contentDocument 를 읽을
   수 없기 때문이다. 퍼블리셔 산출물의 </body> 앞에 아래 한 줄이 있어야 한다:
     <script src="/portfolio/_height.js"></script>
   빠뜨리면 아래 기본 높이에 멈춘 채로 내용이 잘린다. */
export default function DetailFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  // 첫 메시지가 오기 전까지 쓰는 잠정 높이. 너무 작으면 로딩 중 화면이 접힌다.
  const [height, setHeight] = useState(1200);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // sandbox iframe 의 origin 은 'null' 이라 origin 으로 못 거른다.
      // 대신 우리 iframe 이 보낸 것인지 source 로 확인한다.
      if (ref.current && e.source !== ref.current.contentWindow) return;
      const h = (e.data as { __portfolioHeight?: number })?.__portfolioHeight;
      if (typeof h === 'number' && h > 0) setHeight(h);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      sandbox="allow-scripts"
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        height,
        border: 0,
        // iframe 내부가 자체 스크롤되면 스크롤바가 두 겹으로 보인다
        overflow: 'hidden',
      }}
    />
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/* 퍼블리셔 HTML 을 담는 iframe — 화면(뷰포트)을 통째로 차지한다.
   /projects/<id> 로 직접 들어왔을 때 쓴다. 목록에서 카드를 눌러 온 경우는
   ProjectSheet 가 같은 문서를 시트로 띄운다.

   ⚠️ 내용 높이에 맞춰 늘리지 말 것. _shared/project-detail.css 는 상세를
   `height:100vh`(히어로)와 `position:fixed`(닫기·SCROLL 힌트) 위에 세워 놨다 —
   자기가 곧 뷰포트라고 전제한다. iframe 을 문서 높이에 맞추면 그 안의 100vh 가
   "iframe 자기 높이" 가 되어 히어로가 매번 더 커지고(높이를 다시 통지 → 또 커짐),
   fixed 는 뷰포트가 아니라 문서 맨 위에 붙는다. 실제로 이걸로 화면이 통째로 깨졌다.
   → 높이를 고정하고 스크롤은 iframe 안에서 일어나게 둔다.

   ⚠️ sandbox 에 allow-same-origin 을 넣지 말 것. 넣는 순간 iframe 이 우리와 같은
   출처가 되어, 그 안의 스크립트가 부모의 localStorage(= Supabase 세션 토큰)를
   읽을 수 있다. allow-scripts 만 주면 불투명 출처라 접근이 막힌다. */
export default function DetailFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const router = useRouter();

  /* 상세의 닫기(.pd-close)를 눌렀다 — _shared/bridge.js 가 넘겨 준다.
     sandbox 라 iframe 이 스스로 상위 이동을 못 해서(allow-top-navigation 없음)
     가로채지 않으면 iframe 안에서 목록 페이지가 열려 버린다. */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if ((e.data as { pdClose?: boolean } | null)?.pdClose) router.push('/projects');
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [router]);

  return (
    <iframe
      src={src}
      title={title}
      sandbox="allow-scripts"
      style={{
        display: 'block',
        width: '100%',
        // svh: 모바일 브라우저 주소창이 접혔다 펴져도 히어로가 잘리지 않는다
        height: '100svh',
        border: 0,
      }}
    />
  );
}

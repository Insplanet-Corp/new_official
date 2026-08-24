import { permanentRedirect } from 'next/navigation';

/* /mobile 은 더 이상 별도 화면이 아니다.

   예전에는 폰 전용 라우트였고 `/` 와 서로 튕겨 보냈다(어댑티브). 그 구조 때문에
   경계를 넘을 때 페이지가 다시 뜨고, 잘못된 폭에 갇히면 모바일 CSS 가 통째로 꺼져
   화면이 깨졌다(CLAUDE.md 33번). 지금은 `/` 하나가 두 디자인을 모두 그린다 —
   styles/home-responsive.css 가 폭으로 가르므로 리다이렉트가 아예 필요 없다.

   북마크·외부 링크가 남아 있을 수 있어 308 로 넘긴다. */
export default function MobilePage() {
  permanentRedirect('/');
}

/* Supabase Storage 이미지를 화면 크기에 맞게 줄여서 받는다.

   왜 필요한가 —
   어드민 업로드는 파일을 그대로 올린다. 실제로 올라온 썸네일은 5120x2880(약 10MB)인데
   /projects 카드는 304x409 로 그린다. 목록에 카드가 30장 넘게 쌓이자 페이지가
   수백 MB 를 받고, 브라우저는 한 장당 15메가픽셀(디코드 후 약 59MB)을 펼쳤다 —
   이것이 스크롤이 끊기던 원인이다.

   Storage 는 같은 파일을 리사이즈해 주는 엔드포인트를 함께 제공한다.
     .../storage/v1/object/public/...      원본        9.9MB
     .../storage/v1/render/image/public/... ?width=608&height=818&resize=cover&quality=75
                                            608x818     70KB   (141배)

   ⚠️ 이미지 변환은 Supabase 유료 플랜 기능이다. 이 프로젝트에서는 동작하는 것을
      확인했다(위 수치가 실제 응답이다). 플랜이 바뀌어 400 이 나기 시작하면
      카드 이미지가 깨지므로, 그때는 storageRender 가 src 를 그대로 돌려주도록
      한 줄만 바꾸면 원본으로 되돌아간다. */

const OBJECT = '/storage/v1/object/public/';
const RENDER = '/storage/v1/render/image/public/';

type RenderOpts = {
  width: number;
  height?: number;
  quality?: number;
  /** cover(기본) = 상자를 채우고 넘치는 부분은 자른다. contain = 비율을 지켜 상자 안에 담는다(안 자름). */
  resize?: 'cover' | 'contain';
};

/** Storage 공개 URL 이면 리사이즈 URL 로 바꾼다. 그 외(로컬 /assets/… 등)는 그대로. */
export function storageRender(
  src: string,
  { width, height, quality = 75, resize = 'cover' }: RenderOpts,
): string {
  if (!src) return src;
  const at = src.indexOf(OBJECT);
  if (at === -1) return src;

  const url = src.slice(0, at) + RENDER + src.slice(at + OBJECT.length);
  const q = new URLSearchParams({ width: String(width), quality: String(quality) });
  /* 높이를 같이 주면 그 상자에 맞춰 준다 — 카드가 object-fit:cover 라 비율이 다르면
     어차피 잘리는데, 그 잘릴 부분까지 받아 올 이유가 없다.

     ⚠️⚠️ **height 를 반드시 같이 줄 것.** width 만 주면 비율이 유지되지 않는다 —
     원본 높이가 그대로 남고, 기본 resize=cover 가 그 높이에 맞춰 **좌우를 잘라 낸다.**
     실측(2026-09-01): 636x240 로고에 `?width=240` → **240x240** (가운데 정사각형만 남고
     워드마크 양옆이 잘려 나간다). 5120x2880 썸네일에 `?width=1200` → 1200x2880 세로 띠.
     화면은 그대로 뜨고 콘솔 에러도 없어서, 로고가 "안 보인다" 로만 드러났다.
     비율을 지켜야 하는 이미지(로고 등)는 상자 크기 + resize:'contain' 으로 부를 것. */
  if (height) {
    q.set('height', String(height));
    q.set('resize', resize);
  }
  return `${url}${url.includes('?') ? '&' : '?'}${q}`;
}

/* 진행중 목록의 고객사 CI — PC 표(.pj-logo 170x64 → 212x80)와 모바일 카드(.mp-ocard-logo
   98x48)가 같은 파일을 쓴다. 실제로 올라온 로고는 636x240 = 212x80 의 3배수다.
   ⚠️ resize:'contain' 이라 비율이 다른 로고를 나중에 올려도 잘리지 않는다 — 로고는
   잘리면 글자가 사라져 못 읽는다. 상한만 걸어 5000px 짜리를 그대로 받는 일을 막는다. */
export const LOGO_RENDER = { width: 636, height: 240, resize: 'contain' } as const;

/** /projects 카드의 가로:세로 (304x409 · 416x560 — 뷰포트가 커져도 비율은 같다) */
const CARD_RATIO = 409 / 304;

/* 카드 폭은 뷰포트를 따라 259 ~ 555px 사이에서 움직인다. 고정 크기가 아니라서
   x 서술자(1x/2x)를 못 쓰고 w 서술자 + sizes 로 브라우저에 고르게 한다. */
const CARD_WIDTHS = [320, 480, 640, 960];

/** 카드 <img> 의 srcSet. Storage 이미지가 아니면 undefined (srcSet 을 달지 않는다) */
export function cardSrcSet(src: string): string | undefined {
  if (!src || !src.includes(OBJECT)) return undefined;
  return CARD_WIDTHS.map(
    (w) => `${storageRender(src, { width: w, height: Math.round(w * CARD_RATIO) })} ${w}w`,
  ).join(', ');
}

/** 카드 <img> 의 기본 src — srcSet 을 못 읽는 브라우저용 겸 기준값 */
export function cardSrc(src: string): string {
  return storageRender(src, { width: 640, height: Math.round(640 * CARD_RATIO) });
}

/** 카드가 차지하는 폭 — 데스크톱은 그리드 4열(약 22vw), 그보다 좁으면 260px 고정 */
export const CARD_SIZES = '(min-width: 1024px) 22vw, 260px';

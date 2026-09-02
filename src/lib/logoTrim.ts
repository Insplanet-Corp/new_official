/* 고객사 CI 를 상자 왼쪽에 "딱" 붙이기 위한 런타임 측정.

   왜 CSS 만으로 안 되는가 — 올라오는 CI 는 전부 636x240 캔버스에 마크를 **가운데 두고
   좌우를 투명하게 비워 둔** 파일이다(실측 2026-09-02: 좌측 여백이 파일마다 42px~168px,
   폭의 6.6%~26.4%). 그래서 `object-position: left` 를 줘도 이미 왼쪽에 붙어 있는 것은
   "투명한 여백" 이라 눈에는 로고가 제각각 들여쓰기된 것처럼 보인다.
   게다가 이 여백이 파일마다 달라 고정 offset 으로도 못 맞춘다.

   ⚠️ 캔버스를 왼쪽으로 미는 것이지 이미지를 자르는 것이 아니다 — 확대/축소가 없으므로
      로고의 크기감(모든 CI 가 같은 636 폭 기준으로 축소된다)은 그대로 유지된다.

   ⚠️ 여백을 없앤 CI 를 새로 올려 해결하는 방법은 **쓰지 않았다** — 같은 파일을 PC 표
      (.pj-logo)도 쓰는데 그쪽은 가운데 정렬이라(상자 비율 170/64 가 캔버스 636/240 과
      같아 여백이 곧 가운데 정렬을 만든다) 파일에서 여백을 빼면 PC 가 같이 왼쪽으로 쏠린다.

   ⚠️ 측정에는 `crossOrigin="anonymous"` 가 필요하다 — Storage 는 다른 출처라 그게 없으면
      캔버스가 오염돼 getImageData 가 SecurityError 를 던진다(15번 함정과 같은 뿌리).
      Storage 는 `Access-Control-Allow-Origin: *` 를 준다. */

/** 측정용 캔버스 폭 상한. 지금 올라온 CI(636px)는 원본 그대로 재고, 그보다 큰 파일만 줄인다.
    줄이면 그만큼 여백 측정이 뭉툭해진다(192 로 재 봤더니 상자에서 0.5px 쯤 덜 밀렸다). */
const SAMPLE_W = 1024;

/** 안티에일리어싱 가장자리를 여백으로 세지 않기 위한 알파 문턱값 */
const ALPHA_MIN = 8;

/** 측정에 성공한 값만 담는다(패널 전환·리사이즈마다 다시 부르므로 재디코딩을 막는다).
    ⚠️ **실패를 여기 담지 말 것** — 한 번 삐끗한 이미지가 영영 안 고쳐진다. 실제로 겪었다:
    캔버스가 잠깐 오염돼 두 장만 정렬이 안 됐고, 이후 어떤 계기로도 되돌아오지 않았다. */
const measured = new WeakMap<HTMLImageElement, number>();

/** 대신 실패 횟수를 세어 상한을 둔다 — 계속 실패하는 이미지를 리사이즈마다 다시 디코딩하지 않게 */
const failures = new WeakMap<HTMLImageElement, number>();
const MAX_TRIES = 3;

/** 왼쪽 투명 여백이 이미지 폭에서 차지하는 비율(0~1). 아직/영영 못 재면 null */
function leftAlphaRatio(img: HTMLImageElement): number | null {
  const hit = measured.get(img);
  if (hit !== undefined) return hit;
  if ((failures.get(img) ?? 0) >= MAX_TRIES) return null;

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return null; // 아직 디코딩 전 — 실패로 세지 않는다

  try {
    const w = Math.min(nw, SAMPLE_W);
    const h = Math.max(1, Math.round((nh / nw) * w));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    let ratio = 0; // 끝까지 못 찾으면 전부 투명한 파일이다 — 밀 것이 없다
    outer: for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (data[(y * w + x) * 4 + 3] > ALPHA_MIN) {
          ratio = x / w;
          break outer;
        }
      }
    }
    measured.set(img, ratio);
    return ratio;
  } catch {
    /* 캔버스 오염(CORS)·getImageData 차단 등. 원래 위치를 쓰고 다음 기회에 다시 재 본다. */
    failures.set(img, (failures.get(img) ?? 0) + 1);
    return null;
  }
}

/**
 * `object-fit: contain` 인 CI 이미지의 내용이 상자 왼쪽 끝에 붙도록 object-position 을 민다.
 * 측정에 실패하거나 여백이 없으면 아무것도 하지 않는다(= CSS 의 `left center` 그대로).
 */
export function flushLeftLogo(img: HTMLImageElement): void {
  const boxW = img.clientWidth;
  const boxH = img.clientHeight;
  /* 상자가 0 이면 지금 이 트리가 안 그려지고 있다(≥1024 이거나 패널이 hidden).
     그때는 미룬다 — 보이게 됐을 때 다시 부른다. */
  if (!boxW || !boxH) return;

  const ratio = leftAlphaRatio(img);
  if (!ratio) return;

  /* contain 이 실제로 그리는 폭. 캔버스가 상자보다 가로로 길면 폭에 맞춰 담기고,
     세로로 길면 높이에 맞춰 담겨 상자보다 좁아진다. */
  const rendered = Math.min(boxW, boxH * (img.naturalWidth / img.naturalHeight));
  const shift = ratio * rendered;
  img.style.objectPosition = `${(-shift).toFixed(2)}px center`;
}

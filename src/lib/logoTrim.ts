/* 고객사 CI 를 상자 왼쪽에 "딱" 붙이기 위한 런타임 측정.

   왜 CSS 만으로 안 되는가 — 올라오는 CI 는 전부 636x240 캔버스에 마크를 **가운데 두고
   좌우를 투명하게 비워 둔** 파일이다(실측 2026-09-02: 좌측 여백이 파일마다 42px~168px,
   폭의 6.6%~26.4%). 그 여백은 이미지 **안에** 있으므로 `object-position: left` 로는
   손댈 수 없고, 게다가 `object-fit: contain` 이 폭에 딱 맞게 담으면(캔버스 2.65 >
   상자 98/48 = 2.04) 좌우로 남는 여유가 0 이라 object-position 이 아예 쓰이지 않는다.
   → 여백을 재서 object-position 을 **음수 px** 로 민다. 확대·축소가 없으므로 로고의
     크기감(모든 CI 가 같은 636 폭 기준으로 축소된다)은 그대로다.

   ⚠️ 여백을 없앤 CI 를 새로 올려 해결하는 방법은 **쓰지 않았다** — 같은 파일을 PC 표
      (.pj-logo)도 쓰는데 그쪽은 상자 비율(170/64)이 캔버스(636/240)와 같아 그 여백이 곧
      가운데 정렬이다. 파일에서 여백을 빼면 PC 가 통째로 왼쪽으로 쏠린다. */

/** 측정용 캔버스 폭 상한. 지금 올라온 CI(636px)는 원본 그대로 재고, 그보다 큰 파일만 줄인다.
    줄이면 그만큼 여백 측정이 뭉툭해진다(192 로 재 봤더니 상자에서 0.5px 쯤 덜 밀렸다). */
const SAMPLE_W = 1024;

/** 안티에일리어싱 가장자리를 여백으로 세지 않기 위한 알파 문턱값 */
const ALPHA_MIN = 8;

/** 계속 실패하는 주소를 리사이즈마다 다시 받지 않기 위한 상한 */
const MAX_TRIES = 3;

/** 측정에 **성공한** 값만 담는다. 키가 요소가 아니라 주소라 리마운트·중복 사용에도 재사용된다.
    ⚠️ 실패를 여기 담지 말 것 — 한 번 삐끗한 로고가 영영 안 고쳐진다(실제로 겪었다). */
const ratios = new Map<string, number>();
const failures = new Map<string, number>();
const inflight = new Set<string>();

/** 왼쪽 투명 여백이 이미지 폭에서 차지하는 비율(0~1). 못 찾으면 null */
function scanLeftAlpha(source: CanvasImageSource, nw: number, nh: number): number | null {
  const w = Math.min(nw, SAMPLE_W);
  const h = Math.max(1, Math.round((nh / nw) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_MIN) return x / w;
    }
  }
  /* ⚠️ 여기서 0 을 돌려주면 안 된다. "전부 투명한 파일" 과 "아직 디코딩이 안 돼 빈 캔버스가
     그려진 것" 이 구별되지 않는데, 후자가 실제로 일어난다 — decoding="async" 인 이미지를
     load 직후 drawImage 하면 iOS 사파리에서 아무것도 안 그려질 수 있다. 그걸 0 으로 확정해
     캐시하면 그 로고 한 장만 영영 가운데에 남는다(GS건설이 그랬다). 실패로 돌린다. */
  return null;
}

/** blob 을 우리 손으로 디코딩한다. 두 경로 모두 화면 렌더링과 무관해 탭이 뒤로 가 있어도 끝난다.
    ⚠️ `HTMLImageElement.decode()` 를 쓰지 말 것 — **숨겨진 문서에서는 영영 resolve 되지 않는다**
       (실측 2026-09-02: 같은 탭에서 createImageBitmap·onload 는 되는데 decode() 만 무한 대기).
       그러면 아래 inflight 가 영영 안 풀려 재시도까지 같이 막힌다. */
async function decodeBlob(blob: Blob): Promise<{ source: CanvasImageSource; w: number; h: number }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(blob);
    return { source: bmp, w: bmp.width, h: bmp.height };
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const probe = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('blob 디코딩 실패'));
      im.src = objectUrl;
    });
    return { source: probe, w: probe.naturalWidth, h: probe.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** 마지막 수단 — 바이트를 직접 받아 다시 디코딩해서 잰다. 우리가 디코딩을 기다리므로 빈 캔버스가
    나오지 않고, blob 은 같은 출처라 캔버스가 오염될 수도 없다.
    (브라우저 캐시에 CORS 가 아닌 응답이 남아 있으면 <img> 쪽 캔버스는 조용히 오염된다.) */
async function measureFromBytes(src: string): Promise<void> {
  if (inflight.has(src)) return;
  inflight.add(src);
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { source, w, h } = await decodeBlob(await res.blob());
    const ratio = w && h ? scanLeftAlpha(source, w, h) : null;
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();
    if (ratio === null) throw new Error('불투명 픽셀을 못 찾음');
    ratios.set(src, ratio);
  } catch {
    failures.set(src, (failures.get(src) ?? 0) + 1);
  } finally {
    inflight.delete(src);
  }
}

function apply(img: HTMLImageElement, ratio: number): void {
  const boxW = img.clientWidth;
  const boxH = img.clientHeight;
  if (!boxW || !boxH || !ratio) return;
  /* ⚠️ 아래 계산은 `object-fit: contain` 전제다. 나중에 CSS 를 cover 등으로 바꾸면 값이
     틀리므로 그때는 아예 손대지 않는다(= 지금 CSS 가 그리는 모습 그대로 둔다). */
  if (getComputedStyle(img).objectFit !== 'contain') return;
  /* contain 이 실제로 그리는 폭. 캔버스가 상자보다 가로로 길면 폭에 맞춰 담기고,
     세로로 길면 높이에 맞춰 담겨 상자보다 좁아진다. */
  const rendered = Math.min(boxW, boxH * (img.naturalWidth / img.naturalHeight));
  img.style.objectPosition = `${(-ratio * rendered).toFixed(2)}px center`;
}

/**
 * `object-fit: contain` 인 CI 이미지의 내용이 상자 왼쪽 끝에 붙도록 object-position 을 민다.
 * 측정에 실패하면 아무것도 하지 않는다(= CSS 의 `left center` 그대로).
 * 여러 번 불러도 안전하다 — 주소 단위로 캐시하고 같은 요청을 겹쳐 보내지 않는다.
 */
export function flushLeftLogo(img: HTMLImageElement): void {
  /* 상자가 0 이면 지금 이 트리가 안 그려지고 있다(≥1024 이거나 패널이 hidden).
     그때는 미룬다 — 보이게 됐을 때 다시 부른다. */
  if (!img.clientWidth || !img.clientHeight) return;
  const src = img.currentSrc || img.src;
  if (!src) return;

  const known = ratios.get(src);
  if (known !== undefined) {
    apply(img, known);
    return;
  }
  if ((failures.get(src) ?? 0) >= MAX_TRIES) return;

  /* 빠른 길 — 이미 화면에 있는 이미지에서 바로 잰다(네트워크·디코딩 비용 0).
     오염되거나 아직 디코딩 전이면 조용히 실패하고 아래 느린 길로 넘어간다. */
  if (img.complete && img.naturalWidth && img.naturalHeight) {
    try {
      const ratio = scanLeftAlpha(img, img.naturalWidth, img.naturalHeight);
      if (ratio !== null) {
        ratios.set(src, ratio);
        apply(img, ratio);
        return;
      }
    } catch {
      /* 캔버스 오염(CORS)·getImageData 차단 — 느린 길이 받아낸다 */
    }
  }

  void measureFromBytes(src).then(() => {
    const ratio = ratios.get(src);
    if (ratio !== undefined) apply(img, ratio);
  });
}

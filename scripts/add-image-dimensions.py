#!/usr/bin/env python3
"""상세 문서의 <img> 에 width/height 와 lazy 로딩을 넣는다.

왜 —
  1) 치수가 없으면 로드 전 높이가 0 이라, loading="lazy" 와 만나면 교착이 된다
     (CLAUDE.md 23번: 문서가 안 길어져서 이미지가 화면 근처로 못 가고, 그래서
     영영 로드되지 않는다). 치수를 적으면 브라우저가 자리를 미리 잡는다.
  2) 상세는 PC 용(.pd-sec--pc)과 모바일용(.pd-sec--m) 이미지를 둘 다 마크업에
     들고 다니고, 안 쓰는 쪽은 display:none 이다. **display:none 이어도 eager
     이미지는 그대로 받는다** — t4k 는 모바일에서 안 보이는 PC 이미지 57MB 를
     받고 있었다. lazy 로 바꾸면 레이아웃 박스가 없는 이미지는 받지 않는다.

치수를 넣는 방법이 두 가지다 — 이유가 있다.

  .pd-sec 안의 섹션 이미지  ->  width/height 속성
      project-detail.css 가 `.pd-sec img{width:100%;height:auto}` 로 못박아 둬서
      속성은 비율로만 쓰인다. <picture> 로 합칠 때 <source> 에도 같은 치수가 필요하다.

  그 밖의 이미지            ->  style="aspect-ratio: W / H"
      ⚠️ width/height 속성은 "표현 힌트" 라 CSS 처럼 먹는다. 문서 CSS 가 width 만
      정해 둔 이미지에서는 height 힌트가 살아남아 세로로 늘어나고(onnuri 아이콘
      48x48 -> 48x96), flex 안에서는 width 힌트가 줄어들 자리를 막는다
      (img_elderly 433 -> 476). aspect-ratio 는 한쪽이 auto 일 때만 비율을 채워
      주므로 원래 레이아웃을 그대로 두면서 자리 예약만 한다.

치수는 실제 파일에서 읽는다(sips). 이미 width 나 aspect-ratio 가 있으면 건드리지 않는다.

사용법:  python3 scripts/add-image-dimensions.py [폴더...]
"""
import re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public" / "portfolio"
IMG = re.compile(r"<img\b[^>]*>", re.I)
SEC = re.compile(r'<figure class="pd-sec[^"]*">.*?</figure>', re.I | re.S)
SRC = re.compile(r'\bsrc="([^"]+)"', re.I)

def dims(path: Path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
                         capture_output=True, text=True).stdout
    d = dict(l.strip().split(": ", 1) for l in out.splitlines()[1:] if ": " in l)
    try:
        return int(d["pixelWidth"]), int(d["pixelHeight"])
    except KeyError:
        return None

def main(argv):
    dirs = [Path(a) for a in argv] or sorted(p.parent for p in ROOT.glob("*/index.html"))
    total = changed = skipped = 0
    for d in dirs:
        html = d / "index.html"
        if not html.is_file():
            continue
        src_text = html.read_text(encoding="utf-8")
        hits = 0
        # .pd-sec 안쪽 구간 — 여기 있는 이미지만 width/height 속성을 쓴다
        secs = [(m.start(), m.end()) for m in SEC.finditer(src_text)]
        in_sec = lambda pos: any(a <= pos < b for a, b in secs)

        def fix(m):
            nonlocal hits, total, skipped
            tag = m.group(0)
            total += 1
            sm = SRC.search(tag)
            if not sm or not sm.group(1).strip():
                skipped += 1
                return tag
            rel = sm.group(1).lstrip("./")
            f = d / rel
            if not f.is_file() or "width=" in tag.lower():
                skipped += 1
                return tag
            wh = dims(f)
            if not wh:
                skipped += 1
                return tag
            if in_sec(m.start()):
                add = f' width="{wh[0]}" height="{wh[1]}"'
            elif "aspect-ratio" in tag.lower():
                skipped += 1
                return tag
            else:
                add = f' style="aspect-ratio: {wh[0]} / {wh[1]}"'
            if "loading=" not in tag.lower():
                add += ' loading="lazy"'
            if "decoding=" not in tag.lower():
                add += ' decoding="async"'
            hits += 1
            # 닫는 부분(`/>` 또는 `>`) 앞에 끼워 넣는다
            return re.sub(r"\s*/?>$", lambda c: add + c.group(0).lstrip(), tag)

        new = IMG.sub(fix, src_text)
        if new != src_text:
            html.write_text(new, encoding="utf-8")
            changed += hits
            print(f"  {d.name:<16} {hits}장")
    print(f"\n<img> {total}개 중 {changed}개에 치수+lazy 추가, {skipped}개 건너뜀")

if __name__ == "__main__":
    main(sys.argv[1:])

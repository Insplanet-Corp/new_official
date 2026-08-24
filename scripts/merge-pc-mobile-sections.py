#!/usr/bin/env python3
"""PC/모바일로 나뉜 .pd-sec 두 장을 <picture> 한 장으로 합친다.

왜 —
  상세는 같은 섹션을 PC 용(.pd-sec--pc)과 모바일용(.pd-sec--m) 두 벌로 들고 다니고
  안 쓰는 쪽을 display:none 으로 숨긴다. **숨겨도 브라우저는 그 이미지를 받는다** —
  실측: t4k 를 1440 에서 열면 화면에 안 나오는 m-sec 7장까지 15장 전부 요청한다.
  loading="lazy" 를 붙여도 마찬가지였다(레이아웃 박스가 없는 이미지는 지연 대상이
  되지 못한다).

  <picture> + <source media> 는 브라우저가 **맞는 것 하나만** 받는다. 휴리스틱이
  아니라 명세라서 확실하다.

바꾸는 모양
  <figure class="pd-sec pd-sec--pc"><img src="sec01.png" …></figure>
  <figure class="pd-sec pd-sec--m"><img src="m-sec01.png" …></figure>
    ->
  <figure class="pd-sec"><picture>
     <source media="(max-width: 1023px)" srcset="m-sec01.png" width height>
     <img src="sec01.png" …>
   </picture></figure>

⚠️ 바로 붙어 있는 pc -> m 짝만 합친다. 짝이 없는 섹션(예: shinhan-03 의 모바일 전용
   한 장)은 그대로 둔다.

사용법:  python3 scripts/merge-pc-mobile-sections.py [폴더...]
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public" / "portfolio"

SEC = re.compile(
    r'<figure class="pd-sec pd-sec--(pc|m)">\s*(<img\b[^>]*>)\s*</figure>', re.I
)
ATTR = lambda tag, name: (m.group(1) if (m := re.search(rf'\b{name}="([^"]*)"', tag, re.I)) else None)


def pairs(kinds):
    """PC 섹션 i 와 짝이 되는 모바일 섹션 j 를 정한다. 확신이 서는 두 배치만 다룬다.

    ⚠️ 문서마다 배치가 다르다 — t4k 는 pc,m,pc,m,... 로 번갈아 있고 hey-young 은
       PC 6장을 몰아 놓은 뒤 모바일 6장이 온다. 처음엔 '바로 뒤에 오는 m' 으로만
       짝지었다가 hey-young 에서 **PC 마지막 장과 모바일 첫 장**이 합쳐졌다.
       배치를 확인하고, 둘 중 어느 쪽도 아니면 그 문서는 건드리지 않는다. """
    n = len(kinds)
    if n % 2 == 0:
        half = n // 2
        if kinds == ["pc", "m"] * half:                       # 번갈아
            return {i: i + 1 for i in range(0, n, 2)}
        if kinds == ["pc"] * half + ["m"] * half:              # 몰아 놓기
            return {i: half + i for i in range(half)}
    return None

def main(argv):
    dirs = [Path(a) for a in argv] or sorted(p.parent for p in ROOT.glob("*/index.html"))
    total = 0
    for d in dirs:
        html = d / "index.html"
        if not html.is_file():
            continue
        text = html.read_text(encoding="utf-8")
        secs = list(SEC.finditer(text))
        if not secs:
            continue

        plan = pairs([m.group(1).lower() for m in secs])
        if plan is None:
            print(f"  {d.name:<16} 배치를 못 알아봐서 건너뜀 "
                  f"({[m.group(1) for m in secs]})")
            continue

        # ⚠️ src 가 비어 있는 짝(내용이 아직 안 채워진 문서)은 합치지 않는다.
        #    그때 모바일 쪽만 지워지면 문서에서 섹션이 통째로 사라진다 — 실제로
        #    digital-trans 에서 그렇게 지워졌다.
        plan = {i: j for i, j in plan.items() if ATTR(secs[j].group(2), "src")}
        drop = set(plan.values())
        out, at, n = [], 0, 0
        for i, m in enumerate(secs):
            out.append(text[at:m.start()])
            at = m.end()
            if i in drop:
                # 짝이 위로 합쳐졌으니 이 섹션은 사라진다 (앞의 공백까지 정리)
                out[-1] = re.sub(r"\s*$", "\n      ", out[-1])
                continue
            if i not in plan:
                out.append(m.group(0))
                continue
            pc = m.group(2)
            mob = secs[plan[i]].group(2)
            src, w, h = ATTR(mob, "src"), ATTR(mob, "width"), ATTR(mob, "height")
            if not src:
                out.append(m.group(0))
                continue
            size = f' width="{w}" height="{h}"' if w and h else ""
            n += 1
            out.append(
                '<figure class="pd-sec">\n'
                "        <picture>\n"
                f'          <source media="(max-width: 1023px)" srcset="{src}"{size}>\n'
                f"          {pc}\n"
                "        </picture>\n"
                "      </figure>"
            )
        out.append(text[at:])
        new = "".join(out)
        if new != text:
            html.write_text(new, encoding="utf-8")
            total += n
            print(f"  {d.name:<16} {n}쌍 -> <picture>")
    print(f"\n{total}쌍 합침")


if __name__ == "__main__":
    main(sys.argv[1:])

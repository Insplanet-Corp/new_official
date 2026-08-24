#!/bin/bash
# public/portfolio/*/img 의 이미지를 화면에 필요한 크기로 줄인다.
#
# 왜 —
#   퍼블리셔가 Figma 에서 뽑은 원본은 폭 4864~5120px 이다. 화면에서 쓰이는 폭은
#   1440 뷰포트에서 1346px, 1920 에서 1792px 이라 4배 가까이 크다.
#   문제는 용량만이 아니라 **디코드 메모리**다 — t4k/sec04.png 는 4864x12031 = 59MP,
#   브라우저가 펼치면 픽셀만 234MB 다. 한 문서에 이런 게 여러 장이라 스크롤이 끊긴다.
#
# 규칙 (파일명·포맷은 그대로 둔다 → HTML 을 고칠 필요가 없다)
#   hero*      2560px   전체 화면 배경이라 조금 더 크게
#   그 외 PC   2000px   1440 에서 1.5배, 1920 에서 1.1배
#   m-*        900px    모바일 전용 (원본이 대부분 656~720 이라 대상이 거의 없다)
#   JPEG 는 줄이면서 quality 80 으로 다시 인코딩한다. PNG 는 알파(둥근 모서리)가
#   실제로 들어 있어 포맷을 바꾸지 않는다 — JPEG 로 바꾸면 모서리에 매트가 낀다.
#
# 원본은 git 에 커밋돼 있다. 되돌리려면:  git checkout -- public/portfolio
#
# 사용법:  ./scripts/optimize-portfolio-images.sh [폴더...]   (인자 없으면 전체)

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="public/portfolio"

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then targets=("$ROOT"/*/); fi

before=0 after=0 touched=0 skipped=0

for dir in "${targets[@]}"; do
  [ -d "$dir/img" ] || continue
  for f in "$dir"/img/*; do
    case "${f##*.}" in
      png|PNG|jpg|JPG|jpeg|JPEG) ;;
      *) continue ;;
    esac

    base=$(basename "$f")
    case "$base" in
      m-*|*mobile*) max=900 ;;
      *hero*)       max=2560 ;;
      *)            max=2000 ;;
    esac

    w=$(sips -g pixelWidth "$f" | awk -F': ' '/pixelWidth/{print $2}')
    sz=$(stat -f%z "$f")
    before=$((before + sz))

    if [ "${w:-0}" -le "$max" ]; then
      after=$((after + sz)); skipped=$((skipped + 1)); continue
    fi

    args=(--resampleWidth "$max")
    case "${f##*.}" in
      jpg|JPG|jpeg|JPEG) args+=(--setProperty formatOptions 80) ;;
    esac

    tmp="${f}.opt"
    if sips "${args[@]}" --out "$tmp" "$f" >/dev/null 2>&1 && [ -s "$tmp" ]; then
      # ⚠️ sips 의 PNG 인코더가 원본(퍼블리셔 도구)보다 나쁠 때가 있다 — 폭을 줄였는데도
      #    파일이 커지는 경우가 실제로 5장 나왔다(최대 0.9MB -> 2.2MB). 그러면 원본을 둔다.
      if [ "$(stat -f%z "$tmp")" -ge "$sz" ]; then
        rm -f "$tmp"
        after=$((after + sz)); skipped=$((skipped + 1))
        printf "  %-42s 그대로 (줄이면 오히려 커진다)\n" "${f#$ROOT/}"
        continue
      fi
      mv "$tmp" "$f"
      new=$(stat -f%z "$f")
      after=$((after + new)); touched=$((touched + 1))
      printf "  %-42s %5.1fMB -> %5.1fMB  (%spx -> %spx)\n" \
        "${f#$ROOT/}" "$(echo "$sz/1048576"|bc -l)" "$(echo "$new/1048576"|bc -l)" "$w" "$max"
    else
      rm -f "$tmp"
      after=$((after + sz))
      echo "  !! 실패, 원본 유지: $f" >&2
    fi
  done
done

printf "\n%d장 축소 · %d장 그대로 | %.0fMB -> %.0fMB (%.0f%% 감소)\n" \
  "$touched" "$skipped" \
  "$(echo "$before/1048576"|bc -l)" "$(echo "$after/1048576"|bc -l)" \
  "$(echo "(1-$after/$before)*100"|bc -l)"

/* 페이지 스크롤 잠금(html.rc-lock + Lenis stop)을 **겹쳐 쓸 수 있게** 세어 준다.

   ⚠️ 세지 않으면 모달 위에 모달이 뜰 때 조용히 풀린다. Careers 팝업(RecruitModal /
   MobileRecruitModal) 안의 동의 문구 링크가 약관·방침 팝업(LegalModal)을 여는데, 그 팝업을
   닫으면 자기 cleanup 이 `rc-lock` 을 지우고 `lenis.start()` 를 부른다 — Careers 팝업은
   그대로 떠 있는데 **뒤 페이지가 스크롤되기 시작한다.** 각 모달이 자기 몫만 반납하고
   마지막 하나가 빠질 때만 실제로 푼다.

   ⚠️ `lenis` 는 잠글 때와 풀 때 **각각** 읽는다 — 그 사이에 런타임이 다시 붙을 수 있다
   (LegacyRuntime 이 문서 로드 뒤 늦게 주입한다). */
type LenisLike = { stop?: () => void; start?: () => void };

const lenis = () => (window as Window & { __lenis?: LenisLike }).__lenis;

let depth = 0;

/** 잠그고, 그 몫을 반납하는 함수를 돌려준다. 반납 함수는 여러 번 불러도 한 번만 센다. */
export function lockScroll(): () => void {
  depth += 1;
  document.documentElement.classList.add('rc-lock');
  lenis()?.stop?.();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth -= 1;
    if (depth > 0) return; // 아직 다른 모달이 잡고 있다
    document.documentElement.classList.remove('rc-lock');
    lenis()?.start?.();
  };
}

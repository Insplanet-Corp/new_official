/* Chapter 02: pinned swap — "Beyond UX" blurs in, then (scroll) it leaves and the closing
   statement takes its place in the SAME centered spot. One pinned area, scroll drives the swap
   (scrubbed by main.js). */
export default function BeyondSwap() {
  return (
    <section className="pin-beyond beyond-swap">
      <div className="pin-beyond-stage">
        <h2 className="beyond-title">
          <span className="line-1">Beyond UX</span>
          <span className="line-2">The AX Creator</span>
        </h2>
        <p className="beyond-statement">
          <span>기술에 가치를 더해,</span>
          <span>내일의 설렘을 완성합니다.</span>
        </p>
      </div>
    </section>
  );
}

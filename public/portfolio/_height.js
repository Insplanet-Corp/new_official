/* 상세화면 HTML 이 자기 높이를 부모에게 알려주는 스크립트.

   퍼블리셔 산출물의 </body> 앞에 이 한 줄을 넣어 주세요:
     <script src="/portfolio/_height.js"></script>

   왜 필요한가 —
   상세 페이지는 iframe 안에 들어가는데, sandbox 를 걸어 두어서(부모의 로그인
   토큰을 못 읽게 하려고) 부모가 iframe 내부 높이를 직접 읽을 수 없다.
   그래서 문서가 스스로 알려줘야 한다. 이게 없으면 iframe 이 기본 높이에 멈춰
   내용이 잘리거나 스크롤바가 두 겹으로 보인다.

   이미지가 늦게 뜨면 높이가 바뀌므로 한 번만 보내지 않고 계속 관찰한다. */
(function () {
  var last = 0;

  function send() {
    var h = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.body ? document.body.offsetHeight : 0,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    if (h && h !== last) {
      last = h;
      parent.postMessage({ __portfolioHeight: h }, '*');
    }
  }

  if (window.ResizeObserver) {
    new ResizeObserver(send).observe(document.documentElement);
  }
  window.addEventListener('load', send);
  window.addEventListener('resize', send);
  // 폰트·이미지가 뒤늦게 반영되는 경우를 위한 보험
  setInterval(send, 500);
  send();
})();

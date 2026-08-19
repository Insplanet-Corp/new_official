/* 상세화면 HTML ↔ 부모(프로젝트 시트) 다리.

   퍼블리셔 산출물의 </body> 앞에 이 한 줄을 넣어 주세요:
     <script src="/portfolio/_shared/bridge.js"></script>

   왜 필요한가 —
   상세는 sandbox iframe 안에서 돌아간다(부모의 로그인 토큰을 못 읽게 하려고).
   그 안에서는 부모를 직접 건드릴 수 없어서, 아래 세 가지를 메시지로 넘긴다.
   주소창에서 이 문서를 단독으로 열면(parent === window) 전부 건너뛴다 —
   그때는 닫기 링크의 href 가 그대로 동작한다.

     1. pdReady  { ownClose } — 이 문서가 자기 닫기 버튼(.pd-close)을 갖고 있는지.
                   갖고 있으면 부모가 자기 X 버튼을 숨긴다(닫기가 두 개로 보이는 것 방지).
     2. pdClose             — 닫기를 눌렀다. sandbox 라 iframe 이 스스로 상위 이동을
                   못 하므로(allow-top-navigation 없음) 부모가 대신 닫는다.
                   ⚠️ 이게 없으면 닫기가 iframe 안에서 목록 페이지를 열어 버린다.
     3. pdMouse  { x, y, grow } — 마우스 좌표. 부모의 커스텀 커서는 부모 문서의
                   mousemove 로 움직이는데, 포인터가 iframe 위에 올라가면 그 이벤트가
                   부모에 도달하지 않아 커서가 그 자리에 멈춘다.
                   iframe 이 시트(=뷰포트) 전체를 덮으므로 좌표는 1:1 로 맞는다. */
(function () {
  if (parent === window) return; // 단독 열람 — 아무것도 하지 않는다

  function post(msg) {
    try {
      parent.postMessage(msg, '*');
    } catch (e) {
      /* 부모가 사라졌을 수 있다 */
    }
  }

  function announce() {
    post({ pdReady: true, ownClose: !!document.querySelector('.pd-close') });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announce);
  } else {
    announce();
  }

  document.addEventListener('click', function (e) {
    var close = e.target.closest ? e.target.closest('.pd-close') : null;
    if (!close) return;
    e.preventDefault();
    post({ pdClose: true });
  });

  /* 커서가 커지는 요소들 — 부모의 GROW_SEL 과 같은 역할을 상세 안에서 한다 */
  var GROW = '.pd-close,.pd-btn,a,button';
  var last = 0;
  document.addEventListener(
    'mousemove',
    function (e) {
      // 프레임당 한 번이면 충분하다 (mousemove 는 그보다 훨씬 자주 온다)
      var now = e.timeStamp || Date.now();
      if (now - last < 16) return;
      last = now;
      post({
        pdMouse: {
          x: e.clientX,
          y: e.clientY,
          grow: !!(e.target.closest && e.target.closest(GROW)),
        },
      });
    },
    { passive: true },
  );
})();

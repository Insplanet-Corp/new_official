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
     3. pdEsc               — ESC 를 눌렀다. 부모의 keydown 리스너는 부모 문서에 달려
                   있어서, 상세 본문을 한 번이라도 클릭해 포커스가 iframe 으로 넘어가면
                   그 뒤로는 ESC 가 부모에 아예 도달하지 않는다(키 이벤트는 프레임
                   경계를 넘지 않는다). 그대로 두면 "아까는 되던 ESC 가 안 된다"가 된다.
     4. pdMouse  { x, y, grow } — 마우스 좌표. 부모의 커스텀 커서는 부모 문서의
                   mousemove 로 움직이는데, 포인터가 iframe 위에 올라가면 그 이벤트가
                   부모에 도달하지 않아 커서가 그 자리에 멈춘다.
                   iframe 이 시트(=뷰포트) 전체를 덮으므로 좌표는 1:1 로 맞는다.

   메시지 말고 하나 더 — **부드러운 스크롤(Lenis)** 도 여기서 띄운다. 아래 주석 참고. */
(function () {
  /* ── 부드러운 스크롤 (Lenis) — 사이트 본문과 같은 감(lerp 0.09) ──────────────────

     왜 이 파일인가 —
     정적 사이트에서는 상세가 부모 문서 안(.ps-scroll)에 주입됐고, 부모의
     js/project-sheet.js 가 시트 전용 Lenis 를 띄워 줬다(startSheetLenis, lerp 0.09).
     지금은 상세가 sandbox iframe 안에서 **자기 문서를** 스크롤하므로 부모가 그 스크롤에
     손댈 수가 없다 — 그래서 이 문서가 직접 띄운다.
     이게 없으면 사이트 전체가 부드러운데 상세 창만 네이티브 스크롤이라 거기서만 뚝뚝 끊긴다.

     ⚠️ parent === window early return 보다 **위**에 둔다 — 상세를 주소창에서 단독으로
        열었을 때도 같은 감이어야 한다.
     ⚠️ _shared/style.css 에 `html.lenis` / `.lenis.lenis-smooth` 규칙이 이미 들어 있다
        (본문 style.css 의 사본). 그 파일을 갈아끼울 때 그 블록을 빼지 말 것 — 빼면
        스크롤이 어긋난다.
     · 스크립트를 못 받거나 구형 브라우저면 조용히 네이티브 스크롤로 남는다(기능은 그대로).
     · rAF 루프는 계속 돈다. 부모가 닫아도 iframe 을 버리지 않기 때문인데, 화면 밖 iframe 의
       rAF 는 브라우저가 스로틀하고 Lenis 는 목표에 도달하면 즉시 반환하므로 무시할 수준이다.
       (본문 페이지의 js/main.js 도 같은 모양의 루프를 쓴다 — 일부러 맞췄다.) */
  (function bootLenis() {
    if (window.__pdLenis) return; // 두 번 부팅 방지
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    var s = document.createElement('script');
    s.src = '/js/vendor/lenis.min.js';
    s.onload = function () {
      if (!window.Lenis) return;
      try {
        var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        window.__pdLenis = lenis;
        (function raf(t) {
          lenis.raf(t);
          requestAnimationFrame(raf);
        })();
      } catch (e) {
        /* 네이티브 스크롤로 남는다 */
      }
    };
    document.head.appendChild(s);
  })();

  if (parent === window) return; // 단독 열람 — 여기부터(부모와의 다리)는 건너뛴다

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

  /* 안전망 — 치수 없는 lazy 이미지는 lazy 를 푼다.

     ⚠️ loading="lazy" 인데 width/height 속성이 없으면 로드 전 높이가 0 이다.
     섹션이 전부 0 높이로 쌓이면 문서가 화면보다 조금만 길어져서, 스크롤로 이미지를
     화면 근처까지 가져갈 수가 없다 → 로드가 안 되고 → 높이도 안 생기는 교착이 된다.
     실제로 kb-app 모바일에서 히어로 아래가 통째로 안 보였다.
     제대로 된 해법은 문서에 width/height 를 적는 것이고(그래야 자리도 미리 잡힌다),
     이건 빠뜨린 문서를 위한 보험이다. */
  // function unlockLazyImages() {
  //   var imgs = document.querySelectorAll('img[loading="lazy"]');
  //   for (var i = 0; i < imgs.length; i++) {
  //     if (!imgs[i].hasAttribute('width') || !imgs[i].hasAttribute('height')) {
  //       imgs[i].setAttribute('loading', 'eager');
  //     }
  //   }
  // }
  // if (document.readyState === 'loading') {
  //   document.addEventListener('DOMContentLoaded', unlockLazyImages);
  // } else {
  //   unlockLazyImages();
  // }

  document.addEventListener('click', function (e) {
    var close = e.target.closest ? e.target.closest('.pd-close') : null;
    if (!close) return;
    e.preventDefault();
    post({ pdClose: true });
  });

  /* ESC 중계. 부모의 닫기와 같은 동작을 하도록 넘기기만 한다.
     ⚠️ 글을 쓰는 중이면 가로채지 않는다 — 상세 문서에 입력 요소가 생길 수 있고,
     한글 입력 조합 중의 ESC 는 조합을 취소하는 키지 화면을 닫는 키가 아니다. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.isComposing || e.keyCode === 229) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    post({ pdEsc: true });
  });

  /* 부모가 알려 주는 공유용 주소 — /projects/<id>.
     iframe 의 location 은 /portfolio/<슬러그>/… 라 Copy URL 이 그대로 쓰면 공유가 안 된다.
     실제 복사는 works.js(컴포넌트 문서) / 문서 자체 인라인 스크립트(kb-app)가 한다. */
  addEventListener('message', function (e) {
    var d = e.data;
    if (d && typeof d === 'object' && typeof d.pdShareUrl === 'string') {
      window.__pdShareUrl = d.pdShareUrl;
    }
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

/* ===== 자석 + 스프링 hover (.pd-close / .pd-btn) =====

   부모 js/main.js 의 #full-menu·#ci-logo 등에 걸린 것과 같은 효과를 상세 안에서 낸다.

   ⚠️ 부모의 그 코드는 여기까지 못 온다 — 이 문서는 sandbox iframe 안이고 출처가
   불투명해서 부모가 contentDocument 를 읽지 못한다(allow-same-origin 은 세션 토큰이
   열리므로 금지). 그래서 같은 스프링을 이 문서 안에서 한 번 더 돌린다.
   상수는 main.js 와 같은 값으로 맞춰 놨다 — 한쪽만 바꾸면 감각이 갈린다.

   ⚠️ 이 블록은 위 브리지 IIFE **밖**에 있어야 한다. 브리지는 `parent === window` 면
   즉시 return 하는데, 이 효과는 부모와 무관하다 — 안에 넣으면 주소창으로 상세를 직접
   열었을 때만 죽는다.

   ⚠️ 움직이는 것은 버튼 자신뿐이다. .pd-close 의 셰브론은 project-detail.css 의
   pd-close-pass keyframe 이 따로 굴린다 — 둘 다 transform 이라 같은 요소에 걸면
   서로 잡아먹는다.

   ⚠️ 요소를 미리 잡아 두지 않고 document 위임으로 찾는다. .pd-close/.pd-btn 은
   works.js 의 <project-detail> 이 그리는데 그 스크립트가 이 파일 **뒤**에 로드되므로,
   여기서 querySelector 를 하면 조용히 null 이다. */
(function () {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  var SEL = '.pd-close,.pd-btn';
  var STRENGTH = 0.5, // 커서 쪽으로 끌리는 정도
    STIFF = 0.12, // 탄성 — 키우면 크게 흔들린다
    DAMP = 0.78, // 감쇠 — 낮추면 빨리 멎는다
    MAX = 20; // 끌림 상한(px)

  var active = []; // 스프링이 아직 돌고 있는 것들
  var hot = null; // 지금 포인터가 올라가 있는 것
  var raf = 0;

  function clamp(v) {
    return Math.max(-MAX, Math.min(MAX, v));
  }

  function stateOf(el) {
    if (!el.__mag) el.__mag = { el: el, tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 };
    return el.__mag;
  }

  /* 멈춰 있는 동안에는 rAF 를 돌리지 않는다 — 상세를 열어 둔 내내 프레임을 태울 이유가 없다 */
  function wake(it) {
    if (active.indexOf(it) === -1) active.push(it);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function release(it) {
    if (!it) return;
    it.tx = 0;
    it.ty = 0;
    wake(it);
  }

  function frame() {
    raf = 0;
    for (var i = active.length - 1; i >= 0; i--) {
      var it = active[i];
      if (!it.el.isConnected) {
        active.splice(i, 1); // 문서에서 빠진 요소(재렌더 등)는 그냥 버린다
        continue;
      }
      it.vx = (it.vx + (it.tx - it.x) * STIFF) * DAMP;
      it.x += it.vx;
      it.vy = (it.vy + (it.ty - it.y) * STIFF) * DAMP;
      it.y += it.vy;
      if (
        it.tx === 0 &&
        it.ty === 0 &&
        Math.abs(it.x) < 0.01 &&
        Math.abs(it.y) < 0.01 &&
        Math.abs(it.vx) < 0.01 &&
        Math.abs(it.vy) < 0.01
      ) {
        it.x = it.y = it.vx = it.vy = 0;
        it.el.style.transform = ''; // 완전히 제자리면 인라인 스타일을 지운다
        active.splice(i, 1);
        continue;
      }
      it.el.style.transform = 'translate(' + it.x.toFixed(2) + 'px,' + it.y.toFixed(2) + 'px)';
    }
    if (active.length) raf = requestAnimationFrame(frame);
  }

  document.addEventListener(
    'mousemove',
    function (e) {
      var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (hot && hot.el !== el) {
        release(hot); // 다른 요소로 옮겨갔거나 빈 곳으로 나갔다
        hot = null;
      }
      if (!el) return;
      hot = stateOf(el);
      var r = el.getBoundingClientRect();
      // 지금 걸려 있는 translate 를 빼고 원래 중심을 구한다 — 안 그러면 목표가 스스로를 밀어낸다
      hot.tx = clamp((e.clientX - (r.left + r.width / 2 - hot.x)) * STRENGTH);
      hot.ty = clamp((e.clientY - (r.top + r.height / 2 - hot.y)) * STRENGTH);
      wake(hot);
    },
    { passive: true },
  );

  /* 포인터가 문서 밖으로 나가면 mousemove 가 더 오지 않는다 — 밀린 자리에 굳지 않게 풀어 준다 */
  document.addEventListener('mouseleave', function () {
    release(hot);
    hot = null;
  });
})();

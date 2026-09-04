(function () {
  var CHEVRON =
    '<svg viewBox="0 0 44.3077 44.3077" fill="none" aria-hidden="true">' +
    '<path d="M14.7695 19.3066L22.1553 26.0709L29.5387 19.3066" stroke="currentColor" ' +
    'stroke-width="2.2154" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_LINK =
    '<svg class="pd-btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M9 8H16V15M16 8L8 16" stroke="currentColor" stroke-width="1.5"/></svg>';
  var ICON_COPY =
    '<svg class="pd-btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M11.437 8.059L12.563 6.933C13.807 5.689 15.823 5.689 17.067 6.933C18.311 8.177 18.311 10.193 17.067 11.437L15.941 12.563M12.563 15.941L11.437 17.067C10.193 18.311 8.177 18.311 6.933 17.067C5.689 15.823 5.689 13.807 6.933 12.563L8.059 11.437M9.185 14.815L14.815 9.185" ' +
    'stroke="currentColor" stroke-width="1.5"/></svg>';

  /* 푸터 문구 — src/data/site.ts 의 CONTACT / FOOTER_LINKS 와 같은 값.
     ⚠️ 회사 주소·연락처가 바뀌면 그쪽과 여기를 같이 고칠 것 (상세는 별개 문서라 공유가 안 된다). */
  var FOOTER = {
    links: ["ROAI", "Inspick", "Archy"],
    address: "서울특별시 중구 퇴계로27길 49, 2층 (저동2가, 센트럴에스빌딩)",
    email: "hello@insplanet.co.kr",
    tel: "02.2088.5084",
    fax: "02.2088.5184",
    copyright: "Ⓒ 2026. Insplanet all right reserved.",
  };

  // 속성값은 작성자가 쓰지만 그대로 innerHTML 에 넣으므로 이스케이프한다
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  /** 'a|b' -> 'a<br>b'. cls 를 주면 그 클래스가 붙은 <br> (모바일 전용 줄바꿈).
      ⚠️ 모바일 전용 줄바꿈은 <br> 앞에 공백을 넣는다 — PC 에서는 그 <br> 이 display:none 이라
      공백이 없으면 'ShinhanSecurities' 처럼 두 단어가 붙어 버린다 (kb-app 도 같은 이유로
      원본 마크업에 공백이 들어 있다). */
  function lines(v, cls) {
    var br = cls ? ' <br class="' + cls + '">' : "<br>";
    return esc(v).split("|").join(br);
  }

  // function footerHtml() {
  //   return (
  //     '<footer class="footer">' +
  //     '<div class="footer-logo" role="img" aria-label="Insplanet">' +
  //     // 워드마크와 행성을 따로 겹쳐 둔다 — CSS 가 각각 다른 타이밍으로 리빌한다
  //     '<img class="footer-wordmark" src="/portfolio/_shared/footer-wordmark.svg" alt="" aria-hidden="true">' +
  //     '<img class="footer-planet" src="/portfolio/_shared/footer-planet.svg" alt="" aria-hidden="true">' +
  //     "</div>" +
  //     '<div class="footer-bottom">' +
  //     '<div class="footer-left">' +
  //     '<nav class="footer-links">' +
  //     FOOTER.links
  //       .map(function (l) {
  //         return '<a href="#">' + esc(l) + "</a>";
  //       })
  //       .join("") +
  //     "</nav>" +
  //     '<p class="footer-copy">' +
  //     esc(FOOTER.copyright) +
  //     "</p>" +
  //     "</div>" +
  //     '<div class="footer-contact">' +
  //     "<p>" +
  //     esc(FOOTER.address) +
  //     "</p>" +
  //     "<p>E&nbsp;&nbsp;" +
  //     esc(FOOTER.email) +
  //     "</p>" +
  //     '<p class="footer-tf"><span>T&nbsp;&nbsp;' +
  //     esc(FOOTER.tel) +
  //     "</span>" +
  //     "<span>F&nbsp;&nbsp;" +
  //     esc(FOOTER.fax) +
  //     "</span></p>" +
  //     "</div>" +
  //     "</div>" +
  //     "</footer>"
  //   );
  // }

  function render(el) {
    var a = function (n) {
      return el.getAttribute(n) || "";
    };
    /* 원래 자식(문서 본문)을 잠시 빼 둔다 — innerHTML 로 껍데기를 그린 뒤 밴드 안으로 넣는다.
       ⚠️ 통째로 옮기지 않으면 Overview 아래부터 좌우 여백·간격이 끊긴다. */
    var content = document.createDocumentFragment();
    while (el.firstChild) content.appendChild(el.firstChild);
    var heroM = a("hero-mobile");
    var platform = a("platform");

    var picture = heroM
      ? '<picture><source media="(max-width:1023px)" srcset="' +
        esc(heroM) +
        '"><img class="pd-hero-bg" src="' +
        esc(a("hero")) +
        '" alt="" loading="eager" decoding="async"></picture>'
      : '<img class="pd-hero-bg" src="' +
        esc(a("hero")) +
        '" alt="" loading="eager" decoding="async">';

    var info = "";
    if (a("client"))
      info += "<div><dt>Client</dt><dd>" + esc(a("client")) + "</dd></div>";
    if (a("launch"))
      info += "<div><dt>Launch</dt><dd>" + esc(a("launch")) + "</dd></div>";

    el.innerHTML =
      '<main class="pd">' +
      '<section class="pd-hero">' +
      picture +
      '<div class="pd-hero-ci" aria-hidden="true"><img src="/assets/ci_logo_white.svg" alt=""></div>' +
      // 시트 안에서는 bridge.js 가 클릭을 가로채고, 단독으로 열면 이 href 가 동작한다
      '<a class="pd-close" href="/projects" aria-label="닫기">' +
      CHEVRON +
      "</a>" +
      '<h1 class="pd-hero-title">' +
      '<span class="ko">' +
      lines(a("ko"), "pd-m-only") +
      "</span>" +
      '<span class="en pd-title-en">' +
      lines(a("en"), "pd-m-only") +
      "</span>" +
      "</h1>" +
      (info ? '<dl class="pd-hero-info">' + info + "</dl>" : "") +
      '<div class="pd-hero-scroll" aria-hidden="true"><span class="bar"></span><span class="label">SCROLL</span></div>' +
      "</section>" +
      '<div class="pd-secs">' +
      '<section class="pd-summary">' +
      '<h2 class="pd-summary-head">Overview</h2>' +
      '<div class="pd-summary-body">' +
      '<h3 class="pd-summary-title">' +
      lines(a("overview-title"), "pd-m-only") +
      "</h3>" +
      '<p class="pd-summary-text">' +
      lines(a("overview-text")) +
      "</p>" +
      '<div class="pd-summary-actions">' +
      // '<a class="pd-btn pd-btn--primary" href="' + esc(platform) + '" target="_blank" rel="noopener">' +
      // '<span class="pd-btn-label">View Platform</span>' + ICON_LINK + '</a>' +
      '<button type="button" class="pd-btn pd-btn--copy">' +
      '<span class="pd-btn-label">Copy URL</span>' +
      ICON_COPY +
      "</button>" +
      "</div>" +
      "</div>" +
      "</section>" +
      "</div>" +
      "</main>";
    // footerHtml();

    // 본문을 Overview 카드 뒤, 같은 밴드 안에 붙인다
    el.querySelector(".pd-secs").appendChild(content);

    arm(el);
    armFooter(el);
  }

  /* 밴드 안 블록들의 스크롤 인 — kb-app 의 인라인 스크립트와 같은 동작.
     .pd.rv 가 붙어야 CSS 가 숨기므로, JS 가 없으면 그냥 보인다.

     ⚠️ `.pd.rv` 는 `.pd-summary` 와 `.pd-sec` 을 **둘 다** 숨긴다. 그러니 관찰도 둘 다
     해야 한다. 처음에 Overview 카드만 관찰했더니 kb-app 의 섹션 12장이 armed 상태로
     남아 opacity:0 인 채 영영 안 보였다 — Overview 아래가 통째로 빈 화면이 됐다.
     (다른 문서들은 본문이 .pd-sec 이 아니라 드러나지 않았다.)
     숨기는 선택자를 늘리면 여기 관찰 목록도 같이 늘릴 것. */
  var REVEAL_SEL = ".pd-summary,.pd-sec";
  function arm(el) {
    var main = el.querySelector("main.pd");
    if (!main) return;
    var targets = main.querySelectorAll(REVEAL_SEL);
    if (!targets.length) return;
    if (
      matchMedia("(prefers-reduced-motion:reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    main.classList.add("rv");
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    for (var i = 0; i < targets.length; i++) io.observe(targets[i]);
  }

  /* 푸터 리빌 — 사이트의 public/js/main.js 가 하는 것과 같다(.footer.in 이면 워드마크가
     블러에서 올라오고 행성이 뒤따라 도착한다). 여기서는 그 런타임이 없으므로 직접 건다. */
  function armFooter(el) {
    var footer = el.querySelector(".footer");
    if (!footer) return;
    if (
      matchMedia("(prefers-reduced-motion:reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      footer.classList.add("in");
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(footer);
  }

  if ("customElements" in window) {
    customElements.define(
      "project-detail",
      class extends HTMLElement {
        connectedCallback() {
          if (!this.__rendered) {
            this.__rendered = true;
            render(this);
          }
        }
      },
    );
  }

  /* ---- 버튼 동작 ---------------------------------------------------------------------------------
     ⚠️ 예전 kb-app 은 자기 인라인 스크립트로 같은 일을 했다. 컴포넌트로 옮기면서 그 스크립트를
     지웠다 — 둘 다 있으면 복사가 두 번 일어난다. 새 문서에 옛 인라인 스크립트를 넣지 말 것. */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".pd-btn") : null;
    if (!btn) return;

    // 주소를 아직 안 넣은 View Platform: 눌러도 아무 일이 없어야 한다
    // (href="" 는 현재 페이지를 새 탭에 여는 것과 같다)
    if (
      btn.classList.contains("pd-btn--primary") &&
      !btn.getAttribute("href")
    ) {
      e.preventDefault();
      return;
    }
    if (!btn.classList.contains("pd-btn--copy")) return;
    e.preventDefault();

    /* 복사할 주소 — 시트 안에서는 부모가 알려 준 /projects/<id> 를 쓴다.
       iframe 의 location 은 /portfolio/<슬러그>/… 라 그대로 복사하면 공유가 안 된다.
       bridge.js 가 부모 응답을 window.__pdShareUrl 에 담아 둔다. */
    var url = window.__pdShareUrl || location.href;

    function hint() {
      var h = btn.querySelector(".pd-copy-hint");
      if (!h) {
        h = document.createElement("span");
        h.className = "pd-copy-hint";
        h.setAttribute("role", "status");
        h.textContent = "URL이 복사되었습니다";
        btn.appendChild(h);
      }
      h.classList.add("is-on");
      clearTimeout(btn.__copyTimer);
      btn.__copyTimer = setTimeout(function () {
        h.classList.remove("is-on");
      }, 1600);
    }
    // sandbox iframe 은 불투명 출처라 clipboard API 가 막힌다 — 폴백이 실제 경로다
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        /* 안 되면 조용히 넘어간다 */
      }
      document.body.removeChild(ta);
      hint();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(hint, fallback);
    } else fallback();
  });
})();

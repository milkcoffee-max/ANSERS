/* ANSERS 홈페이지 스크립트
   1) 화면 비율 고정 스케일링 (본문은 90% 크기)
   2) 등장 애니메이션: 폰트와 첫 화면 이미지 준비가 끝난 뒤 시작, 화면에 다시 들어오면 재생
   3) 숫자 카운트, 헤더 배경, 페이지 이동 페이드 */
(function () {
  var DESIGN_W = 1920;
  var MIN_VISIBLE_H = 900;
  var CONTENT_SCALE = 0.9;    // 메뉴를 제외한 본문 크기 비율
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 페이지에 들어오면 항상 맨 위에서 시작 (#contact 같은 앵커가 있으면 그 위치)
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  function fit() {
    var w = root.clientWidth || window.innerWidth;
    var s = Math.min(w / DESIGN_W, window.innerHeight / MIN_VISIBLE_H);
    root.style.setProperty("--s", s.toFixed(5));
    var z = s * CONTENT_SCALE;
    root.style.setProperty("--z", z.toFixed(5));
    // 가운데 정렬 여백 (축소 전 좌표 기준으로 계산)
    root.style.setProperty("--mh", ((w - DESIGN_W * s) / 2 / s).toFixed(2) + "px");
    root.style.setProperty("--mz", ((w - DESIGN_W * z) / 2 / z).toFixed(2) + "px");
  }
  fit();

  document.addEventListener("DOMContentLoaded", function () {
    fit();
    var hdr = document.querySelector(".hdr");
    var secs = [].slice.call(document.querySelectorAll(".sec"));

    // ---------- 등장 애니메이션 준비 ----------
    // data-grp가 같은 요소(이미지와 캡션 등)는 한 묶음으로 동시에 등장
    var units = [];
    secs.forEach(function (sec) {
      var kids = [].slice.call(sec.children).sort(function (a, b) {
        return (a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft);
      });
      var groups = {}, i = 0;
      kids.forEach(function (el) {
        if (!el.dataset.a) {
          if (el.tagName === "IMG") el.dataset.a = "zoom";
          else if (/^H[1-3]$/.test(el.tagName) || el.classList.contains("big-word")) el.dataset.a = "blur";
          else el.dataset.a = "up";
        }
        if (el.dataset.a === "none") return;
        var g = el.dataset.grp;
        if (g && groups[g]) {
          groups[g].members.push(el);
          if (el.dataset.d == null) el.style.setProperty("--d", groups[g].delay);
        } else {
          var delay = Math.min(i * 0.08, 0.6).toFixed(2) + "s"; i++;
          var u = { trigger: el, members: [el], delay: delay };
          if (g) groups[g] = u;
          units.push(u);
          if (el.dataset.d == null) el.style.setProperty("--d", delay);
        }
        if (el.dataset.d != null) el.style.setProperty("--d", el.dataset.d + "s");
      });
    });

    function show(u) {
      if (!u || u.on) return;
      u.on = true;
      u.members.forEach(function (el) {
        el.classList.add("in");
        var c = el.matches("[data-count]") ? el : el.querySelector("[data-count]");
        if (c) countUp(c);
      });
    }
    function hide(u) {
      if (!u || !u.on) return;
      u.on = false;
      u.members.forEach(function (el) { el.classList.remove("in"); });
    }

    if (!location.hash) window.scrollTo(0, 0);
    else {
      var anchor = document.querySelector(location.hash);
      if (anchor) { root.style.scrollBehavior = "auto"; anchor.scrollIntoView(); root.style.scrollBehavior = ""; }
    }

    // 폰트와 첫 화면 이미지가 준비된 다음 애니메이션 시작 (로딩 중에 재생되며 끊기는 현상 방지, 최대 1.5초 대기)
    var started = false;
    function start() {
      if (started) return; started = true;
      if (reduce || !("IntersectionObserver" in window)) { units.forEach(show); return; }
      var byEl = new Map();
      units.forEach(function (u) { byEl.set(u.trigger, u); });
      // 화면 아래쪽 10% 안으로 들어오면 재생
      var ioIn = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) show(byEl.get(e.target)); });
      }, { rootMargin: "0px 0px -10% 0px" });
      // 화면 밖으로 완전히 나가면 초기화 → 다시 돌아오면 또 재생
      var ioOut = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (!e.isIntersecting) hide(byEl.get(e.target)); });
      }, { rootMargin: "80px 0px 80px 0px" });
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        units.forEach(function (u) { ioIn.observe(u.trigger); ioOut.observe(u.trigger); });
      }); });
    }
    var waits = [];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    [].slice.call(document.querySelectorAll(".sec img")).forEach(function (img) {
      var r = img.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.2 && img.decode) waits.push(img.decode().catch(function () {}));
    });
    if (window.Promise && waits.length) Promise.all(waits).then(start, start); else start();
    setTimeout(start, 1500);

    // 뒤로가기 등으로 페이지에 다시 돌아오면 맨 위에서 애니메이션 다시 재생
    window.addEventListener("hashchange", function () { document.body.classList.remove("leaving"); });
    window.addEventListener("pageshow", function (e) {
      document.body.classList.remove("leaving");
      if (!e.persisted) return;
      units.forEach(hide);
      if (!location.hash) window.scrollTo(0, 0);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        units.forEach(function (u) {
          var r = u.trigger.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.9 && r.bottom > 0) show(u);
        });
      }); });
    });

    // ---------- 헤더 배경 ----------
    var scrolled = null;
    function onScroll() {
      var s = window.scrollY > 8;
      if (s !== scrolled && hdr) { scrolled = s; hdr.classList.toggle("scrolled", s); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", fit);
    onScroll();

    // "Product detail", "Learn more" 클릭: 다음 화면으로 부드럽게 이동
    [].slice.call(document.querySelectorAll('.more[href^="#"]')).forEach(function (a) {
      a.addEventListener("click", function (e) {
        var t = document.querySelector(a.getAttribute("href"));
        if (!t) return;
        e.preventDefault();
        // 다음 화면이 메뉴 아래 영역의 가운데에 오도록 이동 (그 다음 화면 내용이 걸쳐 보이지 않게)
        var r = t.getBoundingClientRect();
        var hh = hdr ? hdr.getBoundingClientRect().height : 0;
        var y = r.top + window.scrollY + (r.height - window.innerHeight - hh) / 2;
        window.scrollTo({ top: Math.min(r.top + window.scrollY, y), behavior: reduce ? "auto" : "smooth" });
      });
    });
    // 화살표 버튼(About ANSERS, Product detail, Learn more)이 있는 첫 화면에서 아래로 스크롤하면
    // 버튼을 누른 것과 똑같이 다음 화면(또는 다음 페이지)으로 부드럽게 넘어감
    var firstMore = secs[0] && secs[0].querySelector(".more");
    if (firstMore) {
      var lock = false;
      var inFirst = function () {
        var next = secs[1];
        return !next || window.scrollY < next.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5;
      };
      var trigger = function () {
        lock = true;
        firstMore.click();
        setTimeout(function () { lock = false; }, 1000);
      };
      window.addEventListener("wheel", function (e) {
        if (lock) { if (e.deltaY > 0) e.preventDefault(); return; }
        if (e.deltaY > 4 && inFirst()) { e.preventDefault(); trigger(); }
      }, { passive: false });
      window.addEventListener("keydown", function (e) {
        if (!lock && inFirst() && ["ArrowDown", "PageDown", " "].indexOf(e.key) >= 0) { e.preventDefault(); trigger(); }
      });
      var ty = null;
      window.addEventListener("touchstart", function (e) { ty = e.touches[0].clientY; }, { passive: true });
      window.addEventListener("touchmove", function (e) {
        if (ty == null) return;
        if (lock) { e.preventDefault(); return; }
        if (ty - e.touches[0].clientY > 30 && inFirst()) { e.preventDefault(); ty = null; trigger(); }
      }, { passive: false });
    }

    // 다른 페이지로 갈 때 페이드 아웃
    [].slice.call(document.querySelectorAll("a[href$='.html'], a[href*='.html#']")).forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        var href = a.getAttribute("href");
        var url = new URL(href, location.href);
        // 같은 페이지 안에서의 이동(예: About us ↔ Contact)은 페이드 없이 그 위치로 부드럽게 스크롤
        // (해시만 바뀌면 페이지가 다시 로드되지 않아 페이드 아웃된 검은 화면이 남는 문제 방지)
        if (url.pathname === location.pathname) {
          e.preventDefault();
          var target = url.hash ? document.querySelector(url.hash) : null;
          var y = target ? target.getBoundingClientRect().top + window.scrollY : 0;
          window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
          history.replaceState(null, "", url.hash || location.pathname);
          return;
        }
        if (reduce) return;
        e.preventDefault();
        document.body.classList.add("leaving");
        setTimeout(function () { location.href = href; }, 280);
      });
    });

    // ---------- Contact 섹션이 보이면 메뉴 강조 전환 ----------
    var contact = document.getElementById("contact");
    var aboutLink = document.querySelector('.nav a[data-nav="about"]');
    var contactLink = document.querySelector('.nav a[data-nav="contact"]');
    if (contact && aboutLink && contactLink && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        contactLink.classList.toggle("on", vis);
        aboutLink.classList.toggle("on", !vis);
      }, { threshold: 0.5 }).observe(contact);
    }
  });

  function countUp(el) {
    var to = parseFloat(el.dataset.count), t0 = null, dur = 1400;
    if (reduce) return;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = "0";
    requestAnimationFrame(step);
  }
})();

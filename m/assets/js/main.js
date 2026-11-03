/* ANSERS 모바일 스크립트
   1) 전체화면 메뉴 열기/닫기
   2) 등장 애니메이션: 화면에 들어오면 재생, 완전히 벗어나면 초기화해서 다시 볼 때 또 재생
   3) 숫자 카운트, Applications 카드 넘김 표시, 페이지 이동 페이드 */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  document.addEventListener("DOMContentLoaded", function () {
    var body = document.body;

    // ---------- 메뉴 ----------
    var burger = document.querySelector(".burger");
    function setMenu(open) {
      body.classList.toggle("menu-open", open);
      document.documentElement.classList.toggle("menu-open", open);
      if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (burger) burger.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });

    // ---------- 등장 애니메이션 ----------
    // 섹션마다 순서대로 약간씩 늦게 등장 (data-grp가 같으면 함께)
    var els = [].slice.call(document.querySelectorAll(".rv"));
    var prev = null, k = 0;
    els.forEach(function (el) {
      var sec = el.closest(".sec");
      if (sec !== prev) { prev = sec; k = 0; }
      if (el.dataset.d == null) el.style.setProperty("--d", Math.min(k * 0.07, 0.42).toFixed(2) + "s");
      else el.style.setProperty("--d", el.dataset.d + "s");
      k++;
    });
    function show(el) {
      if (el.classList.contains("in")) return;
      el.classList.add("in");
      var c = el.matches("[data-count]") ? el : el.querySelector("[data-count]");
      if (c) countUp(c);
    }

    if (location.hash) {
      var anchor = document.querySelector(location.hash);
      if (anchor) anchor.scrollIntoView();
    } else window.scrollTo(0, 0);

    var started = false;
    function start() {
      if (started) return; started = true;
      if (reduce || !("IntersectionObserver" in window)) { els.forEach(show); return; }
      var ioIn = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) show(e.target); });
      }, { rootMargin: "0px 0px -8% 0px" });
      var ioOut = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting) e.target.classList.remove("in"); });
      }, { rootMargin: "60px 0px 60px 0px" });
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        els.forEach(function (el) { ioIn.observe(el); ioOut.observe(el); });
      }); });
    }
    // 폰트와 첫 화면 이미지가 준비된 뒤 시작 (최대 1.5초 대기)
    var waits = [];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    [].slice.call(document.querySelectorAll("main img")).forEach(function (img) {
      if (img.getBoundingClientRect().top < window.innerHeight * 1.1 && img.decode) waits.push(img.decode().catch(function () {}));
    });
    if (window.Promise && waits.length) Promise.all(waits).then(start, start); else start();
    setTimeout(start, 1500);

    window.addEventListener("pageshow", function (e) {
      body.classList.remove("leaving");
      setMenu(false);
      if (e.persisted) {
        els.forEach(function (el) { el.classList.remove("in"); });
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          els.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight * .92 && r.bottom > 0) show(el); });
        }); });
      }
    });
    window.addEventListener("hashchange", function () { body.classList.remove("leaving"); });

    // ---------- 같은 페이지 안 이동 (Product detail, Contact 등) ----------
    var hh = function () { var h = document.querySelector(".hdr"); return h ? h.getBoundingClientRect().height : 0; };
    function goTo(target) {
      var y = target.getBoundingClientRect().top + window.scrollY - hh();
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
    [].slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (a) {
      a.addEventListener("click", function (e) {
        var t = document.querySelector(a.getAttribute("href"));
        if (!t) return;
        e.preventDefault(); goTo(t);
      });
    });

    // ---------- 다른 페이지로 갈 때 페이드 ----------
    [].slice.call(document.querySelectorAll("a[href$='.html'], a[href*='.html#']")).forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        var href = a.getAttribute("href");
        var url = new URL(href, location.href);
        if (url.pathname === location.pathname) {
          // 같은 페이지: 메뉴를 닫고 해당 위치로 스크롤 (페이드 없음)
          e.preventDefault(); setMenu(false);
          var t = url.hash ? document.querySelector(url.hash) : null;
          if (t) goTo(t); else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
          history.replaceState(null, "", url.hash || location.pathname);
          return;
        }
        if (reduce) return;
        e.preventDefault();
        body.classList.add("leaving");
        setTimeout(function () { location.href = href; }, 260);
      });
    });

    // ---------- Applications 카드: 가운데 카드 강조 + 점 표시 ----------
    var track = document.querySelector(".cards");
    if (track) {
      var cards = [].slice.call(track.children);
      var dots = [].slice.call(document.querySelectorAll(".dots i"));
      var cur = -1;
      var mark = function () {
        var mid = track.getBoundingClientRect().left + track.clientWidth / 2, best = 0, bd = 1e9;
        cards.forEach(function (c, i) {
          var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
          if (d < bd) { bd = d; best = i; }
        });
        if (best === cur) return; cur = best;
        cards.forEach(function (c, i) { c.classList.toggle("cur", i === best); });
        dots.forEach(function (d, i) { d.classList.toggle("on", i === best); });
      };
      track.addEventListener("scroll", function () { requestAnimationFrame(mark); }, { passive: true });
      dots.forEach(function (d, i) {
        d.addEventListener("click", function () {
          var c = cards[i];
          track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
        });
      });
      mark();
    }

    // ---------- Contact가 보이면 메뉴 강조 전환 ----------
    var contact = document.getElementById("contact");
    var aboutLink = document.querySelector('.menu a[data-nav="about"]');
    var contactLink = document.querySelector('.menu a[data-nav="contact"]');
    if (contact && aboutLink && contactLink && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        contactLink.classList.toggle("on", vis);
        aboutLink.classList.toggle("on", !vis);
      }, { threshold: 0.4 }).observe(contact);
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

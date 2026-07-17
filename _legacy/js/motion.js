/* ==========================================================================
   MECH-TECH — motion.js
   Reusable motion system: hero intro, word-level heading reveals, staggered
   scroll reveals, scrollspy underline, parallax, micro-interactions.

   The VARIANTS map mirrors Framer Motion's `variants` API, so if the site
   ever moves to React/Next.js these values lift 1:1 into
   <motion.div variants={...}> definitions.

   Rules honoured throughout:
   - GPU-accelerated transforms + opacity only (no width/height/layout props)
   - Reveals trigger once, at ~0.2 viewport amount
   - prefers-reduced-motion disables everything (CSS + this early return)
   - No content is ever left hidden if JS fails (see fail-visible catch)
   ========================================================================== */
(function () {
  "use strict";

  var docEl = document.documentElement;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("animate" in Element.prototype) || !("IntersectionObserver" in window)) {
    // Drop the js-motion hook so no CSS initial-hidden state applies.
    docEl.classList.remove("js-motion");
    return;
  }

  var EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
  var EASE_SPRING = "cubic-bezier(0.34, 1.45, 0.64, 1)";

  /* ---------- Reusable variants (Framer Motion-style) ---------- */
  var VARIANTS = {
    fadeInUp:   { from: { opacity: 0, transform: "translateY(40px)" },   duration: 700, easing: EASE_OUT },
    fadeInUpSm: { from: { opacity: 0, transform: "translateY(24px)" },   duration: 650, easing: EASE_OUT },
    wordUp:     { from: { opacity: 0, transform: "translateY(0.55em)" }, duration: 600, easing: EASE_OUT },
    ruleGrow:   { from: { opacity: 0, transform: "scaleX(0)" },          duration: 700, easing: EASE_OUT },
    popIn:      { from: { opacity: 0, transform: "scale(0.6)" },         duration: 500, easing: EASE_SPRING }
  };
  var STAGGER = { words: 55, cards: 90, featurebar: 90 }; // ms between children

  /* WAAPI equivalent of Framer Motion's initial -> animate.
     fill:"backwards" holds the hidden from-state through the delay; the
     inline opacity:1 becomes the resting state once the animation ends. */
  function animateIn(el, variantName, delay) {
    var v = VARIANTS[variantName];
    el.style.opacity = "1";
    el.animate(
      [
        { opacity: v.from.opacity, transform: v.from.transform },
        { opacity: 1, transform: "none" }
      ],
      { duration: v.duration, delay: delay || 0, easing: v.easing, fill: "backwards" }
    );
  }

  /* Split a heading into word spans (keeps <br>/<em> intact, keeps wrap
     points identical, exposes the original text to assistive tech). */
  function splitWords(root) {
    var words = [];
    root.setAttribute("aria-label", root.textContent.replace(/\s+/g, " ").trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
            } else {
              var span = document.createElement("span");
              span.className = "m-word";
              span.textContent = part;
              frag.appendChild(span);
              words.push(span);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.nodeName !== "BR") {
          walk(child);
        }
      });
    })(root);
    return words;
  }

  try {

    /* ================= 1. Hero intro: staggered load sequence ============ */
    var heroTitle = document.querySelector(".hero__title");
    var heroRule = document.querySelector(".hero__rule");
    var heroSub = document.querySelector(".hero__sub");
    var heroBtns = document.querySelectorAll(".hero__actions .btn");

    if (heroTitle) {
      var heroWords = splitWords(heroTitle);
      heroTitle.style.opacity = "1"; // words now carry the hidden state
      heroWords.forEach(function (w, i) {
        w.style.opacity = "0";
        animateIn(w, "wordUp", 120 + i * STAGGER.words);
      });
    }
    if (heroRule) {
      heroRule.style.transformOrigin = "left center";
      animateIn(heroRule, "ruleGrow", 430);
    }
    if (heroSub) animateIn(heroSub, "fadeInUpSm", 540);
    heroBtns.forEach(function (btn, i) {
      animateIn(btn, "fadeInUpSm", 680 + i * 110);
    });

    /* Floating WhatsApp pill pops in after the intro settles */
    var floatWa = document.querySelector(".float-whatsapp");
    if (floatWa) animateIn(floatWa, "popIn", 1400);

    /* ============ 2. Word-level reveals for major section headings ======= */
    var wordMap = new WeakMap();
    var headingIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        headingIO.unobserve(entry.target);
        (wordMap.get(entry.target) || []).forEach(function (w, i) {
          animateIn(w, "wordUp", i * 60);
        });
      });
    }, { threshold: 0.5 });

    document.querySelectorAll(".section-title, .cta-banner h2").forEach(function (h) {
      if (h.closest(".hero")) return;
      var words = splitWords(h);
      words.forEach(function (w) { w.style.opacity = "0"; });
      wordMap.set(h, words);
      headingIO.observe(h);
    });

    /* ====== 3. Staggered reveal for the feature bar (once, amount 0.2) ==== */
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("m-in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll(".featurebar__item").forEach(function (el, i) {
      el.classList.add("m-reveal");
      el.style.setProperty("--m-delay", (i * STAGGER.featurebar / 1000).toFixed(2) + "s");
      revealIO.observe(el);
    });

    /* Cards: once their entrance reveal finishes, switch them to snappy
       spring transitions so hover isn't slowed by the entrance timing */
    document.addEventListener("transitionend", function (e) {
      var el = e.target;
      if (el.classList && el.classList.contains("reveal") && el.classList.contains("is-visible")) {
        el.classList.add("m-settled");
      }
    });

    /* ============ 4. Scrollspy: animated active-link underline ============ */
    var navLinks = document.querySelectorAll(".nav > .nav__list .nav__link");
    var sections = [];
    navLinks.forEach(function (link) {
      var hash = link.getAttribute("href");
      if (!hash || hash.charAt(0) !== "#") return;
      var section = document.querySelector(hash);
      if (section) sections.push(section);
    });

    function setActive(hash) {
      navLinks.forEach(function (link) {
        var on = link.getAttribute("href") === hash;
        link.classList.toggle("is-active", on);
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }

    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive("#" + entry.target.id);
      });
    }, { rootMargin: "-35% 0px -60% 0px", threshold: 0 });
    sections.forEach(function (s) { spyIO.observe(s); });

    /* ================= 5. Subtle parallax (10–30px, GPU only) ============= */
    /* Uses the independent CSS `translate` property so it never fights the
       transform-based reveal transitions on the same elements. */
    if (window.CSS && CSS.supports && CSS.supports("translate", "0px")) {
      var hero = document.querySelector(".hero");
      var parallaxItems = [];
      var videoFrame = document.querySelector(".video-frame");
      var ctaBanner = document.querySelector(".cta-banner");
      if (videoFrame) parallaxItems.push({ el: videoFrame, factor: 0.05, max: 14, y: 0 });
      if (ctaBanner) parallaxItems.push({ el: ctaBanner, factor: 0.04, max: 10, y: 0 });

      var ticking = false;
      var update = function () {
        ticking = false;
        if (hero) {
          var hy = Math.min(26, window.scrollY * 0.12);
          hero.style.setProperty("--m-parallax-hero", hy.toFixed(1) + "px");
        }
        var mid = window.innerHeight / 2;
        parallaxItems.forEach(function (it) {
          var r = it.el.getBoundingClientRect();
          if (r.bottom < -80 || r.top > window.innerHeight + 80) return;
          var center = r.top + r.height / 2 - it.y; // untranslated centre
          var y = Math.max(-it.max, Math.min(it.max, (mid - center) * it.factor));
          it.y = y;
          it.el.style.translate = "0 " + y.toFixed(1) + "px";
        });
      };
      var onScroll = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      update();
    }

  } catch (err) {
    // Fail visible: strip the motion hook so no CSS keeps content hidden,
    // and clear any inline hidden state already applied to word spans.
    docEl.classList.remove("js-motion");
    document.querySelectorAll(".m-word").forEach(function (w) { w.style.opacity = ""; });
    if (window.console && console.error) console.error("[motion]", err);
  }
})();

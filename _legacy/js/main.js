/* ==========================================================================
   MECH-TECH — interactions (multi-page)
   Sticky header, mobile nav, scroll reveal, video embed, quote modal + forms,
   product filtering/search, animated counters.
   Every feature is guarded by element existence so the one script serves
   all pages.
   ========================================================================== */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "27875039801"; // TODO: confirm dedicated WhatsApp line with client

  /* ---------- Sticky header shadow ---------- */
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");

  if (navToggle && mobileMenu) {
    var setMenu = function (open) {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileMenu.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    navToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(navToggle.getAttribute("aria-expanded") !== "true");
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) setMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (navToggle.getAttribute("aria-expanded") === "true" &&
          !mobileMenu.contains(e.target) && !navToggle.contains(e.target)) {
        setMenu(false);
      }
    });
  }

  /* ---------- Scroll reveal (respects reduced motion) ---------- */
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal");

  if (!prefersReduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Animated counters (stats bands) ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      if (prefersReduced || !("requestAnimationFrame" in window)) {
        el.textContent = target.toLocaleString("en-ZA") + suffix;
        return;
      }
      var duration = 1400;
      var start = null;
      var ease = function (t) { return 1 - Math.pow(1 - t, 3); }; // ease-out cubic
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        el.textContent = Math.round(target * ease(p)).toLocaleString("en-ZA") + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { countIO.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- Product filtering + search (Products page) ---------- */
  var filterbar = document.querySelector(".filterbar");
  if (filterbar) {
    var chips = filterbar.querySelectorAll(".chip");
    var searchInput = filterbar.querySelector(".searchbox input");
    var products = document.querySelectorAll("[data-category]");
    var emptyNote = document.querySelector(".filter-empty");
    var activeCategory = "all";

    var applyFilters = function () {
      var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var visible = 0;
      products.forEach(function (card) {
        var inCategory = activeCategory === "all" || card.getAttribute("data-category") === activeCategory;
        var inSearch = q === "" || card.textContent.toLowerCase().indexOf(q) !== -1;
        var show = inCategory && inSearch;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (emptyNote) emptyNote.classList.toggle("is-visible", visible === 0);
    };

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.remove("is-active");
          c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("is-active");
        chip.setAttribute("aria-pressed", "true");
        activeCategory = chip.getAttribute("data-filter");
        applyFilters();
      });
    });

    if (searchInput) searchInput.addEventListener("input", applyFilters);
  }

  /* ---------- Company video: swap thumbnail for embed on demand ---------- */
  var videoThumb = document.querySelector(".video-frame__thumb");
  if (videoThumb) {
    videoThumb.addEventListener("click", function () {
      var id = videoThumb.getAttribute("data-video");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = "Mech-Tech company video";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.setAttribute("allowfullscreen", "");
      videoThumb.replaceWith(iframe);
    });
  }

  /* ---------- Quote modal ---------- */
  var modal = document.getElementById("quote-modal");
  var lastFocused = null;

  function modalMachineSelect() {
    return modal ? modal.querySelector("select[name='machine']") : null;
  }

  function openModal(machine) {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    // Flush styles so the open transition runs, then focus once the
    // panel is visible (unfocusable while the visibility transition starts)
    void modal.offsetHeight;
    modal.classList.add("is-open");
    window.setTimeout(function () {
      var first = modal.querySelector("input[name='name']");
      if (first) first.focus();
    }, 80);
    document.body.style.overflow = "hidden";

    // Pre-select the machine the visitor clicked on
    var machineSelect = modalMachineSelect();
    if (machine && machineSelect) {
      var matched = false;
      Array.prototype.forEach.call(machineSelect.options, function (opt) {
        if (machine.indexOf(opt.text) === 0 || opt.text === machine) {
          machineSelect.value = opt.value || opt.text;
          matched = true;
        }
      });
      if (!matched) {
        machineSelect.value = "Other / Not sure";
        var msg = modal.querySelector("textarea[name='message']");
        if (msg && !msg.value) msg.value = "I'm interested in: " + machine;
      }
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    window.setTimeout(function () {
      modal.hidden = true;
      resetFormView(modal);
    }, 250);
    if (lastFocused) lastFocused.focus();
  }

  function resetFormView(scope) {
    var success = scope.querySelector(".form-success");
    if (success) success.classList.remove("is-visible");
    Array.prototype.forEach.call(
      scope.querySelectorAll("form[data-quote-form], h2, .modal__lead"),
      function (el) { el.style.display = ""; }
    );
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-quote]");
    if (trigger) {
      e.preventDefault();
      openModal(trigger.getAttribute("data-machine") || "");
      return;
    }
    if (e.target.closest("[data-modal-close]")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (!modal) return;
    if (e.key === "Escape" && !modal.hidden) closeModal();

    // Basic focus trap while the modal is open
    if (e.key === "Tab" && !modal.hidden) {
      var focusables = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- Quote forms: validate + hand off to WhatsApp ----------
     Scoped per form (modal on every page + inline form on Contact),
     so fields are found by name inside each form, never by global id. */
  function bindQuoteForm(form) {
    var field = function (name) { return form.querySelector("[name='" + name + "']"); };

    var setError = function (name, hasError) {
      var wrap = field(name).closest(".form-field");
      if (wrap) wrap.classList.toggle("has-error", hasError);
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = field("name").value.trim();
      var phone = field("phone").value.trim();
      var email = field("email").value.trim();
      var company = field("company") ? field("company").value.trim() : "";
      var machine = field("machine") ? field("machine").value : "";
      var message = field("message") ? field("message").value.trim() : "";

      var emailOk = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      setError("name", name === "");
      setError("phone", phone === "");
      setError("email", !emailOk);

      if (name === "" || phone === "" || !emailOk) {
        var firstInvalid = form.querySelector(".has-error input, .has-error textarea");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var lines = [
        "*New Quote Request — mechtech.store*",
        "Name: " + name,
        company ? "Company: " + company : "",
        "Phone: " + phone,
        email ? "Email: " + email : "",
        machine ? "Machine: " + machine : "",
        message ? "Requirements: " + message : ""
      ].filter(Boolean);

      var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");

      // Show the success state within this form's container
      var scope = form.closest(".modal__panel, .contact-panel") || form.parentElement;
      Array.prototype.forEach.call(
        scope.querySelectorAll("form[data-quote-form], h2, .modal__lead"),
        function (el) { el.style.display = "none"; }
      );
      var success = scope.querySelector(".form-success");
      if (success) success.classList.add("is-visible");
    });
  }

  document.querySelectorAll("form[data-quote-form]").forEach(bindQuoteForm);

  /* ---------- Popular tools carousel (home) ----------
     Turns the "Shop Popular Tools & More" category cards into a Swiper
     slider. Markup, classes and card design are untouched; we only drive
     the existing .swiper / .swiper-wrapper / .swiper-slide structure with
     the Swiper library already loaded on the page.

     The jet-woo widget also auto-initialises its own Swiper on this element,
     but only on some breakpoints (it skips desktop, where the 4 cards already
     fit). We run after that on window "load", tear down whatever it created,
     and drive a single carousel with consistent 4 / 2 / 1 columns, arrows,
     autoplay and looping. */
  function initPopularCarousel() {
    var popularCarousel = document.querySelector(".mt-popular-carousel");
    if (!popularCarousel || typeof window.Swiper !== "function") return;

    // Remove any instance jet-woo/Elementor already created (and its loop
    // clones) so we start from clean markup.
    if (popularCarousel.swiper && typeof popularCarousel.swiper.destroy === "function") {
      popularCarousel.swiper.destroy(true, true);
    }

    var popularSwiper = new window.Swiper(popularCarousel, {
      slidesPerView: 1,          // mobile
      spaceBetween: 10,
      loop: true,
      speed: 500,
      autoplay: { delay: 5000, disableOnInteraction: false },
      navigation: {
        nextEl: popularCarousel.querySelector(".jet-swiper-button-next"),
        prevEl: popularCarousel.querySelector(".jet-swiper-button-prev")
      },
      breakpoints: {
        768:  { slidesPerView: 2 }, // tablet
        1024: { slidesPerView: 4 }  // desktop
      }
    });

    // Guard against a Swiper timing quirk where autoplay skips auto-starting.
    if (popularSwiper.autoplay && !popularSwiper.autoplay.running) {
      popularSwiper.autoplay.start();
    }

    // Pause on hover. This bundled Swiper build ignores the pauseOnMouseEnter
    // option, so drive autoplay manually. The transition-end guard keeps it
    // paused if Swiper tries to re-arm autoplay while the pointer is still over
    // the carousel.
    var isHovering = false;
    popularCarousel.addEventListener("mouseenter", function () {
      isHovering = true;
      if (popularSwiper.autoplay) popularSwiper.autoplay.stop();
    });
    popularCarousel.addEventListener("mouseleave", function () {
      isHovering = false;
      if (popularSwiper.autoplay) popularSwiper.autoplay.start();
    });
    popularSwiper.on("slideChangeTransitionEnd", function () {
      if (isHovering && popularSwiper.autoplay) popularSwiper.autoplay.stop();
    });
  }

  if (document.querySelector(".mt-popular-carousel")) {
    if (document.readyState === "complete") {
      initPopularCarousel();
    } else {
      window.addEventListener("load", initPopularCarousel);
    }
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();

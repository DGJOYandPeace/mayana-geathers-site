/* Small site-wide behaviours: mobile nav. */
(function () {
  "use strict";

  var nav = document.getElementById("site-nav");
  if (!nav) return;

  // Deepen the nav once it scrolls off the hero — over the cream page a
  // barely-there translucent strip leaves the white logo unreadable.
  var onScroll = function () {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = nav.querySelector("[data-nav-toggle]");
  var label = nav.querySelector("[data-nav-toggle-label]");
  if (!toggle) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";
  });

  // Close the drawer when a link inside it is followed.
  nav.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (link && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Menu";
    }
  });
})();

/* Parallax depth field.
 * One rAF-throttled scroll listener sets a single custom property; the three
 * washes each move at their own rate off that one value, so there is no
 * per-element work on the scroll thread. Skipped entirely when the visitor
 * prefers reduced motion. */
(function () {
  "use strict";

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var depth = document.querySelector("[data-depth]");
  if (!depth) return;

  var ticking = false;

  function apply() {
    depth.style.setProperty("--scroll", String(window.scrollY));
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(apply);
    }
  }, { passive: true });

  apply();
})();


/* Cascade reveal.
 * Sections arrive as you reach them. The hiding rules live behind `.has-js`,
 * added here, so without JavaScript the page renders fully visible rather
 * than blank — and reduced-motion visitors opt out entirely. */
(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("has-js");

  var targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);           // reveal once, then stop watching
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

  targets.forEach(function (el) { io.observe(el); });

  // Anything already in view on load should not wait for a scroll.
  requestAnimationFrame(function () {
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add("is-in");
        io.unobserve(el);
      }
    });
  });
})();

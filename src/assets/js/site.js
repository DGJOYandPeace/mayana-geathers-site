/* Small site-wide behaviours: mobile nav. */
(function () {
  "use strict";

  var nav = document.getElementById("site-nav");
  if (!nav) return;

  // Deepen the nav once it scrolls off the hero — over the cream page a
  // barely-there translucent strip leaves the white logo unreadable.
  var onScroll = function () {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
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

/*
 * Contact + newsletter submission.
 *
 * Both forms post to the SAME Cloudflare Pages Function
 * (window.MG_CONFIG.formEndpoint) and are distinguished by `form_type`.
 * Confirmation is shown in place — no redirect to a third-party page.
 */
(function () {
  "use strict";

  var CFG = window.MG_CONFIG || {};
  var ENDPOINT = CFG.formEndpoint || "/api/contact";

  // Remembering the signup unlocks the gift meditation in the player.
  var GIFT_KEY = "mg:gift-unlocked";

  var MESSAGES = {
    newsletter: {
      ok: "Thank you — “Embracing Our Gifts” is yours. The full recording is below, and Mayana will be in touch now and then.",
      error: "Something went wrong sending that. Please try once more, or email Mayana directly from the Contact page."
    },
    contact: {
      ok: "Thank you for reaching out. Your message is with Mayana, and she’ll reply personally as soon as she can.",
      error: "Something went wrong sending that. Please try once more — and if it keeps happening, reach Mayana through Bridges to Healing."
    }
  };

  function setStatus(el, state, text) {
    if (!el) return;
    el.setAttribute("data-state", state);
    el.textContent = text;
    el.classList.add("is-visible");
  }

  function revealGift() {
    document.querySelectorAll("[data-gift]").forEach(function (el) {
      el.hidden = false;
    });
  }

  function unlockGift() {
    try { window.localStorage.setItem(GIFT_KEY, "1"); } catch (e) { /* private mode */ }
    revealGift();
  }

  // Someone who signed up on a previous visit shouldn't have to do it again.
  try {
    if (window.localStorage.getItem(GIFT_KEY) === "1") revealGift();
  } catch (e) { /* private mode */ }

  document.querySelectorAll("[data-mg-form]").forEach(function (form) {
    var formType = form.getAttribute("data-form-type") || "contact";
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[data-form-submit]");
    var copy = MESSAGES[formType] || MESSAGES.contact;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = Object.fromEntries(new FormData(form).entries());
      data.form_type = formType;
      data.page = window.location.pathname;

      var originalLabel = submit ? submit.textContent : "";
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Sending…";
      }
      if (status) status.classList.remove("is-visible");

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok || body.ok === false) {
              // Keep the server's own wording when it sent one - "Please enter
              // your name." is worth showing; a bare network failure is not.
              var err = new Error(body.error || "Request failed");
              err.fromServer = Boolean(body.error);
              throw err;
            }
            return body;
          });
        })
        .then(function () {
          setStatus(status, "ok", copy.ok);
          form.reset();
          if (formType === "newsletter") unlockGift();
        })
        .catch(function (err) {
          setStatus(status, "error", err && err.fromServer ? err.message : copy.error);
        })
        .then(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = originalLabel;
          }
        });
    });
  });
})();

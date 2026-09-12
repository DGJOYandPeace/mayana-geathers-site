/*
 * ===========================================================================
 * Guided meditation player
 * ---------------------------------------------------------------------------
 * - One component, reused on the Home page (compact, featured track) and the
 *   Guided Meditation page (full library).
 * - Track data comes from src/_data/meditations.json via a JSON script tag.
 * - Audio + cover URLs are assembled from window.MG_CONFIG.audio, which is
 *   fed from src/_data/site.json. The R2 bucket URL exists in exactly one
 *   place; nothing here hardcodes it.
 * - While the bucket URL is unset, tracks render in the library but announce
 *   themselves as "audio coming soon" rather than 404ing.
 * - Pressing play "blooms" the player into a fuller now-playing view.
 * ===========================================================================
 */
(function () {
  "use strict";

  var CFG = (window.MG_CONFIG && window.MG_CONFIG.audio) || {};
  var GIFT_KEY = "mg:gift-unlocked";

  function trimSlashes(s) {
    return String(s || "").replace(/^\/+|\/+$/g, "");
  }

  function buildUrl(prefix, file) {
    if (!CFG.r2BaseUrl || !file) return null;
    var base = String(CFG.r2BaseUrl).replace(/\/+$/, "");
    var p = trimSlashes(prefix);
    return base + "/" + (p ? p + "/" : "") + trimSlashes(file);
  }

  function giftUnlocked() {
    try { return window.localStorage.getItem(GIFT_KEY) === "1"; } catch (e) { return false; }
  }

  // `hidden` is an IDL property of HTMLElement, not SVGElement — assigning
  // el.hidden on an <svg> silently does nothing. Always toggle the attribute.
  function setHidden(el, hide) {
    if (el) el.toggleAttribute("hidden", Boolean(hide));
  }

  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  // Deterministic hue per track, so placeholder covers stay distinct and
  // stable between visits. Range stays inside the sage-to-teal family drawn
  // from Mayana's photographs.
  function hueFor(slug) {
    var h = 0;
    for (var i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 997;
    return 112 + (h % 62); // 112–173deg: sage green through teal
  }

  function coverMarkup(track, small) {
    var url = buildUrl(CFG.coverPrefix, track.coverFile);
    if (url) {
      return '<img src="' + url + '" alt="Cover art for ' + escapeAttr(track.title) + '" loading="lazy">';
    }
    return small ? "" : '<span class="cover__ph">Cover art coming</span>';
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeHtml(s) {
    return escapeAttr(s);
  }

  function initPlayer(root) {
    var dataEl = root.querySelector("[data-player-data]");
    if (!dataEl) return;

    var tracks;
    try {
      tracks = JSON.parse(dataEl.textContent) || [];
    } catch (e) {
      return;
    }
    if (!tracks.length) return;

    var audio = root.querySelector("[data-player-audio]");
    var toggle = root.querySelector("[data-player-toggle]");
    var iconPlay = root.querySelector("[data-icon-play]");
    var iconPause = root.querySelector("[data-icon-pause]");
    var seek = root.querySelector("[data-player-seek]");
    var elapsed = root.querySelector("[data-player-elapsed]");
    var remaining = root.querySelector("[data-player-remaining]");
    var volume = root.querySelector("[data-player-volume]");
    var muteBtn = root.querySelector("[data-player-mute]");
    var iconVol = root.querySelector("[data-icon-vol]");
    var iconMuted = root.querySelector("[data-icon-muted]");
    var coverEl = root.querySelector("[data-player-cover]");
    var albumEl = root.querySelector("[data-player-album]");
    var titleEl = root.querySelector("[data-player-title]");
    var descEl = root.querySelector("[data-player-desc]");
    var noticeEl = root.querySelector("[data-player-notice]");
    var listEl = root.querySelector("[data-player-list]");
    var countEl = root.querySelector("[data-player-count]");

    var current = -1;
    var seeking = false;

    function visibleTracks() {
      return tracks.filter(function (t) {
        return !t.giftOnly || giftUnlocked();
      });
    }

    function playable(track) {
      return Boolean(buildUrl(CFG.audioPrefix, track.audioFile));
    }

    function renderLibrary() {
      if (!listEl) return;
      var list = visibleTracks();
      listEl.innerHTML = list.map(function (t) {
        var i = tracks.indexOf(t);
        var ok = playable(t);
        return (
          '<li>' +
          '<button class="track" type="button" data-track-index="' + i + '"' +
          (ok ? "" : " disabled") +
          ' aria-current="' + (i === current) + '">' +
          '<span class="cover" style="--cover-h: ' + hueFor(t.slug) + '">' + coverMarkup(t, true) + '</span>' +
          '<span>' +
          '<span class="track__title">' + escapeHtml(t.title) + '</span><br>' +
          '<span class="track__sub">' + escapeHtml(t.album || "") + '</span>' +
          '</span>' +
          (ok
            ? '<span class="track__eq" aria-hidden="true"><span></span><span></span><span></span></span>'
            : '<span class="track__badge">Audio coming soon</span>') +
          '</button></li>'
        );
      }).join("");

      if (countEl) {
        countEl.textContent = list.length + (list.length === 1 ? " meditation" : " meditations");
      }
    }

    function syncLibraryState() {
      if (!listEl) return;
      listEl.querySelectorAll("[data-track-index]").forEach(function (btn) {
        btn.setAttribute("aria-current", String(Number(btn.getAttribute("data-track-index")) === current));
      });
    }

    function showNotice(text) {
      if (!noticeEl) return;
      if (text) {
        noticeEl.textContent = text;
        setHidden(noticeEl, false);
      } else {
        setHidden(noticeEl, true);
      }
    }

    function load(index, autoplay) {
      var track = tracks[index];
      if (!track) return;
      current = index;

      if (albumEl) albumEl.textContent = track.album || "";
      if (titleEl) titleEl.textContent = track.title;
      if (descEl) descEl.textContent = track.description || "";
      if (coverEl) {
        coverEl.style.setProperty("--cover-h", hueFor(track.slug));
        coverEl.innerHTML = coverMarkup(track, false);
      }

      var url = buildUrl(CFG.audioPrefix, track.audioFile);
      if (!url) {
        audio.removeAttribute("src");
        audio.load();
        if (toggle) toggle.disabled = true;
        showNotice(
          "This meditation isn’t streaming yet — the audio is being prepared. " +
          "Join Mayana’s list below and you’ll hear when it’s ready."
        );
        setPlayingUI(false);
        syncLibraryState();
        return;
      }

      if (toggle) toggle.disabled = false;
      showNotice("");
      audio.src = url;
      audio.load();
      syncLibraryState();
      if (autoplay) {
        audio.play().catch(function () {
          // Autoplay refused (or the file is missing) — leave it paused.
          setPlayingUI(false);
        });
      }
    }

    function setPlayingUI(isPlaying) {
      root.classList.toggle("is-playing", isPlaying);
      if (isPlaying) root.classList.add("is-bloomed");
      setHidden(iconPlay, isPlaying);
      setHidden(iconPause, !isPlaying);
      if (toggle) toggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    }

    function updateProgress() {
      var dur = audio.duration;
      if (elapsed) elapsed.textContent = fmtTime(audio.currentTime);
      if (remaining) {
        remaining.textContent = isFinite(dur) ? "-" + fmtTime(dur - audio.currentTime) : "-0:00";
      }
      if (seek && !seeking && isFinite(dur) && dur > 0) {
        var pct = (audio.currentTime / dur) * 1000;
        seek.value = String(pct);
        seek.style.setProperty("--progress", (pct / 10).toFixed(2) + "%");
      }
    }

    // ---- Events -----------------------------------------------------------
    if (toggle) {
      toggle.addEventListener("click", function () {
        if (current < 0) load(tracks.indexOf(visibleTracks()[0]), false);
        if (audio.paused) {
          audio.play().catch(function () {
            showNotice("That audio file couldn’t be reached. Please try again in a moment.");
          });
        } else {
          audio.pause();
        }
      });
    }

    audio.addEventListener("play", function () { setPlayingUI(true); });
    audio.addEventListener("pause", function () { setPlayingUI(false); });
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("error", function () {
      if (!audio.getAttribute("src")) return;
      showNotice("That audio file couldn’t be reached. Please try again in a moment.");
      setPlayingUI(false);
    });
    audio.addEventListener("ended", function () {
      // Drift gently on to the next available meditation.
      var list = visibleTracks();
      var pos = list.indexOf(tracks[current]);
      var next = list[pos + 1];
      if (next && playable(next)) {
        load(tracks.indexOf(next), true);
      } else {
        setPlayingUI(false);
      }
    });

    if (seek) {
      seek.addEventListener("input", function () {
        seeking = true;
        seek.style.setProperty("--progress", (Number(seek.value) / 10).toFixed(2) + "%");
      });
      seek.addEventListener("change", function () {
        if (isFinite(audio.duration)) {
          audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
        }
        seeking = false;
      });
    }

    if (volume) {
      audio.volume = Number(volume.value) / 100;
      volume.style.setProperty("--progress", volume.value + "%");
      volume.addEventListener("input", function () {
        audio.volume = Number(volume.value) / 100;
        audio.muted = audio.volume === 0;
        volume.style.setProperty("--progress", volume.value + "%");
        syncMuteIcon();
      });
    }

    function syncMuteIcon() {
      var off = audio.muted || audio.volume === 0;
      setHidden(iconVol, off);
      setHidden(iconMuted, !off);
      if (muteBtn) muteBtn.setAttribute("aria-label", off ? "Unmute" : "Mute");
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        audio.muted = !audio.muted;
        syncMuteIcon();
      });
    }

    if (listEl) {
      listEl.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-track-index]");
        if (!btn || btn.disabled) return;
        var index = Number(btn.getAttribute("data-track-index"));
        if (index === current && !audio.paused) {
          audio.pause();
          return;
        }
        load(index, true);
      });
    }

    // A newsletter signup unlocks the gift track without a reload.
    document.addEventListener("mg:gift-unlocked", function () {
      renderLibrary();
      syncLibraryState();
    });

    // ---- Boot -------------------------------------------------------------
    renderLibrary();
    syncMuteIcon();
    var first = visibleTracks()[0];
    if (first) load(tracks.indexOf(first), false);
  }

  document.querySelectorAll("[data-player]").forEach(initPlayer);
})();

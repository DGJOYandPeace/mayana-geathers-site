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
  function trimSlashes(s) {
    return String(s || "").replace(/^\/+|\/+$/g, "");
  }

  // Object keys are named after the tracks, so they contain spaces and other
  // characters that are not URL-safe. Encode each path segment, leaving the
  // separators intact so a key like "Breathe In/Breathe Out.mp3" still
  // resolves as a folder path.
  function encodePath(path) {
    return trimSlashes(path).split("/").map(encodeURIComponent).join("/");
  }

  function buildUrl(prefix, file) {
    if (!CFG.r2BaseUrl || !file) return null;
    var base = String(CFG.r2BaseUrl).replace(/\/+$/, "");
    var p = encodePath(prefix);
    var f = encodePath(file);
    if (!f) return null;
    return base + "/" + (p ? p + "/" : "") + f;
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

  function coverMarkup(track) {
    // `cover` may be a site path ("/assets/img/x.jpg") or a bare filename,
    // in which case it is looked up in the R2 covers prefix.
    var cover = track.cover;
    var url = cover && cover.charAt(0) === "/"
      ? cover
      : buildUrl(CFG.coverPrefix, cover);
    if (url) {
      return '<img src="' + url + '" alt="Cover art for ' + escapeAttr(track.title) + '" loading="lazy">';
    }
    // No artwork yet: the ruled ink frame stands in rather than inventing one.
    return '<span class="cover__ph">Cover<br>art<br>to come</span>';
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
    var metaEl = root.querySelector("[data-player-meta]");
    var useEl = root.querySelector("[data-player-use]");
    var useListEl = root.querySelector("[data-player-use-list]");
    var noticeEl = root.querySelector("[data-player-notice]");
    var prevBtn = root.querySelector("[data-player-prev]");
    var nextBtn = root.querySelector("[data-player-next]");
    var loopBtn = root.querySelector("[data-player-loop]");
    var listEl = root.querySelector("[data-player-list]");
    var countEl = root.querySelector("[data-player-count]");

    var current = -1;
    var seeking = false;
    var sources = [];
    var sourceIndex = 0;
    var wantsPlay = false;
    var looping = true;   // the library repeats unless switched off

    function visibleTracks() {
      return tracks;
    }

    // The bucket's exact object names couldn't be confirmed, so each track
    // carries fallbacks. We work down the list whenever a source fails to
    // load, and remember the one that worked.
    function candidates(track) {
      return [track.audioFile]
        .concat(track.audioAlts || [])
        .filter(Boolean)
        .map(function (name) {
          // A candidate carrying its own prefix is used as-is.
          return name.indexOf("/") > -1 ? buildUrl("", name) : buildUrl(CFG.audioPrefix, name);
        })
        .filter(Boolean);
    }

    function playable(track) {
      return candidates(track).length > 0;
    }

    function renderLibrary() {
      if (!listEl) return;
      var list = visibleTracks();
      listEl.innerHTML = list.map(function (t, n) {
        var i = tracks.indexOf(t);
        var ok = playable(t);
        var num = String(n + 1).padStart(2, "0");
        return (
          '<li>' +
          '<button class="track" type="button" data-track-index="' + i + '"' +
          (ok ? "" : " disabled") +
          ' aria-current="' + (i === current) + '">' +
          '<span class="track__num">' + num + '</span>' +
          '<span>' +
          '<span class="track__title">' + escapeHtml(t.title) + '</span>' +
          '<span class="track__sub">' + escapeHtml(t.album || "") + '</span>' +
          '</span>' +
          (!ok
            ? '<span class="track__badge">Audio to come</span>'
            : t.isPreview
              ? '<span class="track__badge track__badge--preview">Preview</span>'
              : '<span class="track__eq" aria-hidden="true"><span></span><span></span><span></span></span>') +
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

      if (metaEl) {
        metaEl.textContent = [
          track.album,
          track.duration,
          track.isPreview ? "Preview" : null
        ].filter(Boolean).join("  \u00b7  ");
      }

      if (useEl && useListEl) {
        var uses = track.useFor || [];
        useListEl.innerHTML = uses.map(function (u) {
          return "<li>" + escapeHtml(u) + "</li>";
        }).join("");
        setHidden(useEl, uses.length === 0);
      }

      if (coverEl) coverEl.innerHTML = coverMarkup(track);
      publishToOS(track);

      sources = candidates(track);
      sourceIndex = 0;
      var url = sources[0];
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
      wantsPlay = Boolean(autoplay);
      if (autoplay) {
        audio.play().catch(function () {
          // Autoplay refused (or the file is missing) — leave it paused.
          setPlayingUI(false);
        });
      }
    }

    // Hand the track to the operating system, so it appears on the lock screen
    // and in the notification shade with working controls. Without this, mobile
    // browsers show nothing and may stop playback when the screen locks.
    function publishToOS(track) {
      if (!("mediaSession" in navigator)) return;
      try {
        var art = track.cover && track.cover.charAt(0) === "/"
          ? location.origin + track.cover
          : null;
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: track.title,
          artist: "Mayana Geathers",
          album: track.album || "Guided Meditation",
          artwork: art ? [{ src: art, sizes: "512x512", type: "image/jpeg" }] : []
        });

        navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
        navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        navigator.mediaSession.setActionHandler("nexttrack", function () { step(1, true); });
        navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1, true); });
        navigator.mediaSession.setActionHandler("seekto", function (d) {
          if (d.seekTime != null && isFinite(audio.duration)) audio.currentTime = d.seekTime;
        });
      } catch (e) {
        // Older browsers reject unknown action handlers; playback is unaffected.
      }
    }

    function setPlayingUI(isPlaying) {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      }
      root.classList.toggle("is-playing", isPlaying);
      if (isPlaying) root.classList.add("is-bloomed");
      setHidden(iconPlay, isPlaying);
      setHidden(iconPause, !isPlaying);
      if (toggle) toggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    }

    function updateProgress() {
      var dur = audio.duration;
      if ("mediaSession" in navigator && navigator.mediaSession.setPositionState && isFinite(dur)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur, playbackRate: audio.playbackRate, position: audio.currentTime
          });
        } catch (e) { /* ignore */ }
      }
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
          wantsPlay = true;
          audio.play().catch(function () {
            showNotice("That audio file couldn’t be reached. Please try again in a moment.");
          });
        } else {
          wantsPlay = false;
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

      // Try the next candidate object name before giving up.
      if (sourceIndex < sources.length - 1) {
        sourceIndex += 1;
        var next = sources[sourceIndex];
        console.warn(
          "[player] " + audio.src + " failed; trying " + next
        );
        audio.src = next;
        audio.load();
        if (wantsPlay) audio.play().catch(function () { setPlayingUI(false); });
        return;
      }

      console.error(
        "[player] no audio source worked for this track. Tried:\n  " +
        sources.join("\n  ")
      );
      showNotice("That audio file couldn’t be reached. Please try again in a moment.");
      setPlayingUI(false);
    });
    // Move `offset` tracks through the library. Wraps in both directions while
    // looping is on, so the end of the last meditation returns to the first.
    function step(offset, autoplay) {
      var list = visibleTracks();
      if (!list.length) return false;
      var pos = list.indexOf(tracks[current]);
      var target = pos + offset;
      if (target >= list.length || target < 0) {
        if (!looping) return false;
        target = (target % list.length + list.length) % list.length;
      }
      load(tracks.indexOf(list[target]), autoplay);
      return true;
    }

    audio.addEventListener("ended", function () {
      // Drift gently on to the next meditation, or back to the first.
      if (!step(1, true)) setPlayingUI(false);
    });

    if (nextBtn) nextBtn.addEventListener("click", function () { step(1, true); });
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        // Restart the current track first, the way a music player does, and
        // only step back when already near its start.
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        step(-1, true);
      });
    }

    if (loopBtn) {
      loopBtn.addEventListener("click", function () {
        looping = !looping;
        loopBtn.classList.toggle("is-on", looping);
        loopBtn.setAttribute("aria-pressed", String(looping));
      });
    }

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

    // ---- Boot -------------------------------------------------------------
    renderLibrary();
    syncMuteIcon();
    var first = visibleTracks()[0];
    if (first) load(tracks.indexOf(first), false);
  }

  document.querySelectorAll("[data-player]").forEach(initPlayer);
})();

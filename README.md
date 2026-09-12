# mayanageathers.com

Stage 1 rebuild of Mayana Geathers' site, migrated off Squarespace.

Static site built with [Eleventy](https://www.11ty.dev/), deployed to
**Cloudflare Pages**, with one Cloudflare Pages Function handling both forms.
No client-side framework — the only JavaScript is the nav, the forms, and the
guided meditation player.

---

## Running it locally

```bash
npm install
npm start          # http://localhost:8080, rebuilds as you edit
npm run build      # one-off build into _site/
```

## Where things live

```
src/
  _data/            ← ALL COPY AND CONFIG LIVES HERE
    site.json         site name, nav, external URLs, R2 bucket URL, image slots
    meditations.json  the meditation library (copy is final)
    albums.json       Bandcamp albums + David's Sound Healing cross-promo
    writing.json      Written Work entries
    events.json       past + upcoming events
    testimonials.json testimonials
    assets.js         (generated) which image files actually exist
    library.js        (generated) meditations + gift track, for the player
  _includes/
    layouts/base.njk        page shell, <head>, and the window.MG_CONFIG block
    partials/nav.njk        header + site-wide "Book a Consultation" CTA
    partials/footer.njk     footer + Bridges to Healing credit
    partials/player.njk     the audio player component
    partials/signup.njk     the "Receive A Gift!" email capture block
  assets/css/site.css   the whole stylesheet; palette tokens at the very top
  assets/js/            site.js (nav), forms.js, player.js
  assets/img/           photography and cover art
  *.njk                 one file per page
functions/api/contact.js  the Cloudflare Pages Function (contact + newsletter)
```

**To change copy, edit `src/_data/*.json`.** The page templates read from there,
so new meditations, new articles and new events are data edits, not redesigns.

Anything still waiting on real content is marked `REPLACE ME` or `CONFIRM`:

```bash
grep -rn "REPLACE ME\|CONFIRM" src/
```

## The palette

Every colour is a token at the top of `src/assets/css/site.css`, lifted from
Mayana's golden-hour cactus portraits: hazy oat sky, sage prickly pear, deep
pine foliage, the teal of her dress, magenta cactus blooms, dry-grass gold.
Change the tokens and the whole site follows.

## Where files belong

One rule: **anything the site displays goes in `src/assets/img/`; anything the
site streams goes in R2.**

| What | Where | Why |
|---|---|---|
| Photography, logo, album cover art shown on a page | `src/assets/img/` | Committed to the repo, published at `/assets/img/…` |
| Meditation MP3s | R2 bucket `mayanas-professional-site`, `meditations/audio/` | Too big for git, and git keeps every version forever |
| Meditation cover art used by the player | R2, `meditations/covers/` | Travels with the audio it belongs to |
| Copy, links, dates, track listings | `src/_data/*.json` | So content edits never touch templates |
| Secrets (Resend key, notification address) | Cloudflare Pages env vars | Never in the repo |

### Uploading an image from the GitHub web UI

The "Add files via upload" button drops files wherever you happen to be, and
the repo root is the easy mistake. To land them in the right place:

1. Open **`src/assets/img/`** on GitHub *first*.
2. **Add file → Upload files**, then commit.

(Or, on the upload screen, type `src/assets/img/` in front of the filename.)

If an image does end up at the root it still works — the build publishes root
images to `/assets/img/` as a safety net — but the build log prints a warning
naming the file, and it should be moved:

```bash
git mv thefile.jpg src/assets/img/
```

That safety net exists so a mis-placed upload never silently breaks a page. It
is not the intended home, and the repo root should stay free of images.

### A note on repo size

Git keeps every version of every binary forever, so a repo full of full-size
photos only ever grows. Keep page images reasonably sized, and leave audio and
player cover art in R2 where they can be replaced without bloating history.

## Adding a meditation

1. Upload the MP3 to the `mayanas-professional-site` R2 bucket under
   `meditations/audio/`, and cover art under `meditations/covers/`.
2. Add an object to `tracks` in `src/_data/meditations.json` with the title,
   description, `useFor` bullets, closing line, `audioFile` and `coverFile`.

That's it — the player, the Guided Meditation page and the homepage "Latest"
module all pick it up.

## Adding an article or an event

Add an object to the top of `entries` in `src/_data/writing.json`, or to
`upcoming` / `past` in `src/_data/events.json`. Adding anything to `upcoming`
makes an "Upcoming Events" section appear automatically.

## Deploying

See **[docs/SETUP.md](docs/SETUP.md)** for the one-time Cloudflare Pages, R2 and
Resend setup, and for the DNS cutover steps (deliberately left until after
sign-off).

Cloudflare Pages build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `_site` |
| Functions directory | `functions` (picked up automatically) |

Every push produces its own preview URL for review before anything goes live.

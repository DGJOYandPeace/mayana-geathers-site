# Setup — Cloudflare Pages, R2 and Resend

One-time setup for David. Nothing here touches the live domain: the site can be
built, previewed and reviewed in full before DNS changes at all.

---

## 1. Cloudflare — deploy as a Worker with static assets

This project deploys as a **Worker with static assets**, not as a classic Pages
project. That matters for one reason: a Worker that has *only* static assets
cannot have environment variables attached — the dashboard says
*"Variables cannot be added to a Worker that only has static assets"* — and
`RESEND_API_KEY` has to live somewhere. Giving the Worker a script
(`worker/index.js`, wired up in `wrangler.jsonc`) makes the variables section
appear and makes `/api/contact` exist at all.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a
   repository**, and pick `mayana-geathers-site`.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |

   Leave the output directory alone — `wrangler.jsonc` already points the
   assets binding at `_site`.

3. Deploy. Every push to `main` redeploys; other branches get preview URLs.

Once a deployment includes the Worker script, **Settings → Runtime variables
and secrets** becomes editable. If it still shows the static-assets message,
the deploy ran without `wrangler deploy` — check the Deploy command.

### Running it locally

```bash
npm run build          # build the site into _site/
npx wrangler dev       # serve it with the Worker on http://localhost:8787
```

`wrangler dev` gives you the real thing: static pages *and* `/api/contact`.
For local email testing, put the variables in a `.dev.vars` file — it is
gitignored, and must never be committed.

## 2. R2 bucket for the meditation audio

The audio filenames are already configured in
`src/_data/meditations.json`, named after the tracks. The player URL-encodes
them, so spaces are fine. What is still missing is the bucket's **public URL**
— the bucket name on its own is not a URL, and R2 buckets are private by
default.

1. Cloudflare dashboard → **R2** → the **`mayanas-professional-site`** bucket.
2. Upload with these prefixes:
   - audio → `meditations/audio/`
   - cover art → `meditations/covers/`
3. **Settings → Public access.** Enable the **Public Development URL**
   (`r2.dev`) and copy the base URL it gives you.

   Cloudflare warns that r2.dev is rate-limited and not recommended for
   production, and suggests a custom domain instead. That is correct — but a
   custom domain on an R2 bucket requires the domain's nameservers to be on
   Cloudflare, and `mayanageathers.com` is still at Namecheap pointing at
   Squarespace. Moving it is the launch cutover being deliberately held. So
   r2.dev is the right choice for the review phase.

   **At launch**, once DNS moves to Cloudflare, connect a custom domain such
   as `audio.mayanageathers.com` to the bucket and change `audio.r2BaseUrl`
   below — that one value is the only thing to update, and it buys edge
   caching and no rate limit.

   Two things to know while r2.dev is in use:
   - No edge caching, so every play reads from R2. Fine for review traffic;
     the custom domain fixes it for real traffic.
   - Objects are publicly readable by URL. That is true of any web audio
     player, but it does mean the "Embracing Your Gifts" signup gate is
     cosmetic — the player hides the track until someone signs up, but the
     file itself is fetchable. Genuinely gating it would need the Worker to
     proxy or sign the URL, which is a later job if it ever matters.
4. Put that URL in **`src/_data/site.json`** → `audio.r2BaseUrl`, with no
   trailing slash:

   ```json
   "audio": {
     "r2BaseUrl": "https://pub-xxxxxxxxxxxx.r2.dev",
     "audioPrefix": "meditations/audio",
     "coverPrefix": "meditations/covers"
   }
   ```

Until that value is filled in, the player deliberately shows an
"audio coming soon" state per track rather than producing broken audio.

5. Confirm the object names match `audioFile` in
   `src/_data/meditations.json`. To list what's actually in the bucket:

   ```bash
   npx wrangler r2 object list mayanas-professional-site
   ```

   The filenames in the data file are best guesses — correct them to whatever
   the bucket actually contains.

---

## 3. Resend, for the contact and signup emails

Resend is a separate service (resend.com), not a Cloudflare product. It is
Cloudflare's currently documented way to send email from Pages Functions, after
the old free MailChannels integration was retired. The free tier — 3,000
emails/month, 100/day, 1 verified domain — covers this site comfortably.

1. Create a free account at **resend.com**.
2. **Domains → Add Domain.** Use a subdomain, e.g. `mail.mayanageathers.com`.
3. Resend gives you SPF and DKIM **TXT** records. Add them at **Namecheap**.

   > These are additive records on a *subdomain*. They do **not** affect where
   > `mayanageathers.com` itself resolves, so they can be added at any time and
   > are not part of the "don't touch DNS" hold on the site cutover.

4. Wait for Resend to show the domain as **Verified**.
5. **API Keys → Create API Key.** Choose **Sending access**, not Full access —
   the site only ever calls `POST /emails`, so a send-only key is all it needs.
   If the key ever leaks, a sending key cannot read your domains, contacts or
   other keys. Copy it once; it isn't shown again.

   > Treat the key like a password: paste it straight into Cloudflare (step 4)
   > and nowhere else. If it ends up in a chat, a screenshot or a commit,
   > delete it in Resend and issue a new one.

---

## 4. Environment variables in Cloudflare Pages

In the Cloudflare dashboard: **Workers & Pages → mayana-geathers-site →
Settings → Runtime variables and secrets → Add.**

This section only appears once a deployment contains the Worker script (see
step 1). Add all three; mark the API key as a **Secret** so it becomes
write-only, and leave the other two as plain text.

| Name | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | the sending-access key from step 3.5 | Add as **Secret**, not Text |
| `MAIL_FROM` | `Mayana Geathers Site <notifications@mail.mayanageathers.com>` | Must be on the Resend-verified domain |
| `NOTIFY_EMAIL` | `mayanal14@gmail.com` | Where notifications land |

None of these are in the repo, by design. Changing where notifications go is a
dashboard edit, not a code change.

Redeploy after adding them — variables are read at deploy time.

### Testing the form

Submit the contact form. If mail isn't configured you get a warm on-page error
and the reason is logged rather than failing silently — the logs are under
**Observability** (enabled in `wrangler.jsonc`), or live via
`npx wrangler tail`.

Expected responses, all verified locally:

| Request | Response |
|---|---|
| `POST /api/contact`, mail not configured | `503` + "isn't connected yet" |
| `POST` with an invalid email | `400` + "Please enter a valid email address." |
| `POST` with the honeypot filled | `200 {"ok":true}`, no email sent |
| `GET /api/contact` | `405` |

Spam protection is a honeypot field for now. If spam becomes a problem,
Cloudflare Turnstile can be layered on later.

---

## 5. Going live (only after Mayana and David sign off)

### What the DNS looks like today

Measured directly, not assumed:

| Record | Value |
|---|---|
| NS | `ns01`–`ns04.squarespacedns.com`, `dns1`–`dns4.p02.nsone.net` |
| A (apex) | `198.185.159.144`, `.145`, `198.49.23.144`, `.145` — Squarespace |
| CNAME `www` | `ext-sq.squarespace.com` |
| **MX** | **none** |
| **TXT** | **none** |

Two things follow from that. The domain is answered by Squarespace's own DNS
(nsone.net is the service behind `squarespacedns.com`), so the records in the
Squarespace panel are the live ones despite its "custom nameservers" banner —
that banner appears because the domain is registered elsewhere, at Namecheap.
And **there is no email on this domain**: no MX, no TXT. The usual danger in a
nameserver move — silently breaking someone's mail — does not apply here.

### The move

The site deploys as a **Worker**, and a Worker custom domain requires the zone
to be on Cloudflare; an external CNAME will not do. So the nameservers move.

1. Cloudflare → **Add a site** → `mayanageathers.com`. It scans and imports
   the existing records.
2. In the imported zone, **delete** the four Squarespace `A` records and the
   `www` CNAME to `ext-sq.squarespace.com`. Those are what point the domain at
   Squarespace. The `_domainconnect` CNAME is Squarespace plumbing and can go
   too. Leave the zone otherwise empty.
3. Cloudflare gives two nameservers. At **Namecheap**, replace the
   `squarespacedns.com` nameservers with those.
4. Once the zone shows Active: Worker → **Domains** → add `mayanageathers.com`
   **and** `www.mayanageathers.com`. Cloudflare writes the records itself —
   nothing to add by hand.

The apex `A` records carry a 4-hour TTL, so allow that long for the old
answers to age out. The Squarespace site keeps working the whole time; it only
stops being reachable at this domain once the new records take.

### Two things worth doing in the same pass

- **R2 custom domain.** With the zone on Cloudflare, connect
  `audio.mayanageathers.com` to the `mayanas-professional-site` bucket, then
  change `audio.r2BaseUrl` in `src/_data/site.json` to it. That retires the
  rate-limited r2.dev URL and puts the audio behind the edge cache.
- **Resend.** The SPF and DKIM TXT records for the sending subdomain now go in
  the Cloudflare zone rather than at Namecheap.

**Do not start before sign-off.** Until then the site lives on its preview
URLs and the Squarespace site stays up.

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

## 5. Going live

### Where things actually stand

**Squarespace is the registrar, the DNS host and the current site host**, all
three, and all active. The transfer authorization code is in hand. The new
site is live on its workers.dev URL.

Measured directly: the apex resolves to Squarespace's IPs, `www` is a CNAME to
`ext-sq.squarespace.com`, and there are **no MX and no TXT records at all** —
there is no email on this domain, so the usual hazard in a DNS move does not
apply here.

### One conflict to settle first

The goal is *"manage all future DNS from the Namecheap dashboard."* That is
not compatible with how this site is deployed. **A Cloudflare Worker custom
domain requires the zone to be hosted on Cloudflare** — an external CNAME will
not attach a Worker, and an apex domain cannot be a CNAME in the first place.

So there are two shapes, and they trade different things:

**Option A — registrar at Namecheap, DNS at Cloudflare.** *(recommended)*
Namecheap owns the domain: renewals, billing, transfer lock, contacts. DNS
records live in Cloudflare. This is the ordinary split, and it is the only one
that lets the Worker serve the apex. It also unlocks a custom domain on the R2
bucket, which retires the rate-limited `r2.dev` audio URL.

**Option B — registrar and DNS both at Namecheap.**
Records are edited at Namecheap, as asked. The cost is real: the site must be
redeployed as **Cloudflare Pages** rather than a Worker, because Pages accepts
a custom domain from external DNS (apex via Namecheap's ALIAS record, `www`
via CNAME). `functions/api/contact.js` was kept compatible for exactly this,
so the forms would still work. But R2 custom domains also require the zone on
Cloudflare, so **the audio stays on the rate-limited r2.dev URL permanently**.

### Order of operations — DNS first, transfer second

Whichever option, do not start the registrar transfer first. Transferring away
from Squarespace can end its DNS hosting, and if the nameservers still point
at `squarespacedns.com` at that moment the domain goes dark.

1. **Point the nameservers at the new DNS host while still registered at
   Squarespace.** For Option A: add the site in Cloudflare, delete the four
   Squarespace `A` records, the `www` CNAME to `ext-sq.squarespace.com` and the
   `_domainconnect` CNAME, then set Squarespace's nameservers to the two
   Cloudflare gives you.
2. **Confirm the site resolves** on the real domain. The apex records carry a
   4-hour TTL, so allow that.
3. **Attach the domain to the Worker**: Worker → Domains → add
   `mayanageathers.com` and `www.mayanageathers.com`. Cloudflare writes the
   records itself.
4. **Then transfer the registration to Namecheap** with the auth code. Unlock
   at Squarespace first. Transfers take roughly five to seven days, and the
   nameserver delegation carries across — verify afterwards that it still
   points at Cloudflare.

Two notes on transfer timing: ICANN blocks a transfer within 60 days of
registration or of a previous transfer, and also within 60 days of a change to
the registrant contact details. If either applies, the DNS cutover in steps 1
to 3 can still go ahead — it does not depend on the transfer.

### In the same pass, under Option A

- **R2 custom domain.** Connect `audio.mayanageathers.com` to the
  `mayanas-professional-site` bucket, then change `audio.r2BaseUrl` in
  `src/_data/site.json`. Retires the rate-limited URL and puts the audio behind
  the edge cache.
- **Resend.** The SPF and DKIM TXT records for the sending subdomain go in the
  Cloudflare zone.

### Afterwards

The Squarespace site keeps working until the records change, then simply stops
being reachable at this domain. Cancel that subscription only once the new site
has been serving the domain happily for a few days.

# Setup — Cloudflare Pages, R2 and Resend

One-time setup for David. Nothing here touches the live domain: the site can be
built, previewed and reviewed in full before DNS changes at all.

---

## 1. Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, and pick the `mayana-geathers-site` repo.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `_site` |

3. Save and deploy. Every push then gets its own preview URL, and the
   production branch gets a stable `*.pages.dev` URL.

The `functions/` folder at the repo root is picked up automatically — there's
nothing to configure for `/api/contact`.

---

## 2. R2 bucket for the meditation audio

1. Cloudflare dashboard → **R2** → the **`mayanas-professional-site`** bucket.
2. Upload with these prefixes:
   - audio → `meditations/audio/`
   - cover art → `meditations/covers/`
3. **Settings → Public access.** Either enable the `r2.dev` public URL, or
   connect a custom domain such as `audio.mayanageathers.com`. Copy the public
   base URL.
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
5. **API Keys → Create API Key.** Copy it once — it isn't shown again.

---

## 4. Environment variables in Cloudflare Pages

Pages project → **Settings → Environment variables**. Add all three to
**Production** *and* **Preview**, or the forms won't work on preview URLs.

| Name | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | the key from step 3.5 | Mark as **Secret** |
| `MAIL_FROM` | `Mayana Geathers Site <notifications@mail.mayanageathers.com>` | Must be on the Resend-verified domain |
| `NOTIFY_EMAIL` | `mayanal14@gmail.com` | Where notifications land |

None of these are in the repo, by design. Changing where notifications go is a
dashboard edit, not a code change.

Redeploy after adding them — Pages only picks up new variables on a fresh build.

### Testing the form

Submit the contact form on a preview URL. If mail isn't configured yet you get a
warm on-page error and the reason is logged in the Pages Function logs
(**Deployments → a deployment → Functions**), rather than a silent failure.

Spam protection is a honeypot field for now. If spam becomes a problem,
Cloudflare Turnstile can be layered on later.

---

## 5. Going live (only after Mayana and David sign off)

1. Pages project → **Custom domains** → add `mayanageathers.com`.
2. Cloudflare shows the DNS records to create.
3. Update those records at **Namecheap**.

**Do not do step 3 before sign-off.** Until then the site lives entirely on its
preview and `*.pages.dev` URLs, and the live Squarespace site stays up.

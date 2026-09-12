# Content status — what's real, what's waiting

Everything marked ⏳ renders a clearly-labelled placeholder today. Find them all
with:

```bash
grep -rn "REPLACE ME\|CONFIRM" src/
```

## Copy

| Item | Status |
|---|---|
| Home hero, testimonials (all 4), Instagram, "Be Well!" | ✅ verbatim from the live site |
| About Me bio + therapy services blurb | ✅ verbatim |
| Guided Meditation intro | ✅ verbatim |
| All four meditations: description, "use this for", closing line | ✅ final, from Mayana |
| Book Mayana intro + three service tiles | ✅ verbatim |
| Written Work intro + three article links | ✅ verbatim |
| David's "Sound Healing" description | ✅ verbatim |
| Release descriptions ("Dawning…", "I Am Worthy") | ✅ transcribed from the release pages — CONFIRM the two lines cut off mid-sentence in the screenshots |
| "Social Media Makes Healing…" publication date | ⏳ unknown — the date line is omitted rather than guessed |
| Written Work excerpts | ⏳ optional; placeholder text is skipped until real pull quotes arrive |

## The signup gift

The recording in the bucket is titled **"Embracing Our Gifts"**, but the live
site's signup copy promised **"Embracing Your Gifts"**. The site now follows the
recording. **CONFIRM which is correct** — the two should not disagree.

What is in the bucket is a **short snippet**, so it plays for everyone in the
player as a teaser, marked "Preview", rather than being hidden. Signing up
reveals a panel with the full recording, opened in a new tab.

⏳ **`fullFile` is not set yet** — the full recording's object name in the
bucket. Until it is, the panel says the recording is on its way by email
rather than offering a dead link. Set it in `src/_data/meditations.json`.

## Audio

| Item | Status |
|---|---|
| Copy for all four launch tracks | ✅ |
| MP3s uploaded to `mayanas-professional-site` | ✅ per David |
| Exact R2 object names | ✅ named after the tracks; "Breathe In Breathe Out.mp3" confirmed. Could not be fetched from the build sandbox (r2.dev is blocked there), so **verify each of the five URLs loads in a browser** |
| `audio.r2BaseUrl` in `site.json` | ✅ set to the r2.dev public URL |
| Cover art for the four tracks | ✅ RESOLVED — all four are tracks on *Dawning of a New Day*, so that release's cover art applies to each |
| "Embracing Our Gifts" snippet | ✅ in the bucket, plays as a preview |
| "Embracing Our Gifts" full recording | ⏳ `fullFile` not set — see above |

## Images

| File | Used for | Status |
|---|---|---|
| `mayana-geathers-white-logo.webp` | footer only — see note below | ⚠️ a dark variant is needed for the nav |
| `mayana-portrait-1.jpeg` | About Me portrait | ✅ — confirm this is the intended page |
| `dawining-of-a-new-day-cover-art.jpg` | album card | ✅ |
| `i-am-worthy-album-cover-art.jpg` | album card | ✅ |
| `mayana-photo-i-am-worthy-shoot.webp` | supporting photo on the I Am Worthy card | ⚠️ assumed — confirm |
| `mayana-shan-podcast-still.webp` | Speaking Events/Podcasts tile | ⚠️ best guess — confirm |
| `dawning-of-a-new-day-23-wide.jpeg` | **homepage hero** — full-bleed opening plate | ✅ |
| `dawning-of-a-new-day-20-cactus-large.jpeg` | full-bleed quote breath on the homepage | ✅ |
| `mayana-geathers-black-logo.png` | source for the nav signature | ✅ original, kept untouched |
| `mayana-geathers-signature.png` | **nav mark** — trimmed, transparent, ink-coloured | ✅ derived from the above |
| `mayana-geathers-signature-light.png` | **footer mark** — trimmed, transparent, paper-coloured | ✅ derived from the white logo |

All photography slots are now filled. To swap any of them, change `images` in
`src/_data/site.json` — a slot whose file is missing is skipped rather than
rendering broken, so it is safe to point at a file before uploading it.

**On the two signature marks:** both supplied logo files are mostly whitespace
(the black one is 500×500 around 477×158 of ink), so at nav size the signature
would have rendered tiny. The two `-signature*.png` files are trimmed,
transparent, recoloured versions generated from the originals — luminance
mapped to alpha, so the antialiased strokes stay smooth. Both originals remain
in the repo untouched.

To use different filenames, change `images` in `src/_data/site.json`.

### Notes

- `mayana-images` in the repo root was a 1-byte empty file, not a folder — it
  was removed. If a folder of images was meant to be uploaded, it didn't make it.
- The Stage 1 brief said "keep all three" testimonials and then listed four.
  All four are kept; remove one from `testimonials.json` if that was the intent.
- The nav now carries Mayana's signature in ink on the paper ground; the
  footer carries the same signature in paper on the ink ground.
- **Events page cut**, along with its data file and nav entry.
- **Bandcamp cut entirely** — no purchase links anywhere. This also removed
  David's "Sound Healing" cross-promo card, which existed only as a Bandcamp
  link. Say the word if it should come back as a text-only mention.
- Image slots accept a bare filename (looked up in `src/assets/img/`) **or a
  full URL**, so photography can live in R2 alongside the audio if preferred.

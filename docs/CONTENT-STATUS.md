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

## Audio

| Item | Status |
|---|---|
| Copy for all four launch tracks | ✅ |
| MP3s uploaded to `mayanas-professional-site` | ✅ per David |
| Exact R2 object names | ⏳ guessed slugs in `meditations.json`. The real files may be named after `sourceTitle` (the track's name on the release) — verify with `wrangler r2 object list` |
| `audio.r2BaseUrl` in `site.json` | ⏳ **the one value that switches the player on** |
| Cover art for the four tracks | ✅ RESOLVED — all four are tracks on *Dawning of a New Day*, so that release's cover art applies to each |
| "Embracing Your Gifts" gift track MP3 | ⏳ needed; unlocks in the player after signup |

## Images

| File | Used for | Status |
|---|---|---|
| `mayana-geathers-white-logo.webp` | footer only — see note below | ⚠️ a dark variant is needed for the nav |
| `mayana-portrait-1.jpeg` | About Me portrait | ✅ — confirm this is the intended page |
| `dawining-of-a-new-day-cover-art.jpg` | album card | ✅ |
| `i-am-worthy-album-cover-art.jpg` | album card | ✅ |
| `mayana-photo-i-am-worthy-shoot.webp` | supporting photo on the I Am Worthy card | ⚠️ assumed — confirm |
| `mayana-shan-podcast-still.webp` | Speaking Events/Podcasts tile | ⚠️ best guess — confirm |
| `mayana-cactus-hero.jpg` | **homepage hero** (full-bleed opening plate) | ⏳ **file needed** |
| `mayana-golden-hour-profile.jpg` | full-bleed quote band on the homepage | ⏳ **file needed** |
| `mayana-geathers-black-logo.webp` | **nav logo** on the paper ground | ⏳ **file needed** — until then the nav shows a typeset wordmark |

The last two are already wired up. Drop the files into `src/assets/img/` under
exactly those names and they appear on the next build — no template edit. Until
then the presence check in `src/_data/assets.js` skips those slots and the
designed gradient fallback shows instead, so nothing breaks.

To use different filenames, change `images` in `src/_data/site.json`.

### Notes

- `mayana-images` in the repo root was a 1-byte empty file, not a folder — it
  was removed. If a folder of images was meant to be uploaded, it didn't make it.
- The Stage 1 brief said "keep all three" testimonials and then listed four.
  All four are kept; remove one from `testimonials.json` if that was the intent.
- The white logo cannot sit on the paper ground, so the nav shows a typeset
  wordmark and the white logo appears only in the footer (the one ink-ground
  surface). Drop `mayana-geathers-black-logo.webp` into `src/assets/img/` and
  the nav switches to the real logo automatically.
- **Events page cut**, along with its data file and nav entry.
- **Bandcamp cut entirely** — no purchase links anywhere. This also removed
  David's "Sound Healing" cross-promo card, which existed only as a Bandcamp
  link. Say the word if it should come back as a text-only mention.
- Image slots accept a bare filename (looked up in `src/assets/img/`) **or a
  full URL**, so photography can live in R2 alongside the audio if preferred.

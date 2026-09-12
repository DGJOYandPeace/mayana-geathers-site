// The full player library, assembled at build time: the four launch
// meditations plus the signup gift.
//
// The gift is a SHORT SNIPPET, so it plays for everyone as a teaser rather
// than being hidden behind the signup. `isPreview` marks it in the player;
// the full recording is unlocked separately (see partials/gift.njk).
import { readFile } from "node:fs/promises";

export default async function () {
  const meditations = JSON.parse(
    await readFile(new URL("./meditations.json", import.meta.url), "utf8")
  );
  return [...meditations.tracks, meditations.gift];
}

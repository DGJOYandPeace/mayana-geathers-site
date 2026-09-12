// The player library: the four open guided meditations.
//
// The signup gift is deliberately NOT here — it is opt-in only, revealed in
// the gift panel after someone joins the list (see partials/gift.njk).
import { readFile } from "node:fs/promises";

export default async function () {
  const meditations = JSON.parse(
    await readFile(new URL("./meditations.json", import.meta.url), "utf8")
  );
  return meditations.tracks;
}

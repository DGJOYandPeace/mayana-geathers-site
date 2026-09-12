// Which optional image files are actually present in src/assets/img.
//
// Templates check this before rendering an <img>, so a photo that hasn't been
// supplied yet degrades to the designed fallback instead of a broken image.
// Drop the file in the folder and it appears on the next build — no template
// edit needed.
import { readdir } from "node:fs/promises";

export default async function () {
  let files = [];
  try {
    files = await readdir(new URL("../assets/img/", import.meta.url));
  } catch {
    files = [];
  }
  const has = Object.fromEntries(files.map((f) => [f, true]));
  return { files, has };
}

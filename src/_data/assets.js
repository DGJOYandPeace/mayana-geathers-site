// Which optional image files are actually present.
//
// Templates check this before rendering an <img>, so a photo that hasn't been
// supplied yet degrades to the designed fallback instead of a broken image.
// Drop the file in and it appears on the next build — no template edit needed.
//
// Two locations count, because both end up published at /assets/img/:
//   src/assets/img/  — the canonical home
//   the repo root    — where GitHub's "Add files via upload" button puts them
import { readdir } from "node:fs/promises";

const IMAGE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

async function list(url) {
  try {
    return await readdir(url);
  } catch {
    return [];
  }
}

export default async function () {
  const [inAssets, inRoot] = await Promise.all([
    list(new URL("../assets/img/", import.meta.url)),
    list(new URL("../../", import.meta.url))
  ]);

  const files = [...new Set([...inAssets, ...inRoot.filter((f) => IMAGE.test(f))])];
  const has = Object.fromEntries(files.map((f) => [f, true]));
  return { files, has };
}

// Eleventy config — mayanageathers.com
// Input:  src/        (pages, layouts, data, assets)
// Output: _site/      (what Cloudflare Pages publishes)
// Note:   functions/  lives at the repo root and is picked up by Cloudflare
//         Pages directly — it is deliberately NOT part of the Eleventy build.

import { readdirSync } from "node:fs";

const IMAGE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

// Nudge, loudly but harmlessly, when images are sitting at the repo root.
// They still publish (see the shim below) — this just stops them piling up.
function warnAboutRootImages() {
  let stray = [];
  try {
    stray = readdirSync(".").filter((f) => IMAGE.test(f));
  } catch {
    return;
  }
  if (!stray.length) return;
  console.warn(
    `\n[images] ${stray.length} image(s) are at the repo root instead of ` +
      `src/assets/img/:\n` +
      stray.map((f) => `           - ${f}`).join("\n") +
      `\n           They still publish to /assets/img/, but please move them:\n` +
      `           git mv <file> src/assets/img/\n`
  );
}

export default function (eleventyConfig) {
  warnAboutRootImages();

  // Static assets are copied through untouched.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // COMPATIBILITY SHIM — not the intended home for images.
  //
  // GitHub's "Add files via upload" button drops files at the repo ROOT, so an
  // image uploaded that way would otherwise 404. Publishing root images to
  // /assets/img/ means an upload works immediately instead of silently
  // breaking the page. The build warns about each one (see below) so they get
  // tidied rather than accumulating.
  //
  // The canonical home is src/assets/img/. To upload straight into it from the
  // web UI: open that folder on GitHub first, then Add file -> Upload files.
  eleventyConfig.addPassthroughCopy({ "*.{jpg,jpeg,png,webp,gif,svg,avif}": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });

  // Rebuild the browser preview when CSS/JS change.
  eleventyConfig.setServerOptions({ showAllHosts: true });

  // `list | where("slug", "abc")` — pick matching entries out of a data array.
  eleventyConfig.addFilter("where", (list, key, value) =>
    (list || []).filter((item) => item && item[key] === value)
  );

  // `date | prettyDate` — "29 October 2023". Returns "" for a null date so
  // unknown publication dates are simply omitted rather than guessed.
  eleventyConfig.addFilter("prettyDate", (value) => {
    if (!value) return "";
    const d = new Date(value + "T12:00:00Z");
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"]
  };
}

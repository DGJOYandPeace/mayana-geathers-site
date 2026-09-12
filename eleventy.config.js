// Eleventy config — mayanageathers.com
// Input:  src/        (pages, layouts, data, assets)
// Output: _site/      (what Cloudflare Pages publishes)
// Note:   functions/  lives at the repo root and is picked up by Cloudflare
//         Pages directly — it is deliberately NOT part of the Eleventy build.

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { imageSize } from "image-size";

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

  // `"/assets/img/x.jpg" | imgAttrs` -> `width="1280" height="853"`, read from
  // the file itself. Hand-written dimensions go stale the moment an image is
  // swapped, and a wrong intrinsic ratio makes the browser reserve the wrong
  // space before the image loads.
  const dimsCache = new Map();
  eleventyConfig.addFilter("imgAttrs", (src) => {
    if (!src) return "";
    if (dimsCache.has(src)) return dimsCache.get(src);

    const path = "src" + (src.startsWith("/") ? src : "/" + src);
    let attrs = "";
    if (!existsSync(path)) {
      console.warn(`[images] no such file for imgAttrs: ${path}`);
    } else {
      try {
        // image-size v2 reads a buffer, not a path.
        const { width, height, orientation } = imageSize(readFileSync(path));
        // EXIF orientations 5-8 rotate the frame a quarter turn, so the stored
        // pixel dimensions are transposed relative to how it displays.
        const swap = orientation >= 5 && orientation <= 8;
        attrs = `width="${swap ? height : width}" height="${swap ? width : height}"`;
      } catch (err) {
        // Loudly, rather than silently emitting no dimensions.
        console.warn(`[images] could not read dimensions of ${path}: ${err.message}`);
      }
    }
    dimsCache.set(src, attrs);
    return attrs;
  });

  // `3 | pad2` -> "03". Print-index numbering.
  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));

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

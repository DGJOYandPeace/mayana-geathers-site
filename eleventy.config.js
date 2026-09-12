// Eleventy config — mayanageathers.com
// Input:  src/        (pages, layouts, data, assets)
// Output: _site/      (what Cloudflare Pages publishes)
// Note:   functions/  lives at the repo root and is picked up by Cloudflare
//         Pages directly — it is deliberately NOT part of the Eleventy build.

export default function (eleventyConfig) {
  // Static assets are copied through untouched.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Images may also sit at the repo root — that is where GitHub's "Add files
  // via upload" button drops them. Publish those to /assets/img/ as well, so
  // an image uploaded through the web UI works without being moved first.
  // src/assets/img stays the canonical home; this is just a courtesy path.
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

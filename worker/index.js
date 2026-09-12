/**
 * Worker entry point — Cloudflare Workers with static assets.
 *
 * The built site in _site/ is served by the ASSETS binding; this script only
 * runs for requests that aren't a static file, which is how /api/contact gets
 * handled. Configured in wrangler.jsonc.
 */
import { handleContact, methodNotAllowed } from "./contact.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") {
      return request.method === "POST"
        ? handleContact(request, env)
        : methodNotAllowed();
    }

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  }
};

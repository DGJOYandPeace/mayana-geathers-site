/**
 * Cloudflare Pages Functions entry point.
 *
 * Kept so the site still works if it is ever deployed as a Pages project
 * rather than a Worker. The logic lives in worker/contact.js, shared by both.
 */
import { handleContact, methodNotAllowed } from "../../worker/contact.js";

export const onRequestPost = ({ request, env }) => handleContact(request, env);
export const onRequest = () => methodNotAllowed();

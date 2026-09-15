/**
 * Contact + newsletter email handling.
 * ---------------------------------------------------------------------------
 * Shared by both deployment shapes, so the site works either way:
 *   worker/index.js         — Workers with static assets (what we deploy)
 *   functions/api/contact.js — Cloudflare Pages Functions (kept compatible)
 *
 * One handler serves BOTH site forms, distinguished by `form_type`:
 *   "contact"    -> the Contact page enquiry form
 *   "newsletter" -> the "Receive A Gift!" email signup
 *
 * Email goes out via the Resend API (resend.com).
 *
 * Required environment variables (set in the Cloudflare dashboard, never
 * committed):
 *   RESEND_API_KEY   Secret. A Resend key with *Sending access* is enough.
 *   MAIL_FROM        Sender on a Resend-verified domain.
 *   NOTIFY_EMAIL     Where notifications land (Mayana's inbox).
 *
 * See docs/SETUP.md for the walkthrough.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const LABELS = {
  contact: "New contact enquiry",
  newsletter: "New email signup"
};

const REASONS = {
  general: "General",
  booking: "Book a Session or Event",
  meditation: "Guided Meditation Question",
  press: "Press or Media"
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

const clean = (value, max = 2000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function handleContact(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // --- Honeypot. Silently accept so a bot learns nothing. -------------------
  if (clean(payload.website, 200)) {
    return json({ ok: true });
  }

  const formType = payload.form_type === "newsletter" ? "newsletter" : "contact";
  const email = clean(payload.email, 320);

  if (!isEmail(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  // --- Shape the notification ----------------------------------------------
  let fields;
  let subject;

  if (formType === "newsletter") {
    const firstName = clean(payload.first_name, 100);
    const lastName = clean(payload.last_name, 100);
    if (!firstName) {
      return json({ ok: false, error: "Please enter your first name." }, 400);
    }
    fields = [
      ["Name", `${firstName} ${lastName}`.trim()],
      ["Email", email],
      ["Requested", '"Embracing Your Gifts" guided meditation']
    ];
    subject = `${LABELS.newsletter}: ${firstName} ${lastName}`.trim();
  } else {
    const name = clean(payload.name, 200);
    const message = clean(payload.message, 5000);
    if (!name) {
      return json({ ok: false, error: "Please enter your name." }, 400);
    }
    if (!message) {
      return json({ ok: false, error: "Please include a short message." }, 400);
    }
    const reasonKey = clean(payload.reason, 60);
    fields = [
      ["Name", name],
      ["Email", email],
      ["Reason for inquiry", REASONS[reasonKey] || REASONS.general],
      ["Message", message]
    ];
    subject = `${LABELS.contact}: ${name}`;
  }

  fields.push(["Sent from", clean(payload.page, 300) || "/"]);

  // --- Config check. Kept after validation so misconfiguration surfaces in
  //     the logs rather than as a confusing client-side error. ---------------
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  const to = env.NOTIFY_EMAIL;

  if (!apiKey || !from || !to) {
    console.error(
      "Mail is not configured. Set RESEND_API_KEY, MAIL_FROM and NOTIFY_EMAIL " +
        "in the Worker's environment variables (see docs/SETUP.md)."
    );
    return json(
      { ok: false, error: "The form isn’t connected yet. Please try again shortly." },
      503
    );
  }

  const textBody = fields.map(([k, v]) => `${k}:\n${v}`).join("\n\n");
  const htmlBody = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#2C2521">
      <h2 style="font-family:Georgia,serif;font-weight:500;color:#2C2521">${escapeHtml(LABELS[formType])}</h2>
      ${fields
        .map(
          ([k, v]) =>
            `<p style="margin:0 0 14px"><strong style="display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8A7C73">${escapeHtml(
              k
            )}</strong>${escapeHtml(v).replace(/\n/g, "<br>")}</p>`
        )
        .join("")}
      <p style="margin-top:24px;font-size:12px;color:#8A7C73">Sent from mayanageathers.com</p>
    </div>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text: textBody,
        html: htmlBody
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend rejected the message:", res.status, detail);
      return json({ ok: false, error: "Your message couldn’t be sent just now." }, 502);
    }
  } catch (err) {
    console.error("Resend request failed:", err);
    return json({ ok: false, error: "Your message couldn’t be sent just now." }, 502);
  }

  return json({ ok: true });
}

export function methodNotAllowed() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}

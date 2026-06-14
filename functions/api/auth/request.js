import { json, newId } from "../_lib.js";

// POST /api/auth/request  { email }  -> sends a magic sign-in link
export async function onRequestPost({ request, env }) {
  let email;
  try { ({ email } = await request.json()); } catch (e) { return json({ error: "bad request" }, 400); }
  email = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email." }, 400);

  const token = newId() + newId();
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await env.DB.prepare("INSERT INTO magic_tokens (token, email, expires_at, used) VALUES (?,?,?,0)")
    .bind(token, email, expires).run();

  const base = env.SITE_URL || new URL(request.url).origin;
  const link = `${base}/api/auth/verify?token=${token}`;

  // Send via Resend if configured; otherwise return the link (dev mode).
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.MAIL_FROM || "Sikh University <login@sikhuniversity.pages.dev>",
          to: [email],
          subject: "Your Sikh University sign-in link",
          html: `<p>Click to sign in to Sikh University:</p><p><a href="${link}">Sign in</a></p><p>This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
        }),
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        console.log("Resend send failed", r.status, detail);
        // Surface the provider message so the operator can fix config (e.g. verify a domain).
        return json({ error: "Could not send email.", detail: detail.slice(0, 500), status: r.status }, 502);
      }
      return json({ ok: true, sent: true });
    } catch (e) { console.log("Resend threw", e && e.message); return json({ error: "Could not send email.", detail: String(e && e.message) }, 502); }
  }
  // Dev fallback (no mail provider configured yet): return the link so sign-in is testable.
  return json({ ok: true, sent: false, devLink: link });
}

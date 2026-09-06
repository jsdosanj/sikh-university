import { newId, json } from "../_lib.js";
import { resetPasswordTemplate } from "../../_email-templates.js";

// POST /api/auth/forgot-password { email }
//
// Doubles as "set my first password" for the 30 real pre-existing users
// who signed up before password auth existed -- there is no meaningful
// difference between "I forgot my password" and "I never had one" from
// this endpoint's point of view, and treating them identically means no
// separate migration flow was needed for existing accounts.
//
// Always returns {ok:true} regardless of whether the email exists --
// enumeration-resistant by construction.
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const email = String(body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email." }, 400);

  const u = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (u) {
    // One outstanding token at a time per user -- same anti-mail-bomb rule
    // the magic-link flow already uses.
    const recent = await env.DB.prepare(
      "SELECT 1 FROM password_reset_tokens WHERE user_id=? AND used=0 AND expires_at > ?"
    ).bind(u.id, Date.now()).first();

    if (!recent) {
      const token = newId() + newId();
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour
      await env.DB.prepare("INSERT INTO password_reset_tokens (token, user_id, expires_at, used, created_at) VALUES (?,?,?,0,?)")
        .bind(token, u.id, expires, Date.now()).run();

      const base = env.SITE_URL || new URL(request.url).origin;
      const link = `${base}/reset-password.html?token=${token}`;
      const t = resetPasswordTemplate(link);

      if (env.RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
            body: JSON.stringify({
              from: env.MAIL_FROM || "Sikhi University <login@sikhiuni.com>",
              to: [email],
              reply_to: env.REPLY_TO || "contact@sikhism.io",
              subject: t.subject,
              text: t.text,
              html: t.html,
            }),
          });
        } catch (e) { console.log("Resend threw (forgot-password)", e && e.message); }
      } else {
        console.log("forgot-password: RESEND_API_KEY not configured for", email);
      }
    }
  }

  return json({ ok: true });
}

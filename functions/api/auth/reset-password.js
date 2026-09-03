import { newId, sessionCookie, logEvent, json } from "../_lib.js";
import { hashPassword } from "../../_password.js";

// POST /api/auth/reset-password { token, password }
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");
  if (!token) return json({ error: "Missing token." }, 400);
  if (password.length < 12) return json({ error: "Password must be at least 12 characters." }, 400);

  // Atomic consume, same pattern as verify.js's magic-token consumption:
  // one conditional UPDATE...RETURNING checks (unused + unexpired) and
  // marks used in one statement, so two concurrent submits can't both succeed.
  const consumed = await env.DB.prepare(
    "UPDATE password_reset_tokens SET used = 1 WHERE token = ? AND used = 0 AND expires_at > ? RETURNING user_id"
  ).bind(token, Date.now()).first();
  if (!consumed) return json({ error: "This link is invalid or has expired." }, 400);

  const u = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(consumed.user_id).first();
  if (!u) return json({ error: "This link is invalid or has expired." }, 400);

  const passwordHash = await hashPassword(password);
  await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, u.id).run();

  const sid = newId() + newId();
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const mfaRow = await env.DB.prepare("SELECT enabled_at FROM user_mfa WHERE user_id=?").bind(u.id).first();
  const mfaEnrolled = !!(mfaRow && mfaRow.enabled_at);
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, mfa_ok) VALUES (?,?,?,?)")
    .bind(sid, u.id, expires, mfaEnrolled ? 0 : 1).run();
  await logEvent(env, u, "login", null, "password-reset");

  return json({ ok: true, mfaRequired: mfaEnrolled }, 200, { "Set-Cookie": sessionCookie(sid, 30 * 24 * 60 * 60) });
}

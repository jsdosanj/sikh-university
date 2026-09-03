import { newId, sessionCookie, logEvent, json } from "../_lib.js";
import { verifyPassword, DUMMY_HASH } from "../../_password.js";

// POST /api/auth/login { email, password }
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) return json({ error: "Email and password required." }, 400);

  const u = await env.DB.prepare("SELECT id, role, password_hash FROM users WHERE email = ?").bind(email).first();
  // Enumeration/timing resistance: always run a hash comparison, even for a
  // nonexistent account or one with no password set yet (magic-link-only).
  const storedHash = u?.password_hash || DUMMY_HASH;
  const passOk = await verifyPassword(password, storedHash);
  if (!u || !u.password_hash || !passOk) return json({ error: "Incorrect email or password." }, 401);

  const sid = newId() + newId();
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const mfaRow = await env.DB.prepare("SELECT enabled_at FROM user_mfa WHERE user_id=?").bind(u.id).first();
  const mfaEnrolled = !!(mfaRow && mfaRow.enabled_at);
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, mfa_ok) VALUES (?,?,?,?)")
    .bind(sid, u.id, expires, mfaEnrolled ? 0 : 1).run();
  await logEvent(env, { id: u.id, role: u.role }, "login", email, "password");

  return json({ ok: true, mfaRequired: mfaEnrolled }, 200, { "Set-Cookie": sessionCookie(sid, 30 * 24 * 60 * 60) });
}

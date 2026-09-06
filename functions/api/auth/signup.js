import { newId, sessionCookie, isAdminEmail, logEvent, json } from "../_lib.js";
import { hashPassword } from "../../_password.js";
import { insertUserWithOptin, sendWelcomeEmail } from "./_onboarding.js";

// POST /api/auth/signup { email, password, marketing? }
//
// `marketing` is the signup form's consent checkbox (login.astro). Only a
// literal boolean true counts as consent -- absent, "true", 1 and other
// truthy lookalikes all read as no.
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const marketing = body?.marketing === true;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return json({ error: "Enter a valid email." }, 400);
  if (password.length < 12) return json({ error: "Password must be at least 12 characters." }, 400);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return json({ error: "An account with that email already exists. Try signing in, or use ‘Forgot password’." }, 409);

  const id = newId();
  const role = isAdminEmail(env, email) ? "admin" : "learner";
  const passwordHash = await hashPassword(password);
  await insertUserWithOptin(env, {
    id, email, name: null, role, createdAt: Date.now(), marketing, passwordHash,
  });
  await logEvent(env, { id, role }, "user_created", email, "password");

  const sid = newId() + newId();
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, mfa_ok) VALUES (?,?,?,1)").bind(sid, id, expires).run();
  await logEvent(env, { id, role }, "login", email, "password");

  // Fire-and-forget: the account exists either way, and a Resend outage must
  // not turn a successful signup into an error the user sees.
  sendWelcomeEmail(context, email, null);

  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(sid, 30 * 24 * 60 * 60) });
}

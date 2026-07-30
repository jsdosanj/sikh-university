import { json, requireUser, logEvent } from "../../_lib.js";
import { generateSecret, otpauthUri, encryptSecret } from "../../_totp.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS user_mfa (user_id TEXT PRIMARY KEY, secret_enc TEXT NOT NULL, enabled_at INTEGER, created_at INTEGER NOT NULL)"
  ).run();
}

// POST /api/auth/mfa/enroll -> issue a fresh TOTP secret (pending until /confirm).
// Re-enrolling before confirming overwrites the pending secret; an already-enabled
// account must /disable first (prevents silently invalidating a working setup).
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireUser(env, request);
  if (error) return error;
  await ensure(env);

  const existing = await env.DB.prepare("SELECT enabled_at FROM user_mfa WHERE user_id=?").bind(user.id).first();
  if (existing && existing.enabled_at) return json({ error: "mfa already enabled" }, 409);

  const secret = generateSecret(20);
  const secretEnc = await encryptSecret(env.MFA_ENC_KEY, secret);
  await env.DB.prepare(
    "INSERT INTO user_mfa (user_id, secret_enc, enabled_at, created_at) VALUES (?,?,NULL,?) " +
    "ON CONFLICT(user_id) DO UPDATE SET secret_enc=excluded.secret_enc, created_at=excluded.created_at"
  ).bind(user.id, secretEnc, Date.now()).run();
  await logEvent(env, user, "mfa_enroll_start", user.id, null);

  return json({
    secret,
    otpauth: otpauthUri(secret, user.email),
  });
}

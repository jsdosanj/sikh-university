import { json, requireUser, logEvent, parseBody } from "../../_lib.js";
import { decryptSecret, verifyTotp, generateBackupCodes, sha256Hex } from "../../_totp.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS mfa_backup_codes (user_id TEXT NOT NULL, code_hash TEXT NOT NULL, used_at INTEGER, PRIMARY KEY (user_id, code_hash))"
  ).run();
}

// POST /api/auth/mfa/confirm { code } -> finalize enrollment. Verifies the code
// against the pending secret, sets enabled_at, and returns 10 backup codes ONCE
// (plaintext) — only the SHA-256 hash is ever stored.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireUser(env, request);
  if (error) return error;
  await ensure(env);

  const { body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const row = await env.DB.prepare("SELECT secret_enc, enabled_at FROM user_mfa WHERE user_id=?").bind(user.id).first();
  if (!row) return json({ error: "no pending enrollment" }, 400);
  if (row.enabled_at) return json({ error: "mfa already enabled" }, 409);

  const secret = await decryptSecret(env.MFA_ENC_KEY, row.secret_enc);
  const ok = await verifyTotp(secret, body.code, { window: 1 });
  if (!ok) return json({ error: "invalid code" }, 400);

  await env.DB.prepare("UPDATE user_mfa SET enabled_at=? WHERE user_id=?").bind(Date.now(), user.id).run();

  const codes = generateBackupCodes(10, 8);
  for (const code of codes) {
    const hash = await sha256Hex(code);
    await env.DB.prepare(
      "INSERT INTO mfa_backup_codes (user_id, code_hash, used_at) VALUES (?,?,NULL)"
    ).bind(user.id, hash).run();
  }
  await logEvent(env, user, "mfa_enabled", user.id, null);

  return json({ ok: true, backupCodes: codes });
}

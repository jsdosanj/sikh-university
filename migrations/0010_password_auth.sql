-- Real password auth, added alongside the magic-link flow (2026-09-03
-- decision: password becomes primary sign-in; magic-link is retired to a
-- true forgot-password-equivalent -- see functions/api/auth/{signup,
-- login}.js and the reworked functions/api/auth/request.js).
--
-- password_hash is NULLable on purpose: all 30 real existing users signed
-- up via magic-link only and have none. They keep working exactly as
-- before (magic-link still logs them in) until they set a password, either
-- via signup with a matching email (rejected, "already exists" -- so
-- instead) or via the forgot-password flow, which now DOUBLES as
-- "set my first password" for a pre-existing account.
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Dedicated, single-purpose table for password-reset tokens -- kept
-- separate from magic_tokens (which still logs a user straight in) so the
-- two flows can never be confused with each other at the schema level.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

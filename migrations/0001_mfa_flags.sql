-- Migration 0001: MFA + user flags.
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0001_mfa_flags.sql
CREATE TABLE IF NOT EXISTS user_mfa (
  user_id    TEXT PRIMARY KEY,
  secret_enc TEXT NOT NULL,
  enabled_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  user_id TEXT NOT NULL, code_hash TEXT NOT NULL,
  used_at INTEGER, PRIMARY KEY (user_id, code_hash)
);
-- SQLite/D1 has no ADD COLUMN IF NOT EXISTS, so these lines are NOT safely re-runnable —
-- this migration is meant to be run once per database.
ALTER TABLE sessions ADD COLUMN mfa_ok INTEGER NOT NULL DEFAULT 0;
-- Per-session bad-code counter: 5 failed /api/auth/mfa/verify attempts invalidates
-- the session (forces a fresh magic-link sign-in), closing the 6-digit brute-force window.
ALTER TABLE sessions ADD COLUMN mfa_fail_count INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS user_flags (
  user_id TEXT NOT NULL, flag TEXT NOT NULL,
  granted_by TEXT, granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, flag)
);

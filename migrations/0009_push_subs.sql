-- push_subs is defined in schema.sql but was never actually created on the
-- live (repointed) database -- confirmed missing via PRAGMA/sqlite_master
-- 2026-09-03, even though functions/push-sender.js and
-- functions/api/push/{subscribe,unsubscribe}.js all depend on it, meaning
-- web-push subscribe/unsubscribe has been silently failing. Idempotent
-- (IF NOT EXISTS), byte-identical to schema.sql's own definition.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER NOT NULL
);

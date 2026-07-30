-- Migration 0004: threaded discussions (depth-1 replies) + moderation.
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0004_discussions_threading.sql
-- Each ALTER is NOT safely re-runnable (SQLite/D1 has no ADD COLUMN IF NOT EXISTS);
-- functions/api/discussions.js's ensure() wraps each in its own try/catch so the
-- handler stays safe to call before AND after this migration has run.
ALTER TABLE discussions ADD COLUMN parent_id TEXT;             -- NULL = thread root (all existing rows)
ALTER TABLE discussions ADD COLUMN author_role TEXT;           -- snapshot: 'instructor' | NULL
ALTER TABLE discussions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;   -- roots only
ALTER TABLE discussions ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;   -- roots only
ALTER TABLE discussions ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;   -- soft moderator removal
CREATE TABLE IF NOT EXISTS discussion_reports (
  message_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT,
  created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_discussions_parent ON discussions(parent_id, created_at);

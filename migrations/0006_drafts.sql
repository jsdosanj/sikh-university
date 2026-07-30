-- Migration 0006: course authoring studio drafts + review workflow.
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0006_drafts.sql
CREATE TABLE IF NOT EXISTS course_drafts (
  id TEXT PRIMARY KEY, author_id TEXT NOT NULL,
  base_course_id TEXT,                  -- NULL = new course; else editing an existing catalogue course
  course_id TEXT NOT NULL,              -- proposed slug-id; uniqueness checked at submit + import
  title TEXT NOT NULL, topic TEXT NOT NULL, level INTEGER NOT NULL,
  meta TEXT NOT NULL,                   -- JSON {summary, outcomes[], terms[], references[], sourceText?, aiAssisted}
  status TEXT NOT NULL DEFAULT 'draft', -- draft|submitted|in_review|changes_requested|approved|published
  review_notes TEXT, reviewed_by TEXT, reviewed_at INTEGER,
  submitted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_author ON course_drafts(author_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON course_drafts(status, submitted_at);

CREATE TABLE IF NOT EXISTS draft_lessons (
  draft_id TEXT NOT NULL, idx INTEGER NOT NULL,
  title TEXT NOT NULL, summary TEXT, html TEXT NOT NULL,   -- sanitized server-side (tag allowlist)
  media TEXT,                                              -- JSON [{key,kind,caption}] refs into media_objects
  updated_at INTEGER NOT NULL, PRIMARY KEY (draft_id, idx)
);
CREATE TABLE IF NOT EXISTS draft_quiz (
  draft_id TEXT NOT NULL, idx INTEGER NOT NULL,
  q TEXT NOT NULL, options TEXT NOT NULL,                  -- JSON array
  answer INTEGER NOT NULL,                                 -- lives ONLY here + admin export; never student-facing
  PRIMARY KEY (draft_id, idx)
);

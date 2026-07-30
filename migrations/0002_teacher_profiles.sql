-- Migration 0002: teacher public profiles + professor-string claims.
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0002_teacher_profiles.sql
CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id            TEXT PRIMARY KEY,             -- FK users.id
  slug               TEXT UNIQUE NOT NULL,         -- /teacher/<slug>; frozen after first approval
  display_name       TEXT NOT NULL,
  bio                TEXT,                         -- plain text, 2000 cap; \n\n = paragraphs
  credentials        TEXT,                         -- plain text, 1000 cap
  areas              TEXT,                         -- comma-joined, fixed allowlist
  languages_taught   TEXT,                         -- comma-joined, reuse LANGUAGES allowlist
  links              TEXT,                         -- JSON [{kind,url}], max 4, https only
  photo_key          TEXT,                         -- R2 key (media/teachers/<user_id>.<ext>) after approval
  claimed_professor  TEXT,                         -- exact courses.json professor string; set only via approved claim
  verification_level TEXT NOT NULL DEFAULT 'none', -- none | identity | scholar
  verified_by TEXT, verified_at INTEGER, verification_note TEXT,
  is_public          INTEGER NOT NULL DEFAULT 0,
  publish_requested_at INTEGER,                    -- set when the teacher asks to go public; surfaces in the admin queue
  approved_at INTEGER, approved_by TEXT,           -- first-publish gate
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_public ON teacher_profiles(is_public, slug);

CREATE TABLE IF NOT EXISTS professor_claims (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, professor_name TEXT NOT NULL,
  statement TEXT,                                   -- "I am this person / I represent this estate"
  status TEXT NOT NULL DEFAULT 'pending',           -- pending | approved | denied
  decided_by TEXT, decided_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_professor_claims_status ON professor_claims(status, created_at);

-- Migration 0007: teacher-initiated requests to archive a published course.
-- A teacher can't safely hard-delete a live, git-managed catalogue entry from a
-- Worker request (no staging environment, no-shrink CI guard) — this is the
-- reviewed, git-pipeline-consistent equivalent, mirroring professor_claims.
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0007_archive_requests.sql
CREATE TABLE IF NOT EXISTS course_archive_requests (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, teacher_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|denied|approved|archived
  requested_at INTEGER NOT NULL, decided_by TEXT, decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_archive_requests_status ON course_archive_requests(status, requested_at);

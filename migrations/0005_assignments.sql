-- Migration 0005: assignments + submissions (classroom workflow).
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0005_assignments.sql
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, teacher_id TEXT NOT NULL,
  title TEXT NOT NULL, instructions TEXT NOT NULL,
  due_at INTEGER, points INTEGER NOT NULL DEFAULT 100,
  allow_file INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id, status);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, user_id TEXT NOT NULL,
  text_content TEXT,
  file_key TEXT,
  submitted_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  late INTEGER NOT NULL DEFAULT 0,
  grade INTEGER, feedback TEXT, graded_by TEXT, graded_at INTEGER,
  status TEXT NOT NULL DEFAULT 'submitted',
  UNIQUE (assignment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id, status);

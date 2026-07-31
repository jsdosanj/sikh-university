-- Sikhi University — D1 schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  country TEXT,                                -- self-reported, from a fixed allowlist
  languages TEXT,                              -- comma-joined, from a fixed allowlist
  role TEXT NOT NULL DEFAULT 'learner',        -- learner | teacher | admin
  created_at INTEGER NOT NULL
);
-- Existing databases: run once to add the profile columns:
--   ALTER TABLE users ADD COLUMN country TEXT;
--   ALTER TABLE users ADD COLUMN languages TEXT;

CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
-- The sign-in throttle looks tokens up by email; without this it full-scans.
CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON magic_tokens(email, expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS teacher_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  background TEXT,                              -- qualifications / statement
  courses TEXT,                                -- what they'd like to teach
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | denied
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  done TEXT,                                   -- JSON array of completed lesson indices
  passed_score INTEGER,                        -- NULL until quiz passed (>=80)
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- The tables below are also auto-created by their handlers on first write
-- (so no manual migration is required): discussions, ratings, certificates.
CREATE TABLE IF NOT EXISTS discussions (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, user_id TEXT, name TEXT,
  message TEXT NOT NULL, created_at INTEGER NOT NULL,
  -- Threading + moderation (migrations/0004_discussions_threading.sql):
  parent_id TEXT, author_role TEXT,
  pinned INTEGER NOT NULL DEFAULT 0, locked INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_discussions_course ON discussions(course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_discussions_parent ON discussions(parent_id, created_at);
CREATE TABLE IF NOT EXISTS discussion_reports (
  message_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT,
  created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  PRIMARY KEY (message_id, user_id)
);

-- Assignments + submissions (migrations/0005_assignments.sql).
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

-- Course authoring studio drafts + review workflow (migrations/0006_drafts.sql).
CREATE TABLE IF NOT EXISTS course_drafts (
  id TEXT PRIMARY KEY, author_id TEXT NOT NULL,
  base_course_id TEXT,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL, topic TEXT NOT NULL, level INTEGER NOT NULL,
  meta TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public', -- public|gated (migrations/0008_course_visibility.sql)
  review_notes TEXT, reviewed_by TEXT, reviewed_at INTEGER,
  submitted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_author ON course_drafts(author_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON course_drafts(status, submitted_at);

CREATE TABLE IF NOT EXISTS draft_lessons (
  draft_id TEXT NOT NULL, idx INTEGER NOT NULL,
  title TEXT NOT NULL, summary TEXT, html TEXT NOT NULL,
  media TEXT,
  updated_at INTEGER NOT NULL, PRIMARY KEY (draft_id, idx)
);
CREATE TABLE IF NOT EXISTS draft_quiz (
  draft_id TEXT NOT NULL, idx INTEGER NOT NULL,
  q TEXT NOT NULL, options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  PRIMARY KEY (draft_id, idx)
);

-- Teacher-initiated requests to archive a published course (migrations/0007_archive_requests.sql).
CREATE TABLE IF NOT EXISTS course_archive_requests (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, teacher_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at INTEGER NOT NULL, decided_by TEXT, decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_archive_requests_status ON course_archive_requests(status, requested_at);
CREATE TABLE IF NOT EXISTS ratings (
  course_id TEXT NOT NULL, user_id TEXT NOT NULL, stars INTEGER NOT NULL,
  review TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (course_id, user_id)
);
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, course_id TEXT NOT NULL,
  name TEXT, score INTEGER, issued_at INTEGER NOT NULL, UNIQUE(user_id, course_id)
);

-- Gradebook & platform infrastructure. These are also auto-created by their
-- handlers on first write (gradebook.js, announcements.js, course-teachers.js,
-- and logEvent in _lib.js), so no manual migration is required.

-- Which teacher teaches which course (admin-assigned). Scopes a teacher's gradebook.
CREATE TABLE IF NOT EXISTS course_teachers (
  course_id TEXT NOT NULL, user_id TEXT NOT NULL, assigned_at INTEGER NOT NULL,
  PRIMARY KEY (course_id, user_id)
);

-- A teacher/admin grade override that wins over the computed quiz score.
CREATE TABLE IF NOT EXISTS grade_overrides (
  user_id TEXT NOT NULL, course_id TEXT NOT NULL, score INTEGER, reason TEXT,
  overridden_by TEXT, overridden_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- Course announcements (teacher who owns the course, or admin → enrolled students).
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, author_id TEXT, author_name TEXT,
  title TEXT, body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id, created_at);

-- Explicit registration: a learner enrols in a course or registers for a program.
-- Also auto-created by functions/api/enrollments.js on first write.
CREATE TABLE IF NOT EXISTS enrollments (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,                          -- 'course' | 'program'
  target_id TEXT NOT NULL,                     -- course id or program id
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, target_id)
);

-- Append-only audit log (sign-relevant actions: passes, overrides, role changes…).
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, ts INTEGER NOT NULL, user_id TEXT, role TEXT,
  action TEXT NOT NULL, target TEXT, detail TEXT
);
-- The admin events viewer sorts/filters by recency over this append-only table.
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);

-- Cohort mode: a teacher/admin creates a cohort for a course and shares an invite
-- code; learners join (which enrols them); the owner sees a roster with progress.
-- Also auto-created by functions/api/cohorts.js on first write.
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE, owner_id TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cohorts_owner ON cohorts(owner_id);
CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at INTEGER NOT NULL,
  PRIMARY KEY (cohort_id, user_id)
);

-- Feedback is also auto-created by functions/api/feedback.js on first write.
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,                                -- NULL if submitted while signed out
  email TEXT,
  course_id TEXT,                              -- optional: feedback about a specific course
  category TEXT,                               -- general | course | bug | suggestion
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',          -- new | read | resolved
  created_at INTEGER NOT NULL
);

-- Per-IP rate limiting (fixed window), written atomically by worker.js checkRateLimit.
-- Also created lazily at runtime, so this block is documentation / fresh-setup convenience.
CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

-- Web Push reminder subscriptions (coursework nudges). Also auto-created by
-- functions/api/push/subscribe.js on first write.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,                   -- push service URL (unique per browser install)
  p256dh TEXT NOT NULL,                        -- client public key (kept for future payload encryption)
  auth TEXT NOT NULL,                          -- client auth secret (same)
  user_id TEXT,                                -- NULL if subscribed while signed out
  created_at INTEGER NOT NULL
);

-- MFA + user flags (migrations/0001_mfa_flags.sql). NOT auto-created by a handler's
-- ensure() — this one requires the migration; mirrored here only for fresh-seed parity.
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
-- fine here since they only ever run once, against the sessions table just created above.
ALTER TABLE sessions ADD COLUMN mfa_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN mfa_fail_count INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS user_flags (
  user_id TEXT NOT NULL, flag TEXT NOT NULL,
  granted_by TEXT, granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, flag)
);

-- Teacher public profiles + professor-string claims (migrations/0002_teacher_profiles.sql).
CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id            TEXT PRIMARY KEY,
  slug               TEXT UNIQUE NOT NULL,
  display_name       TEXT NOT NULL,
  bio                TEXT,
  credentials        TEXT,
  areas              TEXT,
  languages_taught   TEXT,
  links              TEXT,
  photo_key          TEXT,
  claimed_professor  TEXT,
  verification_level TEXT NOT NULL DEFAULT 'none',
  verified_by TEXT, verified_at INTEGER, verification_note TEXT,
  is_public          INTEGER NOT NULL DEFAULT 0,
  publish_requested_at INTEGER,
  approved_at INTEGER, approved_by TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_public ON teacher_profiles(is_public, slug);

CREATE TABLE IF NOT EXISTS professor_claims (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, professor_name TEXT NOT NULL,
  statement TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT, decided_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_professor_claims_status ON professor_claims(status, created_at);

-- Media upload registry, R2-backed (migrations/0003_media.sql).
CREATE TABLE IF NOT EXISTS media_objects (
  key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  context TEXT,
  size INTEGER NOT NULL, content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  rights TEXT,
  rights_note TEXT,
  upload_id TEXT,
  created_at INTEGER NOT NULL, reviewed_by TEXT, reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_objects(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_status ON media_objects(status);

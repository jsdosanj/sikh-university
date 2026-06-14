-- Sikh University — D1 schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'learner',        -- learner | teacher | admin
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

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
  message TEXT NOT NULL, created_at INTEGER NOT NULL
);
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

-- Append-only audit log (sign-relevant actions: passes, overrides, role changes…).
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, ts INTEGER NOT NULL, user_id TEXT, role TEXT,
  action TEXT NOT NULL, target TEXT, detail TEXT
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

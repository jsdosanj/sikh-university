-- Migration 0008: institutional/gated course visibility.
-- A draft can be marked 'gated' instead of 'public': the published course still
-- appears in the free catalogue with title + summary, but full lesson/quiz
-- content is restricted to the course's teacher/admin and members of a paid
-- cohort (functions/api/cohorts.js) tied to that course. Payment itself is
-- handled entirely by the licensing institution on their own site — sikhiuni.com
-- never processes payment; the institution just hands buyers the cohort's
-- existing invite code.
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0008_course_visibility.sql
ALTER TABLE course_drafts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

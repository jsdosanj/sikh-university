import { json } from "./_lib.js";
import { TEACHER_PUBLIC_COLS, presentTeacherProfile as present } from "./_teacher-page.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS teacher_profiles (" +
    "user_id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL, bio TEXT, " +
    "credentials TEXT, areas TEXT, languages_taught TEXT, links TEXT, photo_key TEXT, " +
    "claimed_professor TEXT, verification_level TEXT NOT NULL DEFAULT 'none', " +
    "verified_by TEXT, verified_at INTEGER, verification_note TEXT, is_public INTEGER NOT NULL DEFAULT 0, " +
    "publish_requested_at INTEGER, approved_at INTEGER, approved_by TEXT, " +
    "created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"
  ).run();
}

const PUBLIC_COLS = TEACHER_PUBLIC_COLS.replace("user_id, ", "");

// GET /api/teachers -> public directory (is_public=1 only, whitelisted fields).
// GET /api/teachers?slug=<slug> -> one public profile + the courses they're
//   assigned to teach (course_teachers) — the studio/authored-courses merge is
//   done by the caller using claimedProfessor against the course catalogue.
// GET /api/teachers?professor=<exact professor string> -> the public profile (if
//   any) that has claimed that professor string — powers the professor-page bridge.
export async function onRequestGet({ request, env }) {
  await ensure(env);
  const p = new URL(request.url).searchParams;
  const slug = p.get("slug");
  const professor = p.get("professor");

  if (slug) {
    const row = await env.DB.prepare(`SELECT user_id, ${PUBLIC_COLS} FROM teacher_profiles WHERE slug=? AND is_public=1`).bind(slug).first();
    if (!row) return json({ error: "not found" }, 404);
    const { results } = await env.DB.prepare("SELECT course_id FROM course_teachers WHERE user_id=?").bind(row.user_id).all();
    return json({ teacher: present(row), assignedCourseIds: (results || []).map((r) => r.course_id) });
  }

  if (professor) {
    const row = await env.DB.prepare(`SELECT ${PUBLIC_COLS} FROM teacher_profiles WHERE claimed_professor=? AND is_public=1`).bind(professor).first();
    return json({ teacher: present(row) });
  }

  const { results } = await env.DB.prepare(`SELECT ${PUBLIC_COLS} FROM teacher_profiles WHERE is_public=1 ORDER BY display_name`).all();
  return json({ teachers: (results || []).map(present) });
}

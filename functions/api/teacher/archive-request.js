import { json, requireUser, newId, logEvent, parseBody, isCourseTeacher } from "../_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS course_archive_requests (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, " +
    "teacher_id TEXT NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'pending', " +
    "requested_at INTEGER NOT NULL, decided_by TEXT, decided_at INTEGER)"
  ).run();
}

// GET /api/teacher/archive-request -> the signed-in teacher's own requests (any status).
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireUser(env, request);
  if (error) return error;
  await ensure(env);
  const { results } = await env.DB.prepare(
    "SELECT id, course_id, reason, status, requested_at, decided_at FROM course_archive_requests WHERE teacher_id=? ORDER BY requested_at DESC"
  ).bind(user.id).all();
  return json({ requests: results || [] });
}

// POST /api/teacher/archive-request { courseId, reason } -> file a request to
// retire a published course. Reviewed by an admin (functions/api/admin/archive-requests.js)
// before it's ever applied to the live catalogue — never a direct/runtime deletion.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireUser(env, request);
  if (error) return error;
  await ensure(env);
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const courseId = String(b.courseId || "").trim().slice(0, 120);
  const reason = String(b.reason || "").trim().slice(0, 1000);
  if (!courseId) return json({ error: "courseId required" }, 400);
  if (user.role !== "admin" && !(await isCourseTeacher(env, user.id, courseId))) {
    return json({ error: "You don't teach that course." }, 403);
  }

  const dup = await env.DB.prepare(
    "SELECT id FROM course_archive_requests WHERE course_id=? AND status='pending'"
  ).bind(courseId).first();
  if (dup) return json({ error: "There's already a pending archive request for that course." }, 409);

  const id = newId();
  await env.DB.prepare(
    "INSERT INTO course_archive_requests (id, course_id, teacher_id, reason, status, requested_at) VALUES (?,?,?,?,'pending',?)"
  ).bind(id, courseId, user.id, reason, Date.now()).run();
  await logEvent(env, user, "course_archive_requested", courseId, reason || null);
  return json({ ok: true, id });
}

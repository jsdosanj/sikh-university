import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS course_teachers (course_id TEXT NOT NULL, user_id TEXT NOT NULL, assigned_at INTEGER NOT NULL, PRIMARY KEY (course_id, user_id))"
  ).run();
}

// GET /api/admin/course-teachers -> all teacher↔course assignments (admin only).
export async function onRequestGet({ request, env }) {
  const { error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  await ensure(env);
  const { results } = await env.DB.prepare(
    "SELECT ct.course_id, ct.user_id, u.email, u.name, ct.assigned_at FROM course_teachers ct JOIN users u ON u.id=ct.user_id ORDER BY ct.course_id"
  ).all();
  return json({ assignments: results || [] });
}

// POST /api/admin/course-teachers { courseId, userId, action:'assign'|'unassign' }
// Assigning a learner promotes them to teacher. Assigning an admin does NOT touch
// their role (it must stay 'admin' — verify.js's ADMIN_EMAILS demotion logic
// depends on that): course_teachers is an independent join table, so an admin can
// teach specific courses in addition to their admin responsibilities.
export async function onRequestPost({ request, env }) {
  const { user, error: authError } = await requireMfa(env, request, ["admin"]);
  if (authError) return authError;
  await ensure(env);
  const { body: b, error } = await parseBody(request);
  if (error) return error;
  if (!b.courseId || !b.userId) return json({ error: "courseId and userId required" }, 400);

  if (b.action === "unassign") {
    await env.DB.prepare("DELETE FROM course_teachers WHERE course_id=? AND user_id=?").bind(b.courseId, b.userId).run();
    await logEvent(env, user, "teacher_unassign", b.courseId + "/" + b.userId, null);
    return json({ ok: true });
  }

  const target = await env.DB.prepare("SELECT id, role FROM users WHERE id=?").bind(b.userId).first();
  if (!target) return json({ error: "user not found" }, 404);
  await env.DB.prepare("INSERT OR IGNORE INTO course_teachers (course_id, user_id, assigned_at) VALUES (?,?,?)").bind(b.courseId, b.userId, Date.now()).run();
  if (target.role === "learner") await env.DB.prepare("UPDATE users SET role='teacher' WHERE id=?").bind(b.userId).run();
  await logEvent(env, user, "teacher_assign", b.courseId + "/" + b.userId, null);
  return json({ ok: true });
}

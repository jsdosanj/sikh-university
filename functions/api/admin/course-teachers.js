import { json, getUser, logEvent } from "../_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS course_teachers (course_id TEXT NOT NULL, user_id TEXT NOT NULL, assigned_at INTEGER NOT NULL, PRIMARY KEY (course_id, user_id))"
  ).run();
}

// GET /api/admin/course-teachers -> all teacher↔course assignments (admin only).
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  await ensure(env);
  const { results } = await env.DB.prepare(
    "SELECT ct.course_id, ct.user_id, u.email, u.name, ct.assigned_at FROM course_teachers ct JOIN users u ON u.id=ct.user_id ORDER BY ct.course_id"
  ).all();
  return json({ assignments: results || [] });
}

// POST /api/admin/course-teachers { courseId, userId, action:'assign'|'unassign' }
// Assigning a learner promotes them to teacher. Admins can't be assigned as teachers.
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  await ensure(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  if (!b.courseId || !b.userId) return json({ error: "courseId and userId required" }, 400);

  if (b.action === "unassign") {
    await env.DB.prepare("DELETE FROM course_teachers WHERE course_id=? AND user_id=?").bind(b.courseId, b.userId).run();
    await logEvent(env, user, "teacher_unassign", b.courseId + "/" + b.userId, null);
    return json({ ok: true });
  }

  const target = await env.DB.prepare("SELECT id, role FROM users WHERE id=?").bind(b.userId).first();
  if (!target) return json({ error: "user not found" }, 404);
  if (target.role === "admin") return json({ error: "cannot assign an admin as a course teacher" }, 400);
  await env.DB.prepare("INSERT OR IGNORE INTO course_teachers (course_id, user_id, assigned_at) VALUES (?,?,?)").bind(b.courseId, b.userId, Date.now()).run();
  if (target.role === "learner") await env.DB.prepare("UPDATE users SET role='teacher' WHERE id=?").bind(b.userId).run();
  await logEvent(env, user, "teacher_assign", b.courseId + "/" + b.userId, null);
  return json({ ok: true });
}

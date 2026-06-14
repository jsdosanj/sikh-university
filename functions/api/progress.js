import { json, getUser } from "./_lib.js";

// GET /api/progress -> all of the user's course progress
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "unauthorized" }, 401);
  const { results } = await env.DB.prepare("SELECT course_id, done, passed_score FROM progress WHERE user_id=?").bind(user.id).all();
  return json({ progress: results || [] });
}

// POST /api/progress { courseId, done:[...], passedScore } -> upsert
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  if (!b.courseId) return json({ error: "courseId required" }, 400);
  const done = JSON.stringify(Array.isArray(b.done) ? b.done : []);
  const score = (typeof b.passedScore === "number") ? b.passedScore : null;
  await env.DB.prepare(
    "INSERT INTO progress (user_id, course_id, done, passed_score, updated_at) VALUES (?,?,?,?,?) " +
    "ON CONFLICT(user_id, course_id) DO UPDATE SET done=excluded.done, passed_score=COALESCE(excluded.passed_score, progress.passed_score), updated_at=excluded.updated_at"
  ).bind(user.id, b.courseId, done, score, Date.now()).run();
  return json({ ok: true });
}

import { json, getUser, logEvent } from "./_lib.js";

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
  // Log a course pass once (the first time the score crosses the 80% bar).
  const prior = await env.DB.prepare("SELECT passed_score FROM progress WHERE user_id=? AND course_id=?").bind(user.id, b.courseId).first();
  const wasPassed = !!(prior && prior.passed_score >= 80);
  // passed_score holds the best quiz score so far: keep NULL until a real score
  // arrives, then keep the maximum (a later worse attempt never lowers a grade).
  await env.DB.prepare(
    "INSERT INTO progress (user_id, course_id, done, passed_score, updated_at) VALUES (?,?,?,?,?) " +
    "ON CONFLICT(user_id, course_id) DO UPDATE SET done=excluded.done, updated_at=excluded.updated_at, " +
    "passed_score=CASE WHEN excluded.passed_score IS NULL THEN progress.passed_score " +
    "WHEN progress.passed_score IS NULL THEN excluded.passed_score " +
    "ELSE MAX(progress.passed_score, excluded.passed_score) END"
  ).bind(user.id, b.courseId, done, score, Date.now()).run();
  if (score != null && score >= 80 && !wasPassed) await logEvent(env, user, "passed_course", b.courseId, "score=" + score);
  return json({ ok: true });
}

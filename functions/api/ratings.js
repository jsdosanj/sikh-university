import { json, getUser } from "./_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS ratings (course_id TEXT NOT NULL, user_id TEXT NOT NULL, stars INTEGER NOT NULL, review TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (course_id, user_id))"
  ).run();
}

// GET /api/ratings?courseId=... -> { avg, count } (public)
export async function onRequestGet({ request, env }) {
  await ensure(env);
  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return json({ error: "courseId required" }, 400);
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) AS n, AVG(stars) AS avg FROM ratings WHERE course_id=?").bind(courseId).first();
    return json({ count: r ? r.n : 0, avg: r && r.avg ? Math.round(r.avg * 10) / 10 : 0 });
  } catch (e) { return json({ count: 0, avg: 0 }); }
}

// POST /api/ratings { courseId, stars, review } -> upsert (sign-in required)
export async function onRequestPost({ request, env }) {
  await ensure(env);
  const user = await getUser(env, request);
  if (!user) return json({ error: "Please sign in to rate." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const courseId = (b.courseId || "").toString().slice(0, 120);
  const stars = Math.max(1, Math.min(5, parseInt(b.stars, 10) || 0));
  const review = (b.review || "").toString().trim().slice(0, 2000);
  if (!courseId || !stars) return json({ error: "courseId and stars required" }, 400);
  await env.DB.prepare(
    "INSERT INTO ratings (course_id, user_id, stars, review, updated_at) VALUES (?,?,?,?,?) " +
    "ON CONFLICT(course_id, user_id) DO UPDATE SET stars=excluded.stars, review=excluded.review, updated_at=excluded.updated_at"
  ).bind(courseId, user.id, stars, review, Date.now()).run();
  return json({ ok: true });
}

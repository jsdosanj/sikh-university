import { json, getUser, newId, logEvent } from "./_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS discussions (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, user_id TEXT, name TEXT, message TEXT NOT NULL, created_at INTEGER NOT NULL)"
  ).run();
}

// GET /api/discussions?courseId=... -> public list (newest first)
export async function onRequestGet({ request, env }) {
  await ensure(env);
  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return json({ error: "courseId required" }, 400);
  try {
    const { results } = await env.DB.prepare(
      "SELECT name, message, created_at FROM discussions WHERE course_id=? ORDER BY created_at DESC LIMIT 200"
    ).bind(courseId).all();
    return json({ messages: results || [] });
  } catch (e) { return json({ messages: [] }); }
}

// POST /api/discussions { courseId, message } -> post (sign-in required)
export async function onRequestPost({ request, env }) {
  await ensure(env);
  const user = await getUser(env, request);
  if (!user) return json({ error: "Please sign in to post." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const courseId = (b.courseId || "").toString().slice(0, 120);
  const message = (b.message || "").trim().slice(0, 2000);
  if (!courseId || !message) return json({ error: "Message required." }, 400);
  const name = (user.name || (user.email || "").split("@")[0] || "Learner").slice(0, 80);
  await env.DB.prepare("INSERT INTO discussions (id, course_id, user_id, name, message, created_at) VALUES (?,?,?,?,?,?)")
    .bind(newId(), courseId, user.id, name, message, Date.now()).run();
  await logEvent(env, user, "discussion_post", courseId, message.slice(0, 80));
  return json({ ok: true });
}

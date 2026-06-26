import { json, getUser, newId, logEvent } from "./_lib.js";

// Create the feedback table on demand so no separate migration is required.
async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS feedback (" +
    "id TEXT PRIMARY KEY, user_id TEXT, email TEXT, course_id TEXT, " +
    "category TEXT, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL)"
  ).run();
}

// POST /api/feedback { message, category?, courseId?, email? } -> store feedback (sign-in optional)
export async function onRequestPost({ request, env }) {
  await ensureTable(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const message = (b.message || "").trim().slice(0, 5000);
  if (!message) return json({ error: "Please enter your feedback." }, 400);
  const category = (b.category || "general").toString().slice(0, 40);
  const courseId = (b.courseId || "").toString().slice(0, 120) || null;

  const user = await getUser(env, request);
  const email = (user && user.email) || ((b.email || "").trim().toLowerCase().slice(0, 200)) || null;

  await env.DB.prepare(
    "INSERT INTO feedback (id, user_id, email, course_id, category, message, status, created_at) VALUES (?,?,?,?,?,?, 'new', ?)"
  ).bind(newId(), user ? user.id : null, email, courseId, category, message, Date.now()).run();
  if (user) await logEvent(env, user, "feedback_submitted", courseId, "category=" + category);
  return json({ ok: true });
}

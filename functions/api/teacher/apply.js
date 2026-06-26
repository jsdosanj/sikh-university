import { json, getUser, newId, logEvent } from "../_lib.js";

// POST /api/teacher/apply { background, courses } -> submit a teacher application (logged-in)
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "Please sign in first." }, 401);
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const background = (body.background || "").trim().slice(0, 4000);
  const courses = (body.courses || "").trim().slice(0, 2000);
  if (!background) return json({ error: "Tell us about your background." }, 400);

  const existing = await env.DB.prepare("SELECT id FROM teacher_applications WHERE user_id=? AND status='pending'").bind(user.id).first();
  if (existing) return json({ error: "You already have a pending application." }, 409);

  await env.DB.prepare("INSERT INTO teacher_applications (id, user_id, email, name, background, courses, status, created_at) VALUES (?,?,?,?,?,?, 'pending', ?)")
    .bind(newId(), user.id, user.email, user.name, background, courses, Date.now()).run();
  await logEvent(env, user, "teacher_application", null, "pending");
  return json({ ok: true });
}

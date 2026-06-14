import { json, getUser } from "../_lib.js";

// GET /api/admin/applications -> list pending teacher applications (admin only)
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  const { results } = await env.DB.prepare(
    "SELECT id, user_id, email, name, background, courses, created_at FROM teacher_applications WHERE status='pending' ORDER BY created_at ASC"
  ).all();
  return json({ applications: results || [] });
}

// POST /api/admin/applications { id, decision: 'approve'|'deny' } (admin only)
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const { id, decision } = body;
  if (!id || (decision !== "approve" && decision !== "deny")) return json({ error: "bad request" }, 400);

  const app = await env.DB.prepare("SELECT user_id, status FROM teacher_applications WHERE id=?").bind(id).first();
  if (!app || app.status !== "pending") return json({ error: "not found" }, 404);

  await env.DB.prepare("UPDATE teacher_applications SET status=? WHERE id=?").bind(decision === "approve" ? "approved" : "denied", id).run();
  if (decision === "approve") {
    await env.DB.prepare("UPDATE users SET role='teacher' WHERE id=? AND role='learner'").bind(app.user_id).run();
  }
  return json({ ok: true });
}

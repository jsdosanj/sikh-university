import { json, getUser, logEvent } from "../_lib.js";

// GET /api/admin/users -> list all users with roles (admin only)
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  const { results } = await env.DB.prepare(
    "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 500"
  ).all();
  return json({ users: results || [] });
}

// POST /api/admin/users { id, role: 'learner'|'teacher' } -> change a user's role (admin only).
// Admin can only move people between learner and teacher. Granting/removing 'admin'
// is intentionally NOT possible here — admin status is controlled solely by the
// ADMIN_EMAILS env var, so there is exactly one admin.
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const { id, role } = body;
  if (!id || (role !== "learner" && role !== "teacher")) return json({ error: "role must be learner or teacher" }, 400);

  const target = await env.DB.prepare("SELECT role FROM users WHERE id=?").bind(id).first();
  if (!target) return json({ error: "not found" }, 404);
  if (target.role === "admin") return json({ error: "admins are managed via ADMIN_EMAILS" }, 403);

  await env.DB.prepare("UPDATE users SET role=? WHERE id=?").bind(role, id).run();
  await logEvent(env, user, "role_change", id, target.role + "→" + role);
  return json({ ok: true });
}

import { json, getUser } from "../_lib.js";

// GET /api/admin/events -> the 200 most recent audit-log events (admin only).
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  try {
    const { results } = await env.DB.prepare(
      "SELECT e.id, e.ts, e.user_id, e.role, e.action, e.target, e.detail, u.email " +
      "FROM events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.ts DESC LIMIT 200"
    ).all();
    return json({ events: results || [] });
  } catch (e) {
    return json({ events: [] });
  }
}

import { json, getUser } from "../_lib.js";

// GET /api/admin/feedback -> list all feedback (admin only)
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
  // Table may not exist yet if no feedback has ever been submitted.
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, email, course_id, category, message, status, created_at FROM feedback ORDER BY created_at DESC LIMIT 500"
    ).all();
    return json({ feedback: results || [] });
  } catch (e) {
    return json({ feedback: [] });
  }
}

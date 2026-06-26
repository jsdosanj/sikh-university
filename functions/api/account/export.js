import { json, getUser } from "../_lib.js";

// GET /api/account/export -> downloads everything we hold for the signed-in user
// as a single JSON file (self-serve data portability).
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "unauthorized" }, 401);

  // Best-effort per table — some tables are created lazily and may not exist yet.
  const all = async (sql, ...args) => {
    try { const r = await env.DB.prepare(sql).bind(...args).all(); return r.results || []; }
    catch (e) { return []; }
  };

  const data = {
    exported_at: Date.now(),
    account: user,
    progress: await all("SELECT course_id, done, passed_score, updated_at FROM progress WHERE user_id=?", user.id),
    enrollments: await all("SELECT kind, target_id, created_at FROM enrollments WHERE user_id=?", user.id),
    certificates: await all("SELECT id, course_id, name, score, issued_at FROM certificates WHERE user_id=?", user.id),
    ratings: await all("SELECT course_id, stars, review, updated_at FROM ratings WHERE user_id=?", user.id),
    discussions: await all("SELECT course_id, message, created_at FROM discussions WHERE user_id=?", user.id),
    feedback: await all("SELECT course_id, category, message, status, created_at FROM feedback WHERE user_id=?", user.id),
    teacher_applications: await all("SELECT background, courses, status, created_at FROM teacher_applications WHERE user_id=?", user.id),
  };

  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="sikh-university-my-data.json"',
    },
  });
}

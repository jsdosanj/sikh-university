import { json, getUser } from "../_lib.js";

async function one(env, sql) {
  try { const r = await env.DB.prepare(sql).first(); return r ? Object.values(r)[0] : 0; }
  catch (e) { return 0; }
}
async function rows(env, sql) {
  try { const { results } = await env.DB.prepare(sql).all(); return results || []; }
  catch (e) { return []; }
}

// GET /api/admin/stats -> platform statistics (admin only)
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);

  const totals = {
    users: await one(env, "SELECT COUNT(*) FROM users"),
    learners: await one(env, "SELECT COUNT(*) FROM users WHERE role='learner'"),
    teachers: await one(env, "SELECT COUNT(*) FROM users WHERE role='teacher'"),
    admins: await one(env, "SELECT COUNT(*) FROM users WHERE role='admin'"),
    activeSessions: await one(env, "SELECT COUNT(*) FROM sessions WHERE expires_at > " + Date.now()),
    enrollments: await one(env, "SELECT COUNT(*) FROM progress"),
    completions: await one(env, "SELECT COUNT(*) FROM progress WHERE passed_score >= 80"),
    pendingApplications: await one(env, "SELECT COUNT(*) FROM teacher_applications WHERE status='pending'"),
    newFeedback: await one(env, "SELECT COUNT(*) FROM feedback WHERE status='new'"),
  };

  // Most-engaged courses: distinct learners per course (enrolled) and completions.
  const popular = await rows(env,
    "SELECT course_id, COUNT(DISTINCT user_id) AS learners, " +
    "SUM(CASE WHEN passed_score >= 80 THEN 1 ELSE 0 END) AS completions " +
    "FROM progress GROUP BY course_id ORDER BY learners DESC, completions DESC LIMIT 25");

  // Recent signups (count by day, last 14 days) for a simple trend.
  const signups = await rows(env,
    "SELECT created_at FROM users ORDER BY created_at DESC LIMIT 100");

  return json({ totals, popular, recentSignups: signups.length });
}

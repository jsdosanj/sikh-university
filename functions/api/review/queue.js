import { json, requireReviewer } from "../_lib.js";

// GET /api/review/queue -> submitted + in_review drafts (reviewer flag or admin).
export async function onRequestGet({ request, env }) {
  const { error } = await requireReviewer(env, request);
  if (error) return error;
  const { results } = await env.DB.prepare(
    "SELECT cd.id, cd.course_id, cd.title, cd.topic, cd.level, cd.status, cd.submitted_at, cd.reviewed_by, " +
    "u.email AS author_email, u.name AS author_name " +
    "FROM course_drafts cd JOIN users u ON u.id=cd.author_id " +
    "WHERE cd.status IN ('submitted','in_review') ORDER BY cd.submitted_at ASC"
  ).all();
  return json({ drafts: results || [] });
}

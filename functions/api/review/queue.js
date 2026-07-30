import { json, requireReviewer } from "../_lib.js";

// GET /api/review/queue -> submitted + in_review drafts (reviewer flag or admin).
// GET /api/review/queue?history=1 -> most recently decided drafts (approved,
// changes_requested, or published), with reviewer identity and notes, for the
// admin Review tab's decision-history list.
export async function onRequestGet({ request, env }) {
  const { error } = await requireReviewer(env, request);
  if (error) return error;

  if (new URL(request.url).searchParams.get("history")) {
    const { results } = await env.DB.prepare(
      "SELECT cd.id, cd.course_id, cd.title, cd.topic, cd.status, cd.review_notes, cd.reviewed_at, " +
      "u.email AS author_email, u.name AS author_name, r.email AS reviewer_email, r.name AS reviewer_name " +
      "FROM course_drafts cd JOIN users u ON u.id=cd.author_id LEFT JOIN users r ON r.id=cd.reviewed_by " +
      "WHERE cd.reviewed_by IS NOT NULL ORDER BY cd.reviewed_at DESC LIMIT 50"
    ).all();
    return json({ drafts: results || [] });
  }

  const { results } = await env.DB.prepare(
    "SELECT cd.id, cd.course_id, cd.title, cd.topic, cd.level, cd.status, cd.submitted_at, cd.reviewed_by, " +
    "u.email AS author_email, u.name AS author_name " +
    "FROM course_drafts cd JOIN users u ON u.id=cd.author_id " +
    "WHERE cd.status IN ('submitted','in_review') ORDER BY cd.submitted_at ASC"
  ).all();
  return json({ drafts: results || [] });
}

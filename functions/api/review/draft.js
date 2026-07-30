import { json, requireReviewer, logEvent } from "../_lib.js";

// GET /api/review/draft?id=... -> full draft content, including quiz answers
// (reviewer flag or admin). Opening a 'submitted' draft claims it (sets
// status='in_review', reviewed_by=this reviewer) — "claiming from the queue" is
// simply opening it; a second reviewer can still view it (read-only insight)
// but does not steal the claim.
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireReviewer(env, request);
  if (error) return error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);

  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(id).first();
  if (!draft) return json({ error: "not found" }, 404);

  if (draft.status === "submitted") {
    const now = Date.now();
    await env.DB.prepare("UPDATE course_drafts SET status='in_review', reviewed_by=?, reviewed_at=? WHERE id=?")
      .bind(user.id, now, id).run();
    await logEvent(env, user, "draft_claimed", id, draft.course_id);
    draft.status = "in_review";
    draft.reviewed_by = user.id;
  }

  const { results: lessons } = await env.DB.prepare("SELECT idx, title, summary, html, media FROM draft_lessons WHERE draft_id=? ORDER BY idx").bind(id).all();
  const { results: quiz } = await env.DB.prepare("SELECT idx, q, options, answer FROM draft_quiz WHERE draft_id=? ORDER BY idx").bind(id).all();
  return json({ draft, lessons: lessons || [], quiz: quiz || [] });
}

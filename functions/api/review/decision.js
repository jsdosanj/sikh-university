import { json, requireReviewer, logEvent, parseBody } from "../_lib.js";

// Sikhi-doctrine topics need a scholar-verified reviewer (or admin) to decide —
// "accuracy is sacred" per CLAUDE.md. Modern Skills doesn't carry that stakes
// and any reviewer-flagged person (or admin) may decide it.
async function canDecide(env, user, topic) {
  if (user.role === "admin") return true;
  if (topic === "modern-skills") return true; // requireReviewer already gated on the flag
  const profile = await env.DB.prepare("SELECT verification_level FROM teacher_profiles WHERE user_id=?").bind(user.id).first();
  return !!profile && profile.verification_level === "scholar";
}

// POST /api/review/decision { id, decision: 'approve'|'changes_requested', notes }
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireReviewer(env, request);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.id || (b.decision !== "approve" && b.decision !== "changes_requested")) {
    return json({ error: "id and a valid decision required" }, 400);
  }

  const draft = await env.DB.prepare("SELECT topic, course_id, status FROM course_drafts WHERE id=?").bind(b.id).first();
  if (!draft) return json({ error: "not found" }, 404);
  if (draft.status !== "in_review" && draft.status !== "submitted") return json({ error: `cannot decide a draft with status '${draft.status}'` }, 400);
  if (!(await canDecide(env, user, draft.topic))) {
    return json({ error: "This Sikhi-topic draft requires a scholar-verified reviewer or admin." }, 403);
  }

  const notes = String(b.notes || "").trim().slice(0, 4000);
  const now = Date.now();
  const status = b.decision === "approve" ? "approved" : "changes_requested";
  await env.DB.prepare(
    "UPDATE course_drafts SET status=?, review_notes=?, reviewed_by=?, reviewed_at=? WHERE id=?"
  ).bind(status, notes, user.id, now, b.id).run();
  await logEvent(env, user, "draft_" + status, b.id, draft.course_id);
  return json({ ok: true });
}

import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

// POST /api/admin/drafts-mark-published { draftId } -> admin marks a draft
// published after confirming its import PR has merged (manual step per the
// import-drafts.yml workflow_dispatch design — see docs/OPERATIONS.md).
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.draftId) return json({ error: "draftId required" }, 400);

  const draft = await env.DB.prepare("SELECT status, course_id FROM course_drafts WHERE id=?").bind(b.draftId).first();
  if (!draft) return json({ error: "not found" }, 404);
  if (draft.status !== "approved") return json({ error: `cannot mark published from status '${draft.status}'` }, 400);

  await env.DB.prepare("UPDATE course_drafts SET status='published', updated_at=? WHERE id=?").bind(Date.now(), b.draftId).run();
  await logEvent(env, user, "draft_marked_published", b.draftId, draft.course_id);
  return json({ ok: true });
}

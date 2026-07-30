import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

// POST /api/admin/drafts-mark-published { draftId } -> admin marks a draft
// published after confirming its import PR has merged (manual step per the
// import-drafts.yml workflow_dispatch design — see docs/OPERATIONS.md).
//
// This is also the moment any lecture media attached to the draft's lessons
// gets re-tagged from context='draft:<id>' (owner/course-teacher/reviewer only)
// to context='course:<courseId>' (functions/api/_asset-access.js's one branch
// that grants access to any enrolled student) — not before, since the course
// isn't actually live in the catalogue until this step confirms the import PR
// has merged. Re-tagging only touches rows still on the draft's own context
// string, so re-running this is harmless.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.draftId) return json({ error: "draftId required" }, 400);

  const draft = await env.DB.prepare("SELECT status, course_id, author_id FROM course_drafts WHERE id=?").bind(b.draftId).first();
  if (!draft) return json({ error: "not found" }, 404);
  if (draft.status !== "approved") return json({ error: `cannot mark published from status '${draft.status}'` }, 400);

  // The author becomes this course's teacher of record (gradebook/assignments
  // scope by course_teachers) — without this they'd have authored a course
  // they can't see their own students' progress on.
  await env.DB.prepare(
    "INSERT OR IGNORE INTO course_teachers (course_id, user_id, assigned_at) VALUES (?,?,?)"
  ).bind(draft.course_id, draft.author_id, Date.now()).run();

  const oldContext = `draft:${b.draftId}`;
  const newContext = `course:${draft.course_id}`;
  const { results: lessons } = await env.DB.prepare("SELECT media FROM draft_lessons WHERE draft_id=?").bind(b.draftId).all();
  const mediaKeys = new Set();
  for (const ls of lessons || []) {
    try { (JSON.parse(ls.media || "[]")).forEach((m) => m.key && mediaKeys.add(m.key)); } catch (e) {}
  }
  for (const key of mediaKeys) {
    await env.DB.prepare("UPDATE media_objects SET context=? WHERE key=? AND context=?").bind(newContext, key, oldContext).run();
  }

  await env.DB.prepare("UPDATE course_drafts SET status='published', updated_at=? WHERE id=?").bind(Date.now(), b.draftId).run();
  await logEvent(env, user, "draft_marked_published", b.draftId, draft.course_id + (mediaKeys.size ? ` (${mediaKeys.size} media re-tagged)` : ""));
  return json({ ok: true });
}

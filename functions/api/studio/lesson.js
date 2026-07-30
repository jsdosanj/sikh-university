import { json, requireMfa } from "../_lib.js";
import { ensure, isDraftOwner, EDITABLE_STATUSES } from "./_shared.js";
import { sanitizeLessonHtml } from "../_sanitize-html.js";

// POST /api/studio/lesson { draftId, idx, title, summary?, html, media? } ->
// per-lesson autosave (upsert on the (draft_id, idx) primary key). html is
// sanitized server-side before storage — the client-side preview is not trusted.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  if (!b.draftId || !Number.isInteger(b.idx) || b.idx < 0) return json({ error: "draftId and a non-negative integer idx required" }, 400);

  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(b.draftId).first();
  if (!draft || !isDraftOwner(draft, user)) return json({ error: "not found" }, 404);
  if (!EDITABLE_STATUSES.has(draft.status)) return json({ error: `cannot edit a draft with status '${draft.status}'` }, 400);

  const title = String(b.title || "").trim().slice(0, 200);
  const summary = b.summary != null ? String(b.summary).trim().slice(0, 500) : null;
  const html = sanitizeLessonHtml(String(b.html || ""));
  if (!title) return json({ error: "lesson title required" }, 400);
  if (!html.trim()) return json({ error: "lesson content required" }, 400);
  const media = Array.isArray(b.media) ? JSON.stringify(b.media.slice(0, 20)) : null;

  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO draft_lessons (draft_id, idx, title, summary, html, media, updated_at) VALUES (?,?,?,?,?,?,?) " +
    "ON CONFLICT(draft_id, idx) DO UPDATE SET title=excluded.title, summary=excluded.summary, html=excluded.html, media=excluded.media, updated_at=excluded.updated_at"
  ).bind(b.draftId, b.idx, title, summary, html, media, now).run();
  await env.DB.prepare("UPDATE course_drafts SET updated_at=? WHERE id=?").bind(now, b.draftId).run();
  return json({ ok: true });
}

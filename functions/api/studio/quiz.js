import { json, requireMfa } from "../_lib.js";
import { ensure, isDraftOwner, EDITABLE_STATUSES } from "./_shared.js";

// POST /api/studio/quiz { draftId, questions: [{q, options:[], answer}] } ->
// replaces the whole question set for this draft (>=2 options, 0<=answer<len).
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  if (!b.draftId || !Array.isArray(b.questions)) return json({ error: "draftId and questions[] required" }, 400);

  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(b.draftId).first();
  if (!draft || !isDraftOwner(draft, user)) return json({ error: "not found" }, 404);
  if (!EDITABLE_STATUSES.has(draft.status)) return json({ error: `cannot edit a draft with status '${draft.status}'` }, 400);

  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i];
    const options = Array.isArray(q.options) ? q.options : [];
    if (!q.q || !String(q.q).trim()) return json({ error: `question ${i + 1}: text required` }, 400);
    if (options.length < 2) return json({ error: `question ${i + 1}: needs at least 2 options` }, 400);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) return json({ error: `question ${i + 1}: answer index out of range` }, 400);
  }

  await env.DB.prepare("DELETE FROM draft_quiz WHERE draft_id=?").bind(b.draftId).run();
  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i];
    await env.DB.prepare("INSERT INTO draft_quiz (draft_id, idx, q, options, answer) VALUES (?,?,?,?,?)")
      .bind(b.draftId, i, String(q.q).trim().slice(0, 500), JSON.stringify(q.options.map((o) => String(o).slice(0, 300))), q.answer).run();
  }
  await env.DB.prepare("UPDATE course_drafts SET updated_at=? WHERE id=?").bind(Date.now(), b.draftId).run();
  return json({ ok: true });
}

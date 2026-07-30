import { json, requireMfa, logEvent } from "../_lib.js";
import { ensure, isDraftOwner, EDITABLE_STATUSES } from "./_shared.js";

async function loadFull(env, id) {
  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(id).first();
  if (!draft) return null;
  const { results: lessons } = await env.DB.prepare("SELECT idx, title, summary, html, media FROM draft_lessons WHERE draft_id=? ORDER BY idx").bind(id).all();
  const { results: quiz } = await env.DB.prepare("SELECT idx, q, options, answer FROM draft_quiz WHERE draft_id=? ORDER BY idx").bind(id).all();
  return { draft, lessons: lessons || [], quiz: quiz || [] };
}

// GET /api/studio/draft?id=... -> full draft content (author/admin only; includes
// quiz answers — the author is editing their own quiz, this isn't student-facing).
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  const full = await loadFull(env, id);
  if (!full || !isDraftOwner(full.draft, user)) return json({ error: "not found" }, 404);
  return json(full);
}

// POST /api/studio/draft { id, action } ->
//   action:'update_meta' { title?, topic?, level?, summary?, outcomes?, terms?, references?, aiAssisted? }
//   action:'reorder_lessons' { order: [oldIdx,...] } -> reindex to match
//   action:'delete' -> remove the draft and its lessons/quiz
// Edits only allowed while status is draft or changes_requested.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  if (!b.id) return json({ error: "id required" }, 400);

  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(b.id).first();
  if (!draft || !isDraftOwner(draft, user)) return json({ error: "not found" }, 404);

  if (b.action === "delete") {
    await env.DB.prepare("DELETE FROM draft_lessons WHERE draft_id=?").bind(b.id).run();
    await env.DB.prepare("DELETE FROM draft_quiz WHERE draft_id=?").bind(b.id).run();
    await env.DB.prepare("DELETE FROM course_drafts WHERE id=?").bind(b.id).run();
    await logEvent(env, user, "draft_deleted", b.id, null);
    return json({ ok: true });
  }

  if (!EDITABLE_STATUSES.has(draft.status)) return json({ error: `cannot edit a draft with status '${draft.status}'` }, 400);
  const now = Date.now();

  if (b.action === "reorder_lessons") {
    const order = Array.isArray(b.order) ? b.order : null;
    if (!order) return json({ error: "order array required" }, 400);
    const { results: rows } = await env.DB.prepare("SELECT idx, title, summary, html, media FROM draft_lessons WHERE draft_id=?").bind(b.id).all();
    const byIdx = Object.fromEntries((rows || []).map((r) => [r.idx, r]));
    await env.DB.prepare("DELETE FROM draft_lessons WHERE draft_id=?").bind(b.id).run();
    for (let newIdx = 0; newIdx < order.length; newIdx++) {
      const row = byIdx[order[newIdx]];
      if (!row) continue;
      await env.DB.prepare(
        "INSERT INTO draft_lessons (draft_id, idx, title, summary, html, media, updated_at) VALUES (?,?,?,?,?,?,?)"
      ).bind(b.id, newIdx, row.title, row.summary, row.html, row.media, now).run();
    }
    await env.DB.prepare("UPDATE course_drafts SET updated_at=? WHERE id=?").bind(now, b.id).run();
    return json({ ok: true });
  }

  // update_meta (default action when neither delete nor reorder_lessons)
  const title = b.title != null ? String(b.title).trim().slice(0, 200) : draft.title;
  const topic = b.topic != null ? String(b.topic).trim().slice(0, 60) : draft.topic;
  const level = b.level != null ? parseInt(b.level, 10) : draft.level;
  let meta = {};
  try { meta = JSON.parse(draft.meta); } catch (e) {}
  if (b.summary != null) meta.summary = String(b.summary).trim().slice(0, 1000);
  if (b.outcomes != null) meta.outcomes = Array.isArray(b.outcomes) ? b.outcomes.slice(0, 20).map((s) => String(s).slice(0, 300)) : meta.outcomes;
  if (b.terms != null) meta.terms = Array.isArray(b.terms) ? b.terms.slice(0, 40) : meta.terms;
  if (b.references != null) meta.references = Array.isArray(b.references) ? b.references.slice(0, 40).map((s) => String(s).slice(0, 500)) : meta.references;
  if (b.aiAssisted != null) meta.aiAssisted = !!b.aiAssisted;

  await env.DB.prepare(
    "UPDATE course_drafts SET title=?, topic=?, level=?, meta=?, updated_at=? WHERE id=?"
  ).bind(title, topic, level, JSON.stringify(meta), now, b.id).run();
  return json({ ok: true });
}

import { json, requireMfa } from "../_lib.js";
import { ensure, isDraftOwner } from "./_shared.js";
import { validateDraft } from "../_draft-validate.js";

// Topics are a tiny top-level array in the slim build-time index (not the 45MB
// courses.json) — reading it via the ASSETS binding avoids ever parsing the
// full catalogue inside a Worker request.
async function loadTopicIds(env, request) {
  try {
    const resp = await env.ASSETS.fetch(new Request(new URL("/data/index.json", request.url)));
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.topics || []).map((t) => t.id);
  } catch (e) { return null; }
}

// GET /api/studio/validate?id=... -> the full studio validator's error list
// (empty array = ready to submit).
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);

  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(id).first();
  if (!draft || !isDraftOwner(draft, user)) return json({ error: "not found" }, 404);
  const { results: lessons } = await env.DB.prepare("SELECT idx, title, html FROM draft_lessons WHERE draft_id=? ORDER BY idx").bind(id).all();
  const { results: quiz } = await env.DB.prepare("SELECT idx, q, options, answer FROM draft_quiz WHERE draft_id=? ORDER BY idx").bind(id).all();

  const topicIds = await loadTopicIds(env, request);
  const errors = validateDraft({ draft, lessons: lessons || [], quiz: quiz || [] }, topicIds);
  return json({ errors, valid: errors.length === 0 });
}

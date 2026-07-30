import { json, requireMfa, logEvent } from "../_lib.js";
import { ensure, isDraftOwner, EDITABLE_STATUSES } from "./_shared.js";
import { validateDraft } from "../_draft-validate.js";

async function loadTopicIds(env, request) {
  try {
    const resp = await env.ASSETS.fetch(new Request(new URL("/data/index.json", request.url)));
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.topics || []).map((t) => t.id);
  } catch (e) { return null; }
}

// POST /api/studio/submit { id } -> moves draft -> submitted. Every precondition
// is enforced server-side (never trust the studio UI alone):
//  - author is at least identity-verified (docs/CURRICULUM.md scholar onboarding gate)
//  - the draft passes the full validator
//  - the governance "AI-assisted?" declaration is present (meta.aiAssisted is a real boolean)
//  - every media reference in every lesson is rights-attested AND admin-approved
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  if (!b.id) return json({ error: "id required" }, 400);

  const draft = await env.DB.prepare("SELECT * FROM course_drafts WHERE id=?").bind(b.id).first();
  if (!draft || !isDraftOwner(draft, user)) return json({ error: "not found" }, 404);
  if (!EDITABLE_STATUSES.has(draft.status)) return json({ error: `cannot submit a draft with status '${draft.status}'` }, 400);

  if (user.role !== "admin") {
    const profile = await env.DB.prepare("SELECT verification_level FROM teacher_profiles WHERE user_id=?").bind(user.id).first();
    const level = profile && profile.verification_level;
    if (level !== "identity" && level !== "scholar") {
      return json({ error: "Your teacher profile must be identity-verified before submitting a course. Ask an admin to verify you." }, 403);
    }
  }

  const { results: lessons } = await env.DB.prepare("SELECT idx, title, html, media FROM draft_lessons WHERE draft_id=? ORDER BY idx").bind(b.id).all();
  const { results: quiz } = await env.DB.prepare("SELECT idx, q, options, answer FROM draft_quiz WHERE draft_id=? ORDER BY idx").bind(b.id).all();

  const topicIds = await loadTopicIds(env, request);
  const errors = validateDraft({ draft, lessons: lessons || [], quiz: quiz || [] }, topicIds);

  let meta = {};
  try { meta = JSON.parse(draft.meta); } catch (e) {}
  if (typeof meta.aiAssisted !== "boolean") errors.push("the \"Created with AI assistance?\" declaration is required before submission");

  const mediaKeys = [];
  for (const ls of lessons || []) {
    try { (JSON.parse(ls.media || "[]")).forEach((m) => m.key && mediaKeys.push(m.key)); } catch (e) {}
  }
  for (const key of mediaKeys) {
    const media = await env.DB.prepare("SELECT status, rights FROM media_objects WHERE key=?").bind(key).first();
    if (!media) { errors.push(`lesson media '${key}' no longer exists`); continue; }
    if (media.status !== "approved") errors.push(`lesson media '${key}' is not yet approved by an admin`);
    if (!media.rights) errors.push(`lesson media '${key}' is missing a rights attestation`);
  }

  if (errors.length) return json({ error: "This draft is not ready to submit.", errors }, 400);

  const now = Date.now();
  await env.DB.prepare("UPDATE course_drafts SET status='submitted', submitted_at=?, updated_at=? WHERE id=?").bind(now, now, b.id).run();
  await logEvent(env, user, "draft_submitted", b.id, draft.course_id);
  return json({ ok: true });
}

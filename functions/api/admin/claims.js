import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

// GET /api/admin/claims -> pending professor-string claims, with the claimant's
// email/name (the admin cross-references the claim statement against PROF_BIOS
// client-side, since that data lives in the Astro build, not the Worker).
export async function onRequestGet({ request, env }) {
  const { error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { results } = await env.DB.prepare(
    "SELECT pc.id, pc.user_id, pc.professor_name, pc.statement, pc.status, pc.created_at, u.email, u.name " +
    "FROM professor_claims pc JOIN users u ON u.id=pc.user_id WHERE pc.status='pending' ORDER BY pc.created_at ASC"
  ).all();
  return json({ claims: results || [] });
}

// POST /api/admin/claims { id, decision: 'approve'|'deny' } -> decide a claim.
// Approving binds teacher_profiles.claimed_professor to the exact professor
// string — enforced as at most one approved claim per professor string.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.id || (b.decision !== "approve" && b.decision !== "deny")) return json({ error: "id and decision required" }, 400);

  const claim = await env.DB.prepare("SELECT user_id, professor_name, status FROM professor_claims WHERE id=?").bind(b.id).first();
  if (!claim) return json({ error: "not found" }, 404);
  if (claim.status !== "pending") return json({ error: "already decided" }, 409);

  if (b.decision === "approve") {
    const taken = await env.DB.prepare(
      "SELECT user_id FROM teacher_profiles WHERE claimed_professor=? AND user_id != ?"
    ).bind(claim.professor_name, claim.user_id).first();
    if (taken) return json({ error: "That professor name is already claimed by another teacher." }, 409);

    const profile = await env.DB.prepare("SELECT user_id FROM teacher_profiles WHERE user_id=?").bind(claim.user_id).first();
    if (!profile) return json({ error: "The teacher must create a profile before claiming a professor name." }, 400);

    await env.DB.prepare("UPDATE teacher_profiles SET claimed_professor=?, updated_at=? WHERE user_id=?")
      .bind(claim.professor_name, Date.now(), claim.user_id).run();
  }

  await env.DB.prepare("UPDATE professor_claims SET status=?, decided_by=?, decided_at=? WHERE id=?")
    .bind(b.decision === "approve" ? "approved" : "denied", user.id, Date.now(), b.id).run();
  await logEvent(env, user, "professor_claim_" + b.decision, claim.professor_name, claim.user_id);
  return json({ ok: true });
}

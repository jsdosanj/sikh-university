import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

const VERIFICATION_LEVELS = new Set(["none", "identity", "scholar"]);

// GET /api/admin/teacher-profiles -> the publish-approval queue (profiles that
// have requested publish but aren't live yet) + every profile (for the
// verification-level setter / unpublish / recent-edits views).
export async function onRequestGet({ request, env }) {
  const { error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;

  const { results: pending } = await env.DB.prepare(
    "SELECT tp.user_id, tp.slug, tp.display_name, tp.bio, tp.verification_level, tp.publish_requested_at, u.email " +
    "FROM teacher_profiles tp JOIN users u ON u.id=tp.user_id " +
    "WHERE tp.is_public=0 AND tp.publish_requested_at IS NOT NULL ORDER BY tp.publish_requested_at ASC"
  ).all();
  const { results: all } = await env.DB.prepare(
    "SELECT tp.user_id, tp.slug, tp.display_name, tp.verification_level, tp.is_public, tp.claimed_professor, tp.updated_at, u.email " +
    "FROM teacher_profiles tp JOIN users u ON u.id=tp.user_id ORDER BY tp.updated_at DESC LIMIT 500"
  ).all();
  return json({ pending: pending || [], all: all || [] });
}

// POST /api/admin/teacher-profiles { userId, action } where action is:
//   'approve_publish'          -> first-publish gate: sets approved_at, is_public=1
//   'unpublish'                -> is_public=0 (later edits stay live-but-audited per plan T7)
//   { action:'set_verification', level, note } -> none|identity|scholar
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.userId) return json({ error: "userId required" }, 400);

  const row = await env.DB.prepare("SELECT user_id, approved_at FROM teacher_profiles WHERE user_id=?").bind(b.userId).first();
  if (!row) return json({ error: "not found" }, 404);
  const now = Date.now();

  if (b.action === "approve_publish") {
    await env.DB.prepare(
      "UPDATE teacher_profiles SET is_public=1, approved_at=COALESCE(approved_at, ?), approved_by=? WHERE user_id=?"
    ).bind(now, user.id, b.userId).run();
    await logEvent(env, user, "teacher_profile_published", b.userId, null);
    return json({ ok: true });
  }
  if (b.action === "unpublish") {
    await env.DB.prepare("UPDATE teacher_profiles SET is_public=0 WHERE user_id=?").bind(b.userId).run();
    await logEvent(env, user, "teacher_profile_unpublished", b.userId, null);
    return json({ ok: true });
  }
  if (b.action === "set_verification") {
    if (!VERIFICATION_LEVELS.has(b.level)) return json({ error: "level must be none, identity, or scholar" }, 400);
    const note = String(b.note || "").trim().slice(0, 500);
    const prev = await env.DB.prepare("SELECT verification_level FROM teacher_profiles WHERE user_id=?").bind(b.userId).first();
    await env.DB.prepare(
      "UPDATE teacher_profiles SET verification_level=?, verified_by=?, verified_at=?, verification_note=? WHERE user_id=?"
    ).bind(b.level, user.id, now, note, b.userId).run();
    await logEvent(env, user, "verification_set", b.userId, `${prev ? prev.verification_level : "none"}->${b.level}; note=${note}`);
    return json({ ok: true });
  }
  return json({ error: "unknown action" }, 400);
}

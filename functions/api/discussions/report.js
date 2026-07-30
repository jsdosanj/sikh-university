import { json, requireUser, logEvent, parseBody } from "../_lib.js";

// POST /api/discussions/report { id, reason? } -> any signed-in user. Upserts
// so a second report from the same user just refreshes reason/timestamp
// instead of erroring (PRIMARY KEY (message_id, user_id) is one report per pair).
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireUser(env, request);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.id) return json({ error: "id required" }, 400);

  const msg = await env.DB.prepare("SELECT id FROM discussions WHERE id=?").bind(b.id).first();
  if (!msg) return json({ error: "not found" }, 404);

  const reason = String(b.reason || "").trim().slice(0, 500);
  await env.DB.prepare(
    "INSERT INTO discussion_reports (message_id, user_id, reason, created_at, status) VALUES (?,?,?,?,'open') " +
    "ON CONFLICT(message_id, user_id) DO UPDATE SET reason=excluded.reason, created_at=excluded.created_at, status='open'"
  ).bind(b.id, user.id, reason, Date.now()).run();
  await logEvent(env, user, "discussion_report", b.id, reason);
  return json({ ok: true });
}

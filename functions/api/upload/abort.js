import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

// POST /api/upload/abort { key, uploadId } -> abort an in-flight multipart
// upload and drop its pending registry row.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.key || !b.uploadId) return json({ error: "key and uploadId required" }, 400);
  if (!b.key.startsWith(`uploads/${user.id}/`)) return json({ error: "forbidden" }, 403);

  const row = await env.DB.prepare(
    "SELECT owner_id FROM media_objects WHERE key=? AND upload_id=? AND status='pending'"
  ).bind(b.key, b.uploadId).first();
  if (!row || row.owner_id !== user.id) return json({ error: "no matching pending upload" }, 404);

  const mpu = env.MEDIA.resumeMultipartUpload(b.key, b.uploadId);
  await mpu.abort();
  await env.DB.prepare("DELETE FROM media_objects WHERE key=?").bind(b.key).run();
  await logEvent(env, user, "media_upload_abort", b.key, null);

  return json({ ok: true });
}

import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

// POST /api/upload/complete { key, uploadId, parts: [{partNumber, etag}] } ->
// finalizes the multipart upload; records the actual final size (R2's
// authoritative figure, not the client's declared estimate from /create).
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.key || !b.uploadId || !Array.isArray(b.parts) || !b.parts.length) {
    return json({ error: "key, uploadId, and parts required" }, 400);
  }
  if (!b.key.startsWith(`uploads/${user.id}/`)) return json({ error: "forbidden" }, 403);

  const row = await env.DB.prepare(
    "SELECT owner_id FROM media_objects WHERE key=? AND upload_id=? AND status='pending'"
  ).bind(b.key, b.uploadId).first();
  if (!row || row.owner_id !== user.id) return json({ error: "no matching pending upload" }, 404);

  const mpu = env.MEDIA.resumeMultipartUpload(b.key, b.uploadId);
  const object = await mpu.complete(b.parts.map((p) => ({ partNumber: p.partNumber, etag: p.etag })));

  await env.DB.prepare("UPDATE media_objects SET status='uploaded', size=?, upload_id=NULL WHERE key=?")
    .bind(object.size, b.key).run();
  await logEvent(env, user, "media_upload_complete", b.key, String(object.size));

  return json({ key: b.key, size: object.size });
}

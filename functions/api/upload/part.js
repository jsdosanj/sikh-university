import { json, requireMfa } from "../_lib.js";

// PUT /api/upload/part?key=&uploadId=&partNumber= — streams one part straight
// through to R2 (request.body is passed directly, never buffered) via
// resumeMultipartUpload/uploadPart. Requires the caller to own a matching
// pending registry row for this exact key+uploadId (prevents uploading parts
// into someone else's in-flight multipart upload).
export async function onRequestPut({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;

  const p = new URL(request.url).searchParams;
  const key = p.get("key");
  const uploadId = p.get("uploadId");
  const partNumber = parseInt(p.get("partNumber") || "", 10);
  if (!key || !uploadId || !Number.isFinite(partNumber) || partNumber < 1) {
    return json({ error: "key, uploadId, and partNumber required" }, 400);
  }
  if (!key.startsWith(`uploads/${user.id}/`)) return json({ error: "forbidden" }, 403);

  const row = await env.DB.prepare(
    "SELECT owner_id FROM media_objects WHERE key=? AND upload_id=? AND status='pending'"
  ).bind(key, uploadId).first();
  if (!row || row.owner_id !== user.id) return json({ error: "no matching pending upload" }, 404);

  const mpu = env.MEDIA.resumeMultipartUpload(key, uploadId);
  const uploadedPart = await mpu.uploadPart(partNumber, request.body);
  return json({ etag: uploadedPart.etag, partNumber });
}

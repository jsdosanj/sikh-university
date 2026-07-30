import { json, requireMfa, newId, parseBody, logEvent } from "../_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS media_objects (key TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, " +
    "context TEXT, size INTEGER NOT NULL, content_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'uploaded', " +
    "rights TEXT, rights_note TEXT, upload_id TEXT, created_at INTEGER NOT NULL, reviewed_by TEXT, reviewed_at INTEGER)"
  ).run();
}

const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm" };
const MAX_VIDEO_SIZE = 1 * 1024 ** 3; // 1 GB
const QUOTA_BYTES = { teacher: 5 * 1024 ** 3, admin: 5 * 1024 ** 3 };
const PART_SIZE = 25 * 1024 * 1024; // 25 MB — within the 100 MB request-body cap with headroom

// POST /api/upload/create { context, filename, size, contentType, rights, rightsNote }
// -> begins an R2 multipart upload for a lecture video. Parts are uploaded via
// /api/upload/part, finalized via /api/upload/complete.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  if (b.kind !== "video") return json({ error: "only kind:'video' uses the multipart flow" }, 400);
  const ext = VIDEO_TYPES[b.contentType];
  if (!ext) return json({ error: "contentType must be video/mp4 or video/webm" }, 400);
  const size = Number(b.size);
  if (!Number.isFinite(size) || size <= 0) return json({ error: "size required" }, 400);
  if (size > MAX_VIDEO_SIZE) return json({ error: "video exceeds the 1 GB limit" }, 413);
  if (!["own", "open-license", "permission"].includes(b.rights)) {
    return json({ error: "rights must be own, open-license, or permission" }, 400);
  }
  const rightsNote = String(b.rightsNote || "").slice(0, 500);
  const context = String(b.context || "").slice(0, 100);

  const quota = QUOTA_BYTES[user.role] ?? 0;
  const usedRow = await env.DB.prepare("SELECT SUM(size) AS total FROM media_objects WHERE owner_id=? AND status != 'rejected'").bind(user.id).first();
  const used = (usedRow && usedRow.total) || 0;
  if (used + size > quota) return json({ error: "storage quota exceeded", usedBytes: used, quotaBytes: quota }, 413);

  const key = `uploads/${user.id}/${context || "misc"}/${newId()}.${ext}`;
  const mpu = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: b.contentType } });

  await env.DB.prepare(
    "INSERT INTO media_objects (key, owner_id, kind, context, size, content_type, status, rights, rights_note, upload_id, created_at) " +
    "VALUES (?,?, 'video', ?, ?, ?, 'pending', ?, ?, ?, ?)"
  ).bind(key, user.id, context || null, size, b.contentType, b.rights, rightsNote, mpu.uploadId, Date.now()).run();
  await logEvent(env, user, "media_upload_create", key, "video");

  return json({ key, uploadId: mpu.uploadId, partSize: PART_SIZE });
}

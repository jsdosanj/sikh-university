import { json, requireUser, requireMfa, newId, logEvent } from "./_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS media_objects (key TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, " +
    "context TEXT, size INTEGER NOT NULL, content_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'uploaded', " +
    "rights TEXT, rights_note TEXT, upload_id TEXT, created_at INTEGER NOT NULL, reviewed_by TEXT, reviewed_at INTEGER)"
  ).run();
}

// Per-owner-role storage quota (SUM(size) across all their non-rejected objects).
const QUOTA_BYTES = { teacher: 5 * 1024 ** 3, admin: 5 * 1024 ** 3, learner: 200 * 1024 ** 2 };

const KIND_RULES = {
  photo: { maxSize: 2 * 1024 * 1024, contentTypes: { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47], "image/webp": null } },
  pdf: { maxSize: 20 * 1024 * 1024, contentTypes: { "application/pdf": [0x25, 0x50, 0x44, 0x46] } },
  submission: { maxSize: 10 * 1024 * 1024, contentTypes: { "application/pdf": [0x25, 0x50, 0x44, 0x46] } },
};
const EXT_FOR_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

// WEBP has no simple fixed 4-byte magic like the others: bytes 0-3 are "RIFF",
// bytes 8-11 are "WEBP" (with a 4-byte little-endian size field in between).
function sniffMagic(bytes, contentType, expectedPrefix) {
  if (contentType === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (!expectedPrefix) return true;
  return expectedPrefix.every((b, i) => bytes[i] === b);
}

async function currentUsage(env, ownerId) {
  const row = await env.DB.prepare("SELECT SUM(size) AS total FROM media_objects WHERE owner_id=? AND status != 'rejected'").bind(ownerId).first();
  return (row && row.total) || 0;
}

// POST /api/upload — small single-shot uploads (photo/pdf/submission). The raw
// file bytes are the request body; metadata rides in headers (not JSON, since
// the body is the file itself): x-upload-kind, x-upload-context, x-upload-rights,
// x-upload-rights-note (rights required for kind=pdf; not for photo/submission).
export async function onRequestPost({ request, env }) {
  const kind = request.headers.get("x-upload-kind");
  const context = (request.headers.get("x-upload-context") || "").slice(0, 100);
  const rules = KIND_RULES[kind];
  if (!rules) return json({ error: "x-upload-kind must be photo, pdf, or submission" }, 400);

  const auth = kind === "submission" ? await requireUser(env, request) : await requireMfa(env, request, ["teacher", "admin"]);
  if (auth.error) return auth.error;
  const user = auth.user;
  await ensure(env);

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!(contentType in rules.contentTypes)) {
    return json({ error: `content-type must be one of: ${Object.keys(rules.contentTypes).join(", ")}` }, 400);
  }

  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.byteLength === 0) return json({ error: "empty upload" }, 400);
  if (buf.byteLength > rules.maxSize) return json({ error: `file exceeds the ${(rules.maxSize / (1024 * 1024)).toFixed(0)} MB limit for ${kind}` }, 413);
  if (!sniffMagic(buf, contentType, rules.contentTypes[contentType])) {
    return json({ error: "file content does not match the declared type" }, 400);
  }

  let rights = null, rightsNote = null;
  if (kind === "pdf") {
    rights = request.headers.get("x-upload-rights");
    rightsNote = (request.headers.get("x-upload-rights-note") || "").slice(0, 500);
    if (!["own", "open-license", "permission"].includes(rights)) {
      return json({ error: "x-upload-rights must be own, open-license, or permission for pdf uploads" }, 400);
    }
  }

  const quota = QUOTA_BYTES[user.role] ?? QUOTA_BYTES.learner;
  const used = await currentUsage(env, user.id);
  if (used + buf.byteLength > quota) return json({ error: "storage quota exceeded", usedBytes: used, quotaBytes: quota }, 413);

  const ext = EXT_FOR_TYPE[contentType];
  const key = `uploads/${user.id}/${context || "misc"}/${newId()}.${ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType } });

  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO media_objects (key, owner_id, kind, context, size, content_type, status, rights, rights_note, created_at) " +
    "VALUES (?,?,?,?,?,?, 'uploaded', ?, ?, ?)"
  ).bind(key, user.id, kind, context || null, buf.byteLength, contentType, rights, rightsNote, now).run();
  await logEvent(env, user, "media_uploaded", key, kind);

  return json({ key, size: buf.byteLength, contentType });
}

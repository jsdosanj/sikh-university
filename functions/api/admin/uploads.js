import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

const EXT_FOR_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

// GET /api/admin/uploads -> moderation queue (uploaded-but-undecided) + recent
// decisions for context. Inline preview is via /api/asset?key= (admins pass
// the access matrix automatically).
export async function onRequestGet({ request, env }) {
  const { error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { results: pending } = await env.DB.prepare(
    "SELECT mo.key, mo.owner_id, mo.kind, mo.context, mo.size, mo.content_type, mo.rights, mo.rights_note, mo.created_at, u.email " +
    "FROM media_objects mo JOIN users u ON u.id=mo.owner_id WHERE mo.status='uploaded' ORDER BY mo.created_at ASC"
  ).all();
  const { results: recent } = await env.DB.prepare(
    "SELECT mo.key, mo.owner_id, mo.kind, mo.status, mo.reviewed_by, mo.reviewed_at, u.email " +
    "FROM media_objects mo JOIN users u ON u.id=mo.owner_id WHERE mo.status IN ('approved','rejected') " +
    "ORDER BY mo.reviewed_at DESC LIMIT 50"
  ).all();
  return json({ pending: pending || [], recent: recent || [] });
}

// POST /api/admin/uploads { key, action: 'approve'|'reject' }
// approve: photo+profile context copies to the public media/teachers/ prefix and
//   sets teacher_profiles.photo_key; everything else (pdf/video course material)
//   just flips status (served only via /api/asset, never copied to a public prefix).
// reject: deletes both the R2 object and the registry row.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  if (!b.key || (b.action !== "approve" && b.action !== "reject")) return json({ error: "key and action required" }, 400);

  const media = await env.DB.prepare("SELECT owner_id, kind, context, content_type, status FROM media_objects WHERE key=?").bind(b.key).first();
  if (!media) return json({ error: "not found" }, 404);
  if (media.status !== "uploaded") return json({ error: "already decided" }, 409);
  const now = Date.now();

  if (b.action === "reject") {
    await env.MEDIA.delete(b.key).catch(() => {});
    await env.DB.prepare("DELETE FROM media_objects WHERE key=?").bind(b.key).run();
    await logEvent(env, user, "media_rejected", b.key, media.kind);
    return json({ ok: true });
  }

  if (media.kind === "photo" && media.context === "profile") {
    const obj = await env.MEDIA.get(b.key);
    if (!obj) return json({ error: "object missing from storage" }, 500);
    const ext = EXT_FOR_TYPE[media.content_type] || "jpg";
    const publicKey = `media/teachers/${media.owner_id}.${ext}`;
    await env.MEDIA.put(publicKey, obj.body, { httpMetadata: { contentType: media.content_type } });
    await env.DB.prepare("UPDATE teacher_profiles SET photo_key=?, updated_at=? WHERE user_id=?")
      .bind(publicKey, now, media.owner_id).run();
  }

  await env.DB.prepare("UPDATE media_objects SET status='approved', reviewed_by=?, reviewed_at=? WHERE key=?")
    .bind(user.id, now, b.key).run();
  await logEvent(env, user, "media_approved", b.key, media.kind);
  return json({ ok: true });
}

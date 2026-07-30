import { json, requireUser } from "./_lib.js";
import { serveR2Object } from "./_r2-serve.js";
import { canAccessAsset } from "./_asset-access.js";

// GET /api/asset?key=... — the ONLY read path for anything under uploads/ (the
// /media/ prefix allowlist never includes uploads/, so this is the sole gate).
// Signed-out -> 401. Signed-in but not authorized for this specific object -> 403.
// Range support via the shared _r2-serve helper; private cache-control since
// access is per-user, not per-URL.
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireUser(env, request);
  if (error) return error;

  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("uploads/")) return json({ error: "not found" }, 404);

  const media = await env.DB.prepare(
    "SELECT owner_id, kind, context, status FROM media_objects WHERE key=?"
  ).bind(key).first();
  if (!media) return json({ error: "not found" }, 404);

  if (!(await canAccessAsset(env, user, media))) return json({ error: "forbidden" }, 403);

  const resp = await serveR2Object(env, request, key, { cacheControl: "private, max-age=3600" });
  return resp || json({ error: "not found" }, 404);
}

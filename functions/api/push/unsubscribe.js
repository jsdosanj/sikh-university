// POST /api/push/unsubscribe { endpoint } — one-tap opt-out. Deleting by
// endpoint only (no auth needed): the endpoint is an unguessable per-browser
// URL, so possession is proof of ownership.
import { json, parseBody } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "unavailable" }, 503);
  const { body: b, error } = await parseBody(request);
  if (error) return error;
  const endpoint = b && typeof b.endpoint === "string" ? b.endpoint : "";
  if (!endpoint.startsWith("https://")) return json({ error: "bad request" }, 400);
  try {
    await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(endpoint).run();
  } catch (e) { /* table may not exist yet — nothing to unsubscribe */ }
  return json({ ok: true });
}

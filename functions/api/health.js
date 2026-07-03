import { json } from "./_lib.js";

// GET /api/health -> liveness of the critical bindings, for an unattended uptime
// check. A D1 outage otherwise looks like success (pages return empty lists), so a
// plain 200-check on the homepage would miss it; this probes D1 and R2 directly.
export async function onRequestGet({ env }) {
  const out = { ok: true, db: false, r2: false };
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    out.db = true;
  } catch (e) {
    out.ok = false;
    console.error("health_db_fail", e && e.stack || String(e));
  }
  try {
    await env.MEDIA.head("courses.json");
    out.r2 = true;
  } catch (e) {
    out.ok = false;
    console.error("health_r2_fail", e && e.stack || String(e));
  }
  return json(out, out.ok ? 200 : 503);
}

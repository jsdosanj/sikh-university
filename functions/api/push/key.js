// GET /api/push/key — the VAPID public key the browser needs as
// applicationServerKey for pushManager.subscribe(). 404 while the VAPID
// secrets are unset, which is the signal the UI uses to hide the reminders
// opt-in entirely (feature degrades to invisible until the owner configures it).
import { json } from "../_lib.js";
import { pushConfigured } from "../../push-sender.js";

export async function onRequestGet({ env }) {
  if (!pushConfigured(env)) return json({ error: "not configured" }, 404);
  return json({ key: env.VAPID_PUBLIC_KEY }, 200, { "cache-control": "public, max-age=3600" });
}

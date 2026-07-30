import { json, getUser, logEvent } from "./_lib.js";
import { cleanName, cleanCountry, cleanLanguages } from "./_profile-options.js";

// GET /api/me -> current user { id, email, name, country, languages, role, mfa } or { user: null }.
// mfa.required reflects current enforcement policy: hard-required for admins, a
// grace period for everyone else until Workstream C (studio) flips it on for teachers.
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ user: null });
  const mfaRow = await env.DB.prepare("SELECT enabled_at FROM user_mfa WHERE user_id=?").bind(user.id).first();
  const mfa = { enrolled: !!(mfaRow && mfaRow.enabled_at), required: user.role === "admin" };
  return json({ user: { ...user, mfa } });
}

// POST /api/me -> update the signed-in user's own profile (name, country, languages).
// Email is the magic-link sign-in identity and is intentionally not editable here.
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }

  const name = cleanName(b.name);
  const country = cleanCountry(b.country);
  const languages = cleanLanguages(b.languages);

  await env.DB.prepare("UPDATE users SET name=?, country=?, languages=? WHERE id=?")
    .bind(name, country, languages, user.id).run();
  await logEvent(env, user, "profile_update", null, null);

  return json({ user: { ...user, name, country, languages } });
}

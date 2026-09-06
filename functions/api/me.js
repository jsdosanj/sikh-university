import { json, getUser, logEvent, isCourseTeacher } from "./_lib.js";
import { cleanName, cleanCountry, cleanLanguages } from "./_profile-options.js";

// GET /api/me -> current user { id, email, name, country, languages, role, mfa, isTeacher, marketingOptin } or { user: null }.
// mfa.required reflects current enforcement policy: hard-required for admins, a
// grace period for everyone else until Workstream C (studio) flips it on for teachers.
// isTeacher covers both role==='teacher' AND a course_teachers assignment held by a
// user of any other role (e.g. an admin, or a learner given co-teacher access) — the
// nav/dashboard portal switcher uses this to decide whether to show the teacher view.
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ user: null });
  const mfaRow = await env.DB.prepare("SELECT enabled_at FROM user_mfa WHERE user_id=?").bind(user.id).first();
  const mfa = { enrolled: !!(mfaRow && mfaRow.enabled_at), required: user.role === "admin" };
  const isTeacher = user.role === "teacher" || (await isCourseTeacher(env, user.id));
  const marketingOptin = !!user.marketing_optin;
  return json({ user: { ...user, mfa, isTeacher, marketingOptin } });
}

// POST /api/me -> update the signed-in user's own profile (name, country,
// languages, and — if the `marketingOptin` key is present in the body — the
// marketing-email opt-in). Email is the magic-link sign-in identity and is
// intentionally not editable here.
//
// marketingOptin is deliberately OPTIONAL in the request body (checked with
// hasOwnProperty, not just truthiness) so the existing profile-save call from
// the Profile tab's name/country/languages fields — which never sends this
// key — can't accidentally flip a user's consent back to false on every
// unrelated save.
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }

  const name = cleanName(b.name);
  const country = cleanCountry(b.country);
  const languages = cleanLanguages(b.languages);
  const hasOptinField = Object.prototype.hasOwnProperty.call(b, "marketingOptin");
  const marketingOptin = hasOptinField ? !!b.marketingOptin : !!user.marketing_optin;

  if (hasOptinField) {
    await env.DB.prepare("UPDATE users SET name=?, country=?, languages=?, marketing_optin=? WHERE id=?")
      .bind(name, country, languages, marketingOptin ? 1 : 0, user.id).run();
    await logEvent(env, user, "marketing_optin_update", null, marketingOptin ? "on" : "off");
  } else {
    await env.DB.prepare("UPDATE users SET name=?, country=?, languages=? WHERE id=?")
      .bind(name, country, languages, user.id).run();
  }
  await logEvent(env, user, "profile_update", null, null);

  return json({ user: { ...user, name, country, languages, marketingOptin } });
}

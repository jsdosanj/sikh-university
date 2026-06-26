import { json, getUser, newId, logEvent } from "./_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, course_id TEXT NOT NULL, name TEXT, score INTEGER, issued_at INTEGER NOT NULL, UNIQUE(user_id, course_id))"
  ).run();
}

// GET /api/certificates?id=... -> public verification of a certificate id
export async function onRequestGet({ request, env }) {
  await ensure(env);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ valid: false });
  try {
    const r = await env.DB.prepare("SELECT course_id, name, score, issued_at FROM certificates WHERE id=?").bind(id).first();
    if (!r) return json({ valid: false });
    return json({ valid: true, courseId: r.course_id, name: r.name, score: r.score, issuedAt: r.issued_at });
  } catch (e) { return json({ valid: false }); }
}

// POST /api/certificates { courseId, name } -> issue (or return existing) verifiable id.
// Server-validates the pass against the synced progress table.
export async function onRequestPost({ request, env }) {
  await ensure(env);
  const user = await getUser(env, request);
  if (!user) return json({ error: "Please sign in." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const courseId = (b.courseId || "").toString().slice(0, 120);
  if (!courseId) return json({ error: "courseId required" }, 400);
  const name = (b.name || user.name || "").toString().trim().slice(0, 120);

  let score = null;
  try {
    const p = await env.DB.prepare("SELECT passed_score FROM progress WHERE user_id=? AND course_id=?").bind(user.id, courseId).first();
    score = p ? p.passed_score : null;
  } catch (e) {}
  if (!(typeof score === "number" && score >= 80)) {
    return json({ error: "Pass the course (80%+) first — your progress must sync while signed in." }, 403);
  }

  const existing = await env.DB.prepare("SELECT id FROM certificates WHERE user_id=? AND course_id=?").bind(user.id, courseId).first();
  if (existing) {
    if (name) await env.DB.prepare("UPDATE certificates SET name=? WHERE id=?").bind(name, existing.id).run();
    return json({ ok: true, id: existing.id });
  }
  const id = "SU-" + newId().slice(0, 10).toUpperCase();
  await env.DB.prepare("INSERT INTO certificates (id, user_id, course_id, name, score, issued_at) VALUES (?,?,?,?,?,?)")
    .bind(id, user.id, courseId, name, score, Date.now()).run();
  await logEvent(env, user, "certificate_issued", courseId, "cert_id=" + id);
  return json({ ok: true, id });
}

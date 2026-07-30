import { json, requireRole, newId, logEvent, parseBody } from "../_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS professor_claims (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, " +
    "professor_name TEXT NOT NULL, statement TEXT, status TEXT NOT NULL DEFAULT 'pending', " +
    "decided_by TEXT, decided_at INTEGER, created_at INTEGER NOT NULL)"
  ).run();
}

// GET /api/teacher/claim -> the signed-in teacher/admin's own claims (any status).
// The claimable professor-name list itself comes from the catalogue the client
// already has (/data/index.json), not from the Worker.
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireRole(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  const { results } = await env.DB.prepare(
    "SELECT id, professor_name, statement, status, created_at, decided_at FROM professor_claims WHERE user_id=? ORDER BY created_at DESC"
  ).bind(user.id).all();
  return json({ claims: results || [] });
}

// POST /api/teacher/claim { professorName, statement } -> file a claim on an
// exact courses.json professor string. Admin-reviewed (functions/api/admin/claims.js)
// before it binds teacher_profiles.claimed_professor.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireRole(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const professorName = String(b.professorName || "").trim().slice(0, 120);
  const statement = String(b.statement || "").trim().slice(0, 1000);
  if (!professorName) return json({ error: "professorName required" }, 400);

  const dup = await env.DB.prepare(
    "SELECT id FROM professor_claims WHERE user_id=? AND professor_name=? AND status='pending'"
  ).bind(user.id, professorName).first();
  if (dup) return json({ error: "You already have a pending claim on that name." }, 409);

  const id = newId();
  await env.DB.prepare(
    "INSERT INTO professor_claims (id, user_id, professor_name, statement, status, created_at) VALUES (?,?,?,?,'pending',?)"
  ).bind(id, user.id, professorName, statement, Date.now()).run();
  await logEvent(env, user, "professor_claim_filed", professorName, null);
  return json({ ok: true, id });
}

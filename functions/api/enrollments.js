import { json, getUser, logEvent } from "./_lib.js";

async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS enrollments (user_id TEXT NOT NULL, kind TEXT NOT NULL, target_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (user_id, kind, target_id))"
  ).run();
}

// GET /api/enrollments -> { enrollments: [{ kind, target_id, created_at }] } for the signed-in user.
export async function onRequestGet({ request, env }) {
  await ensure(env);
  const user = await getUser(env, request);
  if (!user) return json({ enrollments: [] });
  try {
    const { results } = await env.DB.prepare(
      "SELECT kind, target_id, created_at FROM enrollments WHERE user_id=? ORDER BY created_at DESC"
    ).bind(user.id).all();
    return json({ enrollments: results || [] });
  } catch (e) { return json({ enrollments: [] }); }
}

// POST /api/enrollments { kind, targetId, action } -> enroll/register or unenroll (sign-in required).
export async function onRequestPost({ request, env }) {
  await ensure(env);
  const user = await getUser(env, request);
  if (!user) return json({ error: "Please sign in to register." }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const kind = b.kind === "program" ? "program" : b.kind === "course" ? "course" : null;
  const targetId = (b.targetId || "").toString().trim().slice(0, 120);
  const action = b.action === "unenroll" ? "unenroll" : "enroll";
  if (!kind || !targetId) return json({ error: "kind and targetId required" }, 400);

  if (action === "unenroll") {
    await env.DB.prepare("DELETE FROM enrollments WHERE user_id=? AND kind=? AND target_id=?")
      .bind(user.id, kind, targetId).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO enrollments (user_id, kind, target_id, created_at) VALUES (?,?,?,?) " +
      "ON CONFLICT(user_id, kind, target_id) DO NOTHING"
    ).bind(user.id, kind, targetId, Date.now()).run();
  }
  await logEvent(env, user, action, kind + ":" + targetId, null);
  return json({ ok: true, enrolled: action === "enroll" });
}

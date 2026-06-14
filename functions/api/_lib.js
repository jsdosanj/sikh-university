// Shared helpers for Sikh University Pages Functions. (_-prefixed → not a route.)
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function newId() { return crypto.randomUUID().replace(/-/g, ""); }

export function readCookie(request, name) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function sessionCookie(id, maxAgeSec) {
  // httpOnly + Secure + SameSite=Lax. maxAgeSec=0 clears it.
  return `su_session=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

// Resolve the logged-in user from the session cookie, or null.
export async function getUser(env, request) {
  const sid = readCookie(request, "su_session");
  if (!sid) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?"
  ).bind(sid, Date.now()).first();
  return row || null;
}

export function isAdminEmail(env, email) {
  const list = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  return list.includes((email || "").toLowerCase());
}

// Append-only audit log. Best-effort: auto-creates the table and never throws,
// so logging a non-critical event can't break the action that triggered it.
export async function logEvent(env, user, action, target, detail) {
  try {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, user_id TEXT, role TEXT, action TEXT NOT NULL, target TEXT, detail TEXT)"
    ).run();
    await env.DB.prepare(
      "INSERT INTO events (id, ts, user_id, role, action, target, detail) VALUES (?,?,?,?,?,?,?)"
    ).bind(newId(), Date.now(), user ? user.id : null, user ? user.role : null, action, target || null, detail || null).run();
  } catch (e) { /* logging is non-critical */ }
}

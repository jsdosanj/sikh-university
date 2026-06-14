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

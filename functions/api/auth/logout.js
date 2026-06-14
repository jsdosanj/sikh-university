import { json, readCookie, sessionCookie } from "../_lib.js";

// POST /api/auth/logout -> deletes the session + clears the cookie
export async function onRequestPost({ request, env }) {
  const sid = readCookie(request, "su_session");
  if (sid) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "Set-Cookie": sessionCookie("", 0) },
  });
}

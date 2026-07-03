import { newId, sessionCookie, isAdminEmail, logEvent } from "../_lib.js";

// GET /api/auth/verify?token=...  -> consumes token, creates session, redirects to dashboard
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const base = env.SITE_URL || url.origin;
  const fail = (msg) => Response.redirect(`${base}/login.html?error=${encodeURIComponent(msg)}`, 302);
  if (!token) return fail("Missing token.");

  // Consume the token ATOMICALLY: a single conditional UPDATE...RETURNING both
  // checks (unused + unexpired) and marks it used in one statement, so two
  // concurrent clicks on the same link (e.g. a mail-client prefetcher) can't both
  // mint a session. RETURNING gives us the email without a separate SELECT.
  const consumed = await env.DB.prepare(
    "UPDATE magic_tokens SET used = 1 WHERE token = ? AND used = 0 AND expires_at > ? RETURNING email"
  ).bind(token, Date.now()).first();
  if (!consumed) {
    console.warn("auth_verify_failed", "invalid_used_or_expired");
    return fail("This sign-in link is invalid or expired.");
  }
  const email = consumed.email;
  let user = await env.DB.prepare("SELECT id, role FROM users WHERE email = ?").bind(email).first();
  const wantAdmin = isAdminEmail(env, email);
  if (!user) {
    const id = newId();
    const role = wantAdmin ? "admin" : "learner";
    await env.DB.prepare("INSERT INTO users (id, email, name, role, created_at) VALUES (?,?,?,?,?)")
      .bind(id, email, null, role, Date.now()).run();
    user = { id, role };
    await logEvent(env, { id, role }, "user_created", email, role);
  } else if (wantAdmin && user.role !== "admin") {
    await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(user.id).run();
  } else if (!wantAdmin && user.role === "admin") {
    // Only ADMIN_EMAILS accounts may be admin — defensively demote anyone else.
    await env.DB.prepare("UPDATE users SET role='learner' WHERE id=?").bind(user.id).run();
  }

  const sid = newId() + newId();
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)").bind(sid, user.id, expires).run();
  await logEvent(env, user, "login", email, null);

  return new Response(null, {
    status: 302,
    headers: { "Location": `${base}/dashboard.html`, "Set-Cookie": sessionCookie(sid, 30 * 24 * 60 * 60) },
  });
}

import { json, getUser, sessionCookie, logEvent } from "../_lib.js";

// POST /api/account/delete { confirm: "DELETE" } -> permanently erase the signed-in
// user's account and personal data, then clear their session.
// Append-only audit `events` are intentionally retained (they hold only an opaque
// user id + action, no profile data) for security/audit integrity.
export async function onRequestPost({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch (e) { b = {}; }
  if (b.confirm !== "DELETE") return json({ error: "confirmation required" }, 400);

  // Log before we delete the user row, so the action is still attributable.
  await logEvent(env, user, "account_deleted", null, null);

  const wipe = async (sql) => { try { await env.DB.prepare(sql).bind(user.id).run(); } catch (e) {} };
  await wipe("DELETE FROM progress WHERE user_id=?");
  await wipe("DELETE FROM enrollments WHERE user_id=?");
  await wipe("DELETE FROM certificates WHERE user_id=?");
  await wipe("DELETE FROM ratings WHERE user_id=?");
  await wipe("DELETE FROM discussions WHERE user_id=?");
  await wipe("DELETE FROM feedback WHERE user_id=?");
  await wipe("DELETE FROM teacher_applications WHERE user_id=?");
  await wipe("DELETE FROM grade_overrides WHERE user_id=?");
  await wipe("DELETE FROM course_teachers WHERE user_id=?");
  await wipe("DELETE FROM sessions WHERE user_id=?");
  await wipe("DELETE FROM users WHERE id=?");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "Set-Cookie": sessionCookie("", 0) },
  });
}

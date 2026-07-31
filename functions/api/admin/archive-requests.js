import { json, requireMfa, logEvent, parseBody } from "../_lib.js";

// GET /api/admin/archive-requests[?status=pending|approved|denied|archived]
// -> requests at that status (default: pending), with the requesting teacher's identity.
export async function onRequestGet({ request, env }) {
  const { error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const status = new URL(request.url).searchParams.get("status") || "pending";
  const { results } = await env.DB.prepare(
    "SELECT r.id, r.course_id, r.reason, r.status, r.requested_at, r.decided_at, u.email, u.name " +
    "FROM course_archive_requests r JOIN users u ON u.id=r.teacher_id WHERE r.status=? ORDER BY r.requested_at ASC"
  ).bind(status).all();
  return json({ requests: results || [] });
}

// POST /api/admin/archive-requests { id, decision: 'approve'|'deny'|'mark_archived' }
// approve       -> queued for the next import-drafts.yml run (scripts/import_drafts.py
//                  also fetches approved archive requests and flips the matching
//                  course's status to 'archived' in courses.json, in the same PR).
// mark_archived -> admin confirms that import PR has actually merged, mirroring
//                  functions/api/admin/drafts-mark-published.js's manual confirmation step.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["admin"]);
  if (error) return error;
  const { body: b, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;
  const decision = String(b.decision || "");
  if (!b.id || !["approve", "deny", "mark_archived"].includes(decision)) {
    return json({ error: "id and a valid decision required" }, 400);
  }

  const reqRow = await env.DB.prepare("SELECT course_id, status FROM course_archive_requests WHERE id=?").bind(b.id).first();
  if (!reqRow) return json({ error: "not found" }, 404);

  if (decision === "mark_archived") {
    if (reqRow.status !== "approved") return json({ error: `cannot mark archived from status '${reqRow.status}'` }, 400);
    await env.DB.prepare("UPDATE course_archive_requests SET status='archived', decided_at=? WHERE id=?").bind(Date.now(), b.id).run();
    await logEvent(env, user, "course_archive_marked_done", reqRow.course_id, null);
    return json({ ok: true });
  }

  if (reqRow.status !== "pending") return json({ error: `cannot decide a request with status '${reqRow.status}'` }, 400);
  const newStatus = decision === "approve" ? "approved" : "denied";
  await env.DB.prepare("UPDATE course_archive_requests SET status=?, decided_by=?, decided_at=? WHERE id=?")
    .bind(newStatus, user.id, Date.now(), b.id).run();
  await logEvent(env, user, "course_archive_" + newStatus, reqRow.course_id, null);
  return json({ ok: true });
}

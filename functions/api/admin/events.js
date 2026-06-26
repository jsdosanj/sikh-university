import { json, getUser } from "../_lib.js";

// GET /api/admin/events -> filtered/sorted/paginated audit-log events (admin only).
// Query params (all optional):
//   action  exact action match (e.g. "login")
//   role    exact role match (learner|teacher|admin)
//   q       substring search across email/target/detail
//   from,to ms-epoch timestamp range (inclusive)
//   sort    "ts_desc" (default) | "ts_asc"
//   limit   page size (default 100, max 500)
//   offset  pagination offset (default 0)
// Returns { events, actions, total } where `actions` is the distinct action list
// (for the filter dropdown) and `total` is the row count for the current filters.
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);

  const p = new URL(request.url).searchParams;
  const where = [];
  const args = [];
  const action = (p.get("action") || "").trim();
  if (action) { where.push("e.action = ?"); args.push(action); }
  const role = (p.get("role") || "").trim();
  if (role) { where.push("e.role = ?"); args.push(role); }
  const q = (p.get("q") || "").trim();
  if (q) {
    where.push("(u.email LIKE ? OR e.target LIKE ? OR e.detail LIKE ?)");
    const like = "%" + q + "%";
    args.push(like, like, like);
  }
  const from = parseInt(p.get("from") || "", 10);
  if (Number.isFinite(from)) { where.push("e.ts >= ?"); args.push(from); }
  const to = parseInt(p.get("to") || "", 10);
  if (Number.isFinite(to)) { where.push("e.ts <= ?"); args.push(to); }

  const whereSql = where.length ? " WHERE " + where.join(" AND ") : "";
  const order = p.get("sort") === "ts_asc" ? "ASC" : "DESC";
  const limit = Math.min(500, Math.max(1, parseInt(p.get("limit") || "100", 10) || 100));
  const offset = Math.max(0, parseInt(p.get("offset") || "0", 10) || 0);

  try {
    const rows = await env.DB.prepare(
      "SELECT e.id, e.ts, e.user_id, e.role, e.action, e.target, e.detail, u.email " +
      "FROM events e LEFT JOIN users u ON u.id=e.user_id" + whereSql +
      " ORDER BY e.ts " + order + " LIMIT ? OFFSET ?"
    ).bind(...args, limit, offset).all();

    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM events e LEFT JOIN users u ON u.id=e.user_id" + whereSql
    ).bind(...args).first();

    const actionsRows = await env.DB.prepare(
      "SELECT DISTINCT action FROM events ORDER BY action"
    ).all();

    return json({
      events: rows.results || [],
      total: totalRow ? totalRow.n : 0,
      actions: (actionsRows.results || []).map((r) => r.action),
    });
  } catch (e) {
    return json({ events: [], total: 0, actions: [] });
  }
}

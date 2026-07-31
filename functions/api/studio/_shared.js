// Shared helpers for the studio routes. (_-prefixed → not a route.)

export async function ensure(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS course_drafts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, base_course_id TEXT, " +
    "course_id TEXT NOT NULL, title TEXT NOT NULL, topic TEXT NOT NULL, level INTEGER NOT NULL, meta TEXT NOT NULL, " +
    "status TEXT NOT NULL DEFAULT 'draft', visibility TEXT NOT NULL DEFAULT 'public', " +
    "review_notes TEXT, reviewed_by TEXT, reviewed_at INTEGER, " +
    "submitted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS draft_lessons (draft_id TEXT NOT NULL, idx INTEGER NOT NULL, title TEXT NOT NULL, " +
    "summary TEXT, html TEXT NOT NULL, media TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (draft_id, idx))"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS draft_quiz (draft_id TEXT NOT NULL, idx INTEGER NOT NULL, q TEXT NOT NULL, " +
    "options TEXT NOT NULL, answer INTEGER NOT NULL, PRIMARY KEY (draft_id, idx))"
  ).run();
}

// Author or admin may act on a draft at all; only draft/changes_requested are editable.
export function isDraftOwner(draft, user) {
  return !!draft && (draft.author_id === user.id || user.role === "admin");
}
export const EDITABLE_STATUSES = new Set(["draft", "changes_requested"]);

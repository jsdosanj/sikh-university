import { json, requireMfa, newId, logEvent } from "../_lib.js";
import { ensure } from "./_shared.js";

// GET /api/studio/drafts -> the signed-in teacher/admin's own drafts (all statuses).
export async function onRequestGet({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  const { results } = await env.DB.prepare(
    "SELECT id, base_course_id, course_id, title, topic, level, status, submitted_at, created_at, updated_at " +
    "FROM course_drafts WHERE author_id=? ORDER BY updated_at DESC"
  ).bind(user.id).all();
  return json({ drafts: results || [] });
}

// POST /api/studio/drafts { courseId, title, topic, level, summary, baseCourseId? }
// -> create a new draft (status='draft'). Editing course content itself happens
// via /api/studio/lesson and /api/studio/quiz once the draft exists.
export async function onRequestPost({ request, env }) {
  const { user, error } = await requireMfa(env, request, ["teacher", "admin"]);
  if (error) return error;
  await ensure(env);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }

  const courseId = String(b.courseId || "").trim().slice(0, 120);
  const title = String(b.title || "").trim().slice(0, 200);
  const topic = String(b.topic || "").trim().slice(0, 60);
  const level = parseInt(b.level, 10);
  const summary = String(b.summary || "").trim().slice(0, 1000);
  if (!courseId || !title || !topic || !Number.isInteger(level)) {
    return json({ error: "courseId, title, topic, and level required" }, 400);
  }

  const id = newId();
  const now = Date.now();
  const meta = JSON.stringify({ summary, outcomes: [], terms: [], references: [], aiAssisted: !!b.aiAssisted });
  await env.DB.prepare(
    "INSERT INTO course_drafts (id, author_id, base_course_id, course_id, title, topic, level, meta, status, created_at, updated_at) " +
    "VALUES (?,?,?,?,?,?,?,?, 'draft', ?, ?)"
  ).bind(id, user.id, b.baseCourseId || null, courseId, title, topic, level, meta, now, now).run();
  await logEvent(env, user, "draft_created", id, courseId);
  return json({ ok: true, id });
}

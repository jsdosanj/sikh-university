import { json, getUser, isCourseTeacher, hasCohortAccess } from "./_lib.js";

// GET /api/course-content?courseId=<id> -> { lessons, quiz } for a gated
// (institutional) course's most-recently-published draft. The real content
// never leaves D1's draft_lessons/draft_quiz — the public, git-tracked
// courses.json entry for a gated course only ever carries title/summary
// (see functions/api/admin/drafts-export.js).
//
// Entitlement: the course's teacher/admin, or a member of a cohort tied to
// this courseId (functions/api/cohorts.js — the institution licensing the
// course hands its buyers that cohort's invite code; sikhiuni.com never
// processes payment itself).
//
// Quiz answers are never included here — this mirrors the public
// course-viewing experience for a free course; grading happens separately
// via POST /api/quiz (extended to grade gated courses from draft_quiz too).
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ error: "Please sign in to view this course." }, 401);

  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return json({ error: "courseId required" }, 400);

  const entitled = user.role === "admin"
    || (await isCourseTeacher(env, user.id, courseId))
    || (await hasCohortAccess(env, user.id, courseId));
  if (!entitled) {
    return json({ error: "This course requires cohort access. Ask your program administrator for an invite code." }, 403);
  }

  const draft = await env.DB.prepare(
    "SELECT id FROM course_drafts WHERE course_id=? AND status='published' ORDER BY updated_at DESC LIMIT 1"
  ).bind(courseId).first();
  if (!draft) return json({ error: "not found" }, 404);

  const { results: lessons } = await env.DB.prepare(
    "SELECT idx, title, summary, html FROM draft_lessons WHERE draft_id=? ORDER BY idx"
  ).bind(draft.id).all();
  const { results: quiz } = await env.DB.prepare(
    "SELECT idx, q, options FROM draft_quiz WHERE draft_id=? ORDER BY idx"
  ).bind(draft.id).all();

  return json({
    lessons: (lessons || []).map((l) => ({ title: l.title, ...(l.summary ? { summary: l.summary } : {}), html: l.html })),
    quiz: (quiz || []).map((q) => ({ q: q.q, options: JSON.parse(q.options) })),
  });
}

import { hasFlag, isCourseTeacher } from "./_lib.js";

// The /api/asset access matrix. A media_objects row only carries a `context`
// string ('profile' | 'assignment:<id>' | 'draft:<id>' | 'course:<id>'), so
// resolving "who else may read this" means looking up the table that owns
// that context kind. 'assignment:' and 'draft:' deliberately do NOT grant
// enrolled-student access, because both are private-by-nature (a submission
// is one student's private work; a draft isn't published yet) — that would
// leak private homework to the whole class. 'course:' is the one branch where
// enrollment alone grants access: functions/api/admin/drafts-mark-published.js
// re-tags a draft's media from 'draft:<id>' to 'course:<courseId>' at the
// moment it confirms the import PR has actually merged, so nothing gets
// enrolled-student access before the course is truly live.
export async function canAccessAsset(env, user, media) {
  if (!user) return false;
  if (user.id === media.owner_id) return true;
  if (user.role === "admin") return true;
  if (await hasFlag(env, user.id, "reviewer")) return true;

  if (media.context && media.context.startsWith("assignment:")) {
    // Only the submitting student (owner, already covered above) and the
    // course's teacher(s) may read a submission — never other classmates.
    const assignmentId = media.context.slice("assignment:".length);
    try {
      const a = await env.DB.prepare("SELECT course_id FROM assignments WHERE id=?").bind(assignmentId).first();
      if (a) return await isCourseTeacher(env, user.id, a.course_id);
    } catch (e) { /* assignments table doesn't exist yet (pre-Workstream D) */ }
    return false;
  }

  if (media.context && media.context.startsWith("draft:")) {
    // Co-teacher preview of not-yet-published course media. No enrolled-
    // student branch: a draft is by definition not published yet.
    const draftId = media.context.slice("draft:".length);
    try {
      const d = await env.DB.prepare("SELECT base_course_id FROM course_drafts WHERE id=?").bind(draftId).first();
      if (d) return await isCourseTeacher(env, user.id, d.base_course_id);
    } catch (e) { /* course_drafts table doesn't exist yet (pre-Workstream C) */ }
    return false;
  }

  if (media.context && media.context.startsWith("course:")) {
    // Published lecture media (Workstream C wires up writing this context at
    // publish time) — the one case where enrollment alone grants access.
    const courseId = media.context.slice("course:".length);
    if (await isCourseTeacher(env, user.id, courseId)) return true;
    const enrolled = await env.DB.prepare("SELECT 1 FROM enrollments WHERE user_id=? AND kind='course' AND target_id=?").bind(user.id, courseId).first();
    return !!enrolled;
  }

  return false;
}

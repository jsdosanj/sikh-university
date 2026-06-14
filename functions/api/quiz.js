import { json, getUser, logEvent } from "./_lib.js";
import { QUIZ_KEYS } from "./_quiz-keys.js";

// POST /api/quiz { courseId, answers:[selectedOptionIndex, ...] }
// Grades the quiz ON THE SERVER against the secret answer key. Answers are never
// sent to the browser, so a client cannot forge a score (and thus a certificate).
// If the user is signed in, the (best) score is stored authoritatively in progress.
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const key = b && b.courseId ? QUIZ_KEYS[b.courseId] : null;
  if (!key) return json({ error: "unknown course or no quiz" }, 404);
  const answers = Array.isArray(b.answers) ? b.answers : [];

  let correct = 0;
  for (let i = 0; i < key.length; i++) if (Number(answers[i]) === key[i]) correct++;
  const total = key.length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const passed = score >= 80;

  // Persist the grade only for signed-in users (server is the source of truth).
  const user = await getUser(env, request);
  if (user) {
    const prior = await env.DB.prepare("SELECT passed_score FROM progress WHERE user_id=? AND course_id=?").bind(user.id, b.courseId).first();
    const wasPassed = !!(prior && prior.passed_score >= 80);
    await env.DB.prepare(
      "INSERT INTO progress (user_id, course_id, done, passed_score, updated_at) VALUES (?,?,'[]',?,?) " +
      "ON CONFLICT(user_id, course_id) DO UPDATE SET updated_at=excluded.updated_at, " +
      "passed_score=CASE WHEN progress.passed_score IS NULL THEN excluded.passed_score ELSE MAX(progress.passed_score, excluded.passed_score) END"
    ).bind(user.id, b.courseId, score, Date.now()).run();
    if (passed && !wasPassed) await logEvent(env, user, "passed_course", b.courseId, "score=" + score);
  }
  return json({ score, correct, total, passed, signedIn: !!user });
}

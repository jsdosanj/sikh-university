import { json } from "./_lib.js";
import { QUIZ_KEYS } from "./_quiz-keys.js";

// POST /api/program-exam { items:[{cid, qi, sel}], passMark }
// Grades a program cumulative exam ON THE SERVER against the secret answer keys,
// mirroring /api/quiz for the multi-course question pool. The browser never
// receives quiz answers (they are stripped from the public catalogue); it submits
// (courseId, question-index, chosen-option) tuples and the server scores them.
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const items = Array.isArray(b && b.items) ? b.items : [];
  if (items.length === 0) return json({ error: "no answers submitted" }, 400);
  const passMark = Math.min(100, Math.max(1, Number(b.passMark) || 70));

  let correct = 0, total = 0;
  for (const it of items) {
    const key = it && it.cid ? QUIZ_KEYS[it.cid] : null;
    const qi = Number(it && it.qi);
    if (!key || !Number.isInteger(qi) || qi < 0 || qi >= key.length) continue; // unknown question — not graded
    total++;
    if (Number(it.sel) === key[qi]) correct++;
  }
  if (total === 0) return json({ error: "no gradable questions" }, 400);
  const score = Math.round((correct / total) * 100);
  return json({ score, correct, total, passed: score >= passMark });
}

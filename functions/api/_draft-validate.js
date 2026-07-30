// Mirrors scripts/validate.py's per-course rules (required fields, topic exists,
// lesson shape, quiz shape) plus studio-only rules (summary length, >=3 lessons).
// This is fast feedback inside the studio UI; the actual safety net that
// protects the live catalogue is still scripts/validate.py running in CI
// against the real merged courses.json after the import PR — every draft ends
// up going through that exact same gate, so this validator doesn't need to be
// a byte-for-byte reimplementation of it, just close enough to save authors a
// round trip to CI. (_-prefixed → not a route.)

export function validateDraft({ draft, lessons, quiz }, topicIds) {
  const errors = [];
  const push = (m) => errors.push(m);

  if (!draft.course_id) push("missing course id");
  if (!draft.title || !draft.title.trim()) push("missing title");
  if (!draft.topic) push("missing topic");
  else if (topicIds && !topicIds.includes(draft.topic)) push(`unknown topic '${draft.topic}'`);
  if (!Number.isInteger(draft.level) || draft.level < 100 || draft.level % 100 !== 0) push("level must be a hundred-level integer (100, 200, 300, ...)");

  let meta = {};
  try { meta = draft.meta ? JSON.parse(draft.meta) : {}; } catch (e) { push("meta is not valid JSON"); }
  if (!meta.summary || !meta.summary.trim()) push("missing summary");
  else if (meta.summary.trim().length < 40) push("summary is too short (studio minimum: 40 characters)");

  if (!lessons || lessons.length < 3) push("a course needs at least 3 lessons (studio minimum)");
  (lessons || []).forEach((ls, i) => {
    if (!ls.title || !ls.title.trim()) push(`lesson ${i + 1}: missing title`);
    if (!ls.html || !ls.html.trim()) push(`lesson ${i + 1}: missing content`);
    else if (/<script[\s>]/i.test(ls.html)) push(`lesson ${i + 1}: content still contains a <script> tag — this should be impossible after sanitization`);
  });

  (quiz || []).forEach((q, i) => {
    let options = [];
    try { options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]"); } catch (e) {}
    if (!Array.isArray(options) || options.length < 2) push(`quiz ${i + 1}: needs at least 2 options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) push(`quiz ${i + 1}: answer index out of range`);
    if (!q.q || !q.q.trim()) push(`quiz ${i + 1}: missing question text`);
  });

  return errors;
}

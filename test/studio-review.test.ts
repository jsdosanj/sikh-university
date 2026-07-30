// Course authoring studio + review board: draft lifecycle (draft -> submitted ->
// in_review -> approved/changes_requested), submission preconditions (identity
// verification, validator, media rights gate), scholar-review rule for Sikhi
// topics, and the admin export/mark-published endpoints. Stateful fake D1.
import { describe, it, expect, beforeEach } from "vitest";
import { onRequestGet as draftsGet, onRequestPost as draftsPost } from "../functions/api/studio/drafts.js";
import { onRequestGet as draftGet, onRequestPost as draftPost } from "../functions/api/studio/draft.js";
import { onRequestPost as lessonPost } from "../functions/api/studio/lesson.js";
import { onRequestPost as quizPost } from "../functions/api/studio/quiz.js";
import { onRequestGet as validateGet } from "../functions/api/studio/validate.js";
import { onRequestPost as submitPost } from "../functions/api/studio/submit.js";
import { onRequestGet as reviewQueueGet } from "../functions/api/review/queue.js";
import { onRequestGet as reviewDraftGet } from "../functions/api/review/draft.js";
import { onRequestPost as decisionPost } from "../functions/api/review/decision.js";
import { onRequestGet as exportGet } from "../functions/api/admin/drafts-export.js";
import { onRequestPost as markPublishedPost } from "../functions/api/admin/drafts-mark-published.js";
import { req } from "./helpers";

function fakeDB() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const userMfa = new Map<string, any>();
  const userFlags = new Set<string>(); // `${userId}|${flag}`
  const teacherProfiles = new Map<string, any>();
  const drafts = new Map<string, any>();
  const lessons = new Map<string, any[]>(); // draft_id -> [{idx,title,summary,html,media}]
  const quizzes = new Map<string, any[]>();
  const media = new Map<string, any>();
  const courseTeachers = new Set<string>(); // `${courseId}|${userId}`

  function handleFirst(sql: string, b: any[]) {
    if (sql.includes("FROM sessions s JOIN users u")) {
      const [sid, now] = b;
      const s = sessions.get(sid);
      if (!s || s.expires_at <= now) return null;
      const u = users.get(s.user_id);
      return u ? { id: u.id, email: u.email, name: u.name, role: u.role, mfa_ok: s.mfa_ok } : null;
    }
    if (sql.includes("SELECT enabled_at FROM user_mfa")) { const r = userMfa.get(b[0]); return r ? { enabled_at: r.enabled_at } : null; }
    if (sql.includes("SELECT 1 FROM user_flags")) return userFlags.has(`${b[0]}|${b[1]}`) ? { x: 1 } : null;
    if (sql.includes("SELECT verification_level FROM teacher_profiles")) {
      const p = teacherProfiles.get(b[0]);
      return p ? { verification_level: p.verification_level } : null;
    }
    if (sql.includes("SELECT display_name, claimed_professor FROM teacher_profiles")) {
      const p = teacherProfiles.get(b[0]);
      return p ? { display_name: p.display_name, claimed_professor: p.claimed_professor || null } : null;
    }
    if (sql.includes("SELECT name, email FROM users WHERE id=?")) {
      const u = users.get(b[0]);
      return u ? { name: u.name, email: u.email } : null;
    }
    if (sql.includes("SELECT * FROM course_drafts WHERE id=?")) return drafts.get(b[0]) || null;
    if (sql.includes("SELECT status, course_id, author_id FROM course_drafts")) {
      const d = drafts.get(b[0]);
      return d ? { status: d.status, course_id: d.course_id, author_id: d.author_id } : null;
    }
    if (sql.includes("SELECT status, course_id FROM course_drafts")) {
      const d = drafts.get(b[0]);
      return d ? { status: d.status, course_id: d.course_id } : null;
    }
    if (sql.includes("SELECT topic, course_id, status FROM course_drafts")) {
      const d = drafts.get(b[0]);
      return d ? { topic: d.topic, course_id: d.course_id, status: d.status } : null;
    }
    if (sql.includes("SELECT owner_id") && sql.includes("media_objects")) return null; // not used here
    if (sql.includes("SELECT status, rights FROM media_objects")) {
      const m = media.get(b[0]);
      return m ? { status: m.status, rights: m.rights } : null;
    }
    return null;
  }
  function handleRun(sql: string, b: any[]) {
    if (sql.startsWith("CREATE TABLE")) return { success: true };
    if (sql.includes("INSERT INTO course_drafts")) {
      const [id, author_id, base_course_id, course_id, title, topic, level, meta, created_at, updated_at] = b;
      drafts.set(id, { id, author_id, base_course_id, course_id, title, topic, level, meta, status: "draft", review_notes: null, reviewed_by: null, reviewed_at: null, submitted_at: null, created_at, updated_at });
      lessons.set(id, []); quizzes.set(id, []);
      return { success: true };
    }
    if (sql.includes("DELETE FROM draft_lessons")) { lessons.set(b[0], []); return { success: true }; }
    if (sql.includes("DELETE FROM draft_quiz")) { quizzes.set(b[0], []); return { success: true }; }
    if (sql.includes("DELETE FROM course_drafts")) { drafts.delete(b[0]); return { success: true }; }
    if (sql.includes("UPDATE course_drafts SET title=?, topic=?, level=?, meta=?")) {
      const [title, topic, level, meta, updated_at, id] = b;
      Object.assign(drafts.get(id), { title, topic, level, meta, updated_at });
      return { success: true };
    }
    if (sql.includes("UPDATE course_drafts SET updated_at=?")) { drafts.get(b[1]).updated_at = b[0]; return { success: true }; }
    if (sql.includes("INSERT INTO draft_lessons")) {
      const [draft_id, idx, title, summary, html, mediaJson, updated_at] = b;
      const arr = lessons.get(draft_id) || [];
      const existing = arr.find((l) => l.idx === idx);
      if (existing) Object.assign(existing, { title, summary, html, media: mediaJson, updated_at });
      else arr.push({ idx, title, summary, html, media: mediaJson, updated_at });
      lessons.set(draft_id, arr);
      return { success: true };
    }
    if (sql.includes("INSERT INTO draft_quiz")) {
      const [draft_id, idx, q, options, answer] = b;
      const arr = quizzes.get(draft_id) || [];
      arr.push({ idx, q, options, answer });
      quizzes.set(draft_id, arr);
      return { success: true };
    }
    if (sql.includes("UPDATE course_drafts SET status='submitted'")) {
      const [now, now2, id] = b;
      Object.assign(drafts.get(id), { status: "submitted", submitted_at: now, updated_at: now2 });
      return { success: true };
    }
    if (sql.includes("UPDATE course_drafts SET status='in_review'")) {
      const [reviewed_by, reviewed_at, id] = b;
      Object.assign(drafts.get(id), { status: "in_review", reviewed_by, reviewed_at });
      return { success: true };
    }
    if (sql.includes("UPDATE course_drafts SET status=?, review_notes=?")) {
      const [status, review_notes, reviewed_by, reviewed_at, id] = b;
      Object.assign(drafts.get(id), { status, review_notes, reviewed_by, reviewed_at });
      return { success: true };
    }
    if (sql.includes("UPDATE course_drafts SET status='published'")) {
      const [updated_at, id] = b;
      Object.assign(drafts.get(id), { status: "published", updated_at });
      return { success: true };
    }
    if (sql.includes("INSERT OR IGNORE INTO course_teachers")) {
      const [courseId, userId] = b;
      courseTeachers.add(`${courseId}|${userId}`);
      return { success: true };
    }
    if (sql.includes("UPDATE media_objects SET context=? WHERE key=? AND context=?")) {
      const [newContext, key, oldContext] = b;
      const m = media.get(key);
      if (m && m.context === oldContext) m.context = newContext;
      return { success: true };
    }
    return { success: true };
  }
  function handleAll(sql: string, b: any[]) {
    if (sql.includes("FROM draft_lessons WHERE draft_id=?") && sql.includes("SELECT idx, title, html FROM")) {
      return { results: (lessons.get(b[0]) || []).map((l) => ({ idx: l.idx, title: l.title, html: l.html })) };
    }
    if (sql.includes("FROM draft_lessons WHERE draft_id=?")) return { results: lessons.get(b[0]) || [] };
    if (sql.includes("FROM draft_quiz WHERE draft_id=?")) return { results: quizzes.get(b[0]) || [] };
    if (sql.includes("WHERE cd.reviewed_by IS NOT NULL")) {
      const list = [...drafts.values()].filter((d) => d.reviewed_by).map((d) => ({
        ...d,
        author_email: users.get(d.author_id)?.email, author_name: users.get(d.author_id)?.name,
        reviewer_email: users.get(d.reviewed_by)?.email, reviewer_name: users.get(d.reviewed_by)?.name,
      }));
      return { results: list };
    }
    if (sql.includes("FROM course_drafts cd JOIN users u")) {
      const list = [...drafts.values()].filter((d) => d.status === "submitted" || d.status === "in_review").map((d) => ({ ...d, author_email: users.get(d.author_id)?.email, author_name: users.get(d.author_id)?.name }));
      return { results: list };
    }
    if (sql.includes("SELECT * FROM course_drafts WHERE status=?")) {
      const list = [...drafts.values()].filter((d) => d.status === b[0]);
      return { results: list };
    }
    if (sql.includes("FROM course_drafts WHERE author_id=?")) {
      const list = [...drafts.values()].filter((d) => d.author_id === b[0]);
      return { results: list };
    }
    return { results: [] };
  }
  function prepare(sql: string) {
    let bound: any[] = [];
    const self = {
      bind(...args: any[]) { bound = args; return self; },
      async first() { return handleFirst(sql, bound); },
      async run() { return handleRun(sql, bound); },
      async all() { return handleAll(sql, bound); },
    };
    return self;
  }
  return { prepare, users, sessions, userMfa, userFlags, teacherProfiles, drafts, lessons, quizzes, media, courseTeachers };
}

function fakeAssets(topics: string[]) {
  return { fetch: async () => new Response(JSON.stringify({ topics: topics.map((id) => ({ id })) }), { status: 200 }) };
}

function makeEnv(topics = ["gurmat", "modern-skills"]) { return { DB: fakeDB(), ASSETS: fakeAssets(topics) }; }
function seedUser(env: any, { id, role = "teacher", mfaOk = 1 }: any) {
  env.DB.users.set(id, { id, email: id + "@example.com", name: id, role });
  env.DB.sessions.set("sid-" + id, { user_id: id, expires_at: Date.now() + 100000, mfa_ok: mfaOk });
}
function asReq(id: string | null, body?: unknown, url = "http://localhost/api/studio/drafts") {
  return req({ url, cookie: id ? "sid-" + id : undefined, body });
}

async function makeGoodDraft(env: any, authorId: string, opts: { topic?: string } = {}) {
  const create = await draftsPost({ request: asReq(authorId, { courseId: "new-course", title: "New Course", topic: opts.topic || "modern-skills", level: 100, summary: "A".repeat(45) }), env });
  const { id } = await create.json();
  await draftPost({ request: asReq(authorId, { id, action: "update_meta", aiAssisted: false }, "http://localhost/api/studio/draft"), env });
  for (let i = 0; i < 3; i++) {
    await lessonPost({ request: asReq(authorId, { draftId: id, idx: i, title: `Lesson ${i + 1}`, html: `<p>content ${i}</p>` }, "http://localhost/api/studio/lesson"), env });
  }
  await quizPost({ request: asReq(authorId, { draftId: id, questions: [{ q: "Q1?", options: ["a", "b"], answer: 0 }] }, "http://localhost/api/studio/quiz"), env });
  return id;
}

describe("draft creation + editing", () => {
  let env: any;
  beforeEach(() => { env = makeEnv(); seedUser(env, { id: "t1" }); });

  it("creates a draft and lists it under 'mine'", async () => {
    const res = await draftsPost({ request: asReq("t1", { courseId: "c1", title: "T", topic: "modern-skills", level: 100, summary: "x".repeat(45) }), env });
    expect(res.status).toBe(200);
    const list = await (await draftsGet({ request: asReq("t1", undefined, "http://localhost/api/studio/drafts"), env })).json();
    expect(list.drafts).toHaveLength(1);
    expect(list.drafts[0].course_id).toBe("c1");
  });

  it("a learner cannot create a draft", async () => {
    seedUser(env, { id: "l1", role: "learner" });
    const res = await draftsPost({ request: asReq("l1", { courseId: "c1", title: "T", topic: "modern-skills", level: 100, summary: "x" }), env });
    expect(res.status).toBe(403);
  });

  it("a teacher cannot edit another teacher's draft", async () => {
    seedUser(env, { id: "t2" });
    const id = await makeGoodDraft(env, "t1");
    const res = await lessonPost({ request: asReq("t2", { draftId: id, idx: 0, title: "hack", html: "<p>x</p>" }, "http://localhost/api/studio/lesson"), env });
    expect(res.status).toBe(404);
  });

  it("cannot edit a draft once it's submitted", async () => {
    seedUser(env, { id: "t1" });
    env.DB.teacherProfiles.set("t1", { verification_level: "identity", display_name: "T1" });
    const id = await makeGoodDraft(env, "t1");
    await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    const res = await lessonPost({ request: asReq("t1", { draftId: id, idx: 0, title: "x", html: "<p>x</p>" }, "http://localhost/api/studio/lesson"), env });
    expect(res.status).toBe(400);
  });
});

describe("validation + submission preconditions", () => {
  let env: any;
  beforeEach(() => { env = makeEnv(); seedUser(env, { id: "t1" }); });

  it("validate reports errors for a too-short summary and <3 lessons", async () => {
    const create = await draftsPost({ request: asReq("t1", { courseId: "c1", title: "T", topic: "modern-skills", level: 100, summary: "short" }), env });
    const { id } = await create.json();
    const res = await validateGet({ request: asReq("t1", undefined, `http://localhost/api/studio/validate?id=${id}`), env });
    const { valid, errors } = await res.json();
    expect(valid).toBe(false);
    expect(errors.some((e: string) => e.includes("summary"))).toBe(true);
    expect(errors.some((e: string) => e.includes("3 lessons"))).toBe(true);
  });

  it("submit is rejected without identity verification, even with a clean draft", async () => {
    const id = await makeGoodDraft(env, "t1");
    const res = await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    expect(res.status).toBe(403);
  });

  it("submit succeeds once identity-verified and the draft is clean", async () => {
    env.DB.teacherProfiles.set("t1", { verification_level: "identity", display_name: "T1" });
    const id = await makeGoodDraft(env, "t1");
    const res = await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    expect(res.status).toBe(200);
    expect(env.DB.drafts.get(id).status).toBe("submitted");
  });

  it("submit is rejected if a referenced lesson media isn't approved", async () => {
    env.DB.teacherProfiles.set("t1", { verification_level: "identity", display_name: "T1" });
    const id = await makeGoodDraft(env, "t1");
    await lessonPost({ request: asReq("t1", { draftId: id, idx: 0, title: "L1", html: "<p>x</p>", media: [{ key: "uploads/t1/draft/x.pdf" }] }, "http://localhost/api/studio/lesson"), env });
    env.DB.media.set("uploads/t1/draft/x.pdf", { status: "uploaded", rights: "own" });
    const res = await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errors.some((e: string) => e.includes("not yet approved"))).toBe(true);
  });
});

describe("review board", () => {
  let env: any;
  let sikhiDraftId: string, modernDraftId: string;
  beforeEach(async () => {
    env = makeEnv(["gurmat", "modern-skills"]);
    seedUser(env, { id: "t1" });
    seedUser(env, { id: "reviewer1", role: "teacher" });
    seedUser(env, { id: "scholar1", role: "teacher" });
    seedUser(env, { id: "admin1", role: "admin", mfaOk: 1 });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
    env.DB.userFlags.add("reviewer1|reviewer");
    env.DB.userFlags.add("scholar1|reviewer");
    env.DB.teacherProfiles.set("scholar1", { verification_level: "scholar", display_name: "Scholar One" });
    env.DB.teacherProfiles.set("t1", { verification_level: "identity", display_name: "T1" });

    sikhiDraftId = await makeGoodDraft(env, "t1", { topic: "gurmat" });
    modernDraftId = await makeGoodDraft(env, "t1", { topic: "modern-skills" });
    await submitPost({ request: asReq("t1", { id: sikhiDraftId }, "http://localhost/api/studio/submit"), env });
    await submitPost({ request: asReq("t1", { id: modernDraftId }, "http://localhost/api/studio/submit"), env });
  });

  it("queue lists submitted drafts", async () => {
    const res = await reviewQueueGet({ request: asReq("reviewer1", undefined, "http://localhost/api/review/queue"), env });
    const { drafts } = await res.json();
    expect(drafts).toHaveLength(2);
  });

  it("opening a draft claims it (submitted -> in_review, reviewed_by set)", async () => {
    await reviewDraftGet({ request: asReq("reviewer1", undefined, `http://localhost/api/review/draft?id=${modernDraftId}`), env });
    expect(env.DB.drafts.get(modernDraftId).status).toBe("in_review");
    expect(env.DB.drafts.get(modernDraftId).reviewed_by).toBe("reviewer1");
  });

  it("a non-scholar reviewer cannot approve a Sikhi-topic draft", async () => {
    const res = await decisionPost({ request: asReq("reviewer1", { id: sikhiDraftId, decision: "approve" }, "http://localhost/api/review/decision"), env });
    expect(res.status).toBe(403);
  });

  it("a scholar-verified reviewer can approve a Sikhi-topic draft", async () => {
    const res = await decisionPost({ request: asReq("scholar1", { id: sikhiDraftId, decision: "approve" }, "http://localhost/api/review/decision"), env });
    expect(res.status).toBe(200);
    expect(env.DB.drafts.get(sikhiDraftId).status).toBe("approved");
  });

  it("admin can approve a Sikhi-topic draft without being scholar-verified", async () => {
    const res = await decisionPost({ request: asReq("admin1", { id: sikhiDraftId, decision: "approve" }, "http://localhost/api/review/decision"), env });
    expect(res.status).toBe(200);
  });

  it("a non-scholar reviewer CAN approve a Modern Skills draft", async () => {
    const res = await decisionPost({ request: asReq("reviewer1", { id: modernDraftId, decision: "approve" }, "http://localhost/api/review/decision"), env });
    expect(res.status).toBe(200);
  });

  it("changes_requested sends the draft back to an editable state", async () => {
    await decisionPost({ request: asReq("reviewer1", { id: modernDraftId, decision: "changes_requested", notes: "fix lesson 2" }, "http://localhost/api/review/decision"), env });
    expect(env.DB.drafts.get(modernDraftId).status).toBe("changes_requested");
    const res = await lessonPost({ request: asReq("t1", { draftId: modernDraftId, idx: 0, title: "fixed", html: "<p>x</p>" }, "http://localhost/api/studio/lesson"), env });
    expect(res.status).toBe(200);
  });

  it("queue?history=1 lists decided drafts with reviewer identity and notes, but not still-pending ones", async () => {
    await decisionPost({ request: asReq("reviewer1", { id: modernDraftId, decision: "changes_requested", notes: "fix lesson 2" }, "http://localhost/api/review/decision"), env });
    const res = await reviewQueueGet({ request: asReq("reviewer1", undefined, "http://localhost/api/review/queue?history=1"), env });
    expect(res.status).toBe(200);
    const { drafts } = await res.json();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe(modernDraftId);
    expect(drafts[0].status).toBe("changes_requested");
    expect(drafts[0].review_notes).toBe("fix lesson 2");
    expect(drafts[0].reviewer_email).toBe(env.DB.users.get("reviewer1").email);
  });
});

describe("admin drafts-export / mark-published", () => {
  let env: any;
  beforeEach(async () => {
    env = makeEnv();
    seedUser(env, { id: "t1" });
    seedUser(env, { id: "admin1", role: "admin", mfaOk: 1 });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
    env.DB.teacherProfiles.set("t1", { verification_level: "identity", display_name: "Teacher One" });
  });

  it("export requires an admin session or the Bearer EXPORT_TOKEN", async () => {
    const res = await exportGet({ request: req({ url: "http://localhost/api/admin/drafts-export?status=approved" }), env });
    expect(res.status).toBe(401);
  });

  it("export via Bearer token returns approved drafts in canonical Course shape", async () => {
    const id = await makeGoodDraft(env, "t1");
    await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    await decisionPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/review/decision"), env });

    const envWithToken = { ...env, EXPORT_TOKEN: "secret123" };
    const tokenReq = new Request("http://localhost/api/admin/drafts-export?status=approved", { headers: { authorization: "Bearer secret123" } });
    const res = await exportGet({ request: tokenReq, env: envWithToken });
    expect(res.status).toBe(200);
    const { courses } = await res.json();
    expect(courses).toHaveLength(1);
    expect(courses[0].professor).toBe("Teacher One");
    expect(courses[0].lessons).toHaveLength(3);
    expect(courses[0]._draftId).toBe(id);
  });

  it("mark-published requires status='approved'", async () => {
    const id = await makeGoodDraft(env, "t1");
    const res = await markPublishedPost({ request: asReq("admin1", { draftId: id }, "http://localhost/api/admin/drafts-mark-published"), env });
    expect(res.status).toBe(400);
  });

  it("mark-published succeeds for an approved draft", async () => {
    const id = await makeGoodDraft(env, "t1");
    await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    await decisionPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/review/decision"), env });
    const res = await markPublishedPost({ request: asReq("admin1", { draftId: id }, "http://localhost/api/admin/drafts-mark-published"), env });
    expect(res.status).toBe(200);
    expect(env.DB.drafts.get(id).status).toBe("published");
  });

  it("mark-published re-tags draft media to course: context and registers the author as course_teachers", async () => {
    const id = await makeGoodDraft(env, "t1");
    env.DB.media.set("uploads/t1/draft/lecture.pdf", { status: "approved", rights: "own", context: `draft:${id}` });
    const lessonList = env.DB.lessons.get(id);
    lessonList[0].media = JSON.stringify([{ key: "uploads/t1/draft/lecture.pdf" }]);

    await submitPost({ request: asReq("t1", { id }, "http://localhost/api/studio/submit"), env });
    await decisionPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/review/decision"), env });
    const res = await markPublishedPost({ request: asReq("admin1", { draftId: id }, "http://localhost/api/admin/drafts-mark-published"), env });
    expect(res.status).toBe(200);

    const draft = env.DB.drafts.get(id);
    expect(env.DB.media.get("uploads/t1/draft/lecture.pdf").context).toBe(`course:${draft.course_id}`);
    expect(env.DB.courseTeachers.has(`${draft.course_id}|t1`)).toBe(true);
  });
});

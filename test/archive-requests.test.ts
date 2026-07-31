// Teacher-initiated course archive requests: create -> admin approve/deny ->
// (approved only) admin mark_archived, mirroring the professor_claims/
// drafts-mark-published lifecycle pattern. Stateful fake D1.
import { describe, it, expect, beforeEach } from "vitest";
import { onRequestGet as teacherGet, onRequestPost as teacherPost } from "../functions/api/teacher/archive-request.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/archive-requests.js";
import { onRequestGet as exportGet } from "../functions/api/admin/archive-requests-export.js";
import { req } from "./helpers";

function fakeDB() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const userMfa = new Map<string, any>();
  const courseTeachers = new Set<string>(); // `${courseId}|${userId}`
  const requests = new Map<string, any>();

  function handleFirst(sql: string, b: any[]) {
    if (sql.includes("FROM sessions s JOIN users u")) {
      const [sid, now] = b;
      const s = sessions.get(sid);
      if (!s || s.expires_at <= now) return null;
      const u = users.get(s.user_id);
      return u ? { id: u.id, email: u.email, name: u.name, role: u.role, mfa_ok: s.mfa_ok } : null;
    }
    if (sql.includes("FROM user_mfa WHERE user_id")) { const r = userMfa.get(b[0]); return r ? { enabled_at: r.enabled_at } : null; }
    if (sql.includes("FROM course_teachers WHERE user_id")) {
      const [userId, courseId] = b;
      return courseTeachers.has(`${courseId}|${userId}`) ? { x: 1 } : null;
    }
    if (sql.includes("SELECT id FROM course_archive_requests WHERE course_id=? AND status='pending'")) {
      for (const r of requests.values()) if (r.course_id === b[0] && r.status === "pending") return { id: r.id };
      return null;
    }
    if (sql.includes("SELECT course_id, status FROM course_archive_requests WHERE id=?")) {
      const r = requests.get(b[0]);
      return r ? { course_id: r.course_id, status: r.status } : null;
    }
    return null;
  }
  function handleRun(sql: string, b: any[]) {
    if (sql.startsWith("CREATE TABLE")) return { success: true };
    if (sql.includes("INSERT INTO course_archive_requests")) {
      const [id, course_id, teacher_id, reason, requested_at] = b;
      requests.set(id, { id, course_id, teacher_id, reason, status: "pending", requested_at, decided_by: null, decided_at: null });
      return { success: true };
    }
    if (sql.includes("UPDATE course_archive_requests SET status='archived'")) {
      const [decided_at, id] = b;
      Object.assign(requests.get(id), { status: "archived", decided_at });
      return { success: true };
    }
    if (sql.includes("UPDATE course_archive_requests SET status=?, decided_by=?, decided_at=?")) {
      const [status, decided_by, decided_at, id] = b;
      Object.assign(requests.get(id), { status, decided_by, decided_at });
      return { success: true };
    }
    return { success: true };
  }
  function handleAll(sql: string, b: any[]) {
    if (sql.includes("FROM course_archive_requests WHERE teacher_id=?")) {
      return { results: [...requests.values()].filter((r) => r.teacher_id === b[0]) };
    }
    if (sql.includes("FROM course_archive_requests r JOIN users u")) {
      const list = [...requests.values()].filter((r) => r.status === b[0]).map((r) => ({ ...r, email: users.get(r.teacher_id)?.email, name: users.get(r.teacher_id)?.name }));
      return { results: list };
    }
    if (sql.includes("SELECT id, course_id FROM course_archive_requests WHERE status='approved'")) {
      return { results: [...requests.values()].filter((r) => r.status === "approved").map((r) => ({ id: r.id, course_id: r.course_id })) };
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
  return { prepare, users, sessions, userMfa, courseTeachers, requests };
}

function seedUser(env: any, { id, role = "teacher", mfaOk = 1 }: any) {
  env.DB.users.set(id, { id, email: id + "@example.com", name: id, role });
  env.DB.sessions.set("sid-" + id, { user_id: id, expires_at: Date.now() + 100000, mfa_ok: mfaOk });
}
function asReq(id: string | null, body?: unknown, url = "http://localhost/api/teacher/archive-request") {
  return req({ url, cookie: id ? "sid-" + id : undefined, body });
}

function makeEnv() {
  const DB = fakeDB();
  return { DB, EXPORT_TOKEN: "test-export-token" };
}

describe("teacher archive-request lifecycle", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
    seedUser(env, { id: "t1" });
    seedUser(env, { id: "t2" });
    seedUser(env, { id: "admin1", role: "admin" });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
    env.DB.courseTeachers.add("course-a|t1");
  });

  it("a teacher who doesn't teach the course -> 403", async () => {
    const res = await teacherPost({ request: asReq("t1", { courseId: "course-b", reason: "retiring" }), env });
    expect(res.status).toBe(403);
  });

  it("a teacher who teaches the course can file a request -> 200", async () => {
    const res = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated content" }), env });
    expect(res.status).toBe(200);
    const { id } = await res.json();
    expect(env.DB.requests.get(id).status).toBe("pending");
  });

  it("admin can file a request for any course", async () => {
    const res = await teacherPost({ request: asReq("admin1", { courseId: "course-z", reason: "duplicate" }), env });
    expect(res.status).toBe(200);
  });

  it("a second pending request for the same course is rejected -> 409", async () => {
    await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "first" }), env });
    const res = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "second" }), env });
    expect(res.status).toBe(409);
  });

  it("a teacher sees only their own requests via GET", async () => {
    await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "r1" }), env });
    env.DB.courseTeachers.add("course-c|t2");
    await teacherPost({ request: asReq("t2", { courseId: "course-c", reason: "r2" }), env });
    const res = await teacherGet({ request: asReq("t1", undefined, "http://localhost/api/teacher/archive-request"), env });
    const { requests } = await res.json();
    expect(requests).toHaveLength(1);
    expect(requests[0].course_id).toBe("course-a");
  });

  it("non-admin cannot see the admin pending queue", async () => {
    const res = await adminGet({ request: asReq("t1", undefined, "http://localhost/api/admin/archive-requests"), env });
    expect(res.status).toBe(403);
  });

  it("admin sees pending requests with the requester's identity", async () => {
    await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const res = await adminGet({ request: asReq("admin1", undefined, "http://localhost/api/admin/archive-requests"), env });
    expect(res.status).toBe(200);
    const { requests } = await res.json();
    expect(requests).toHaveLength(1);
    expect(requests[0].email).toBe("t1@example.com");
  });

  it("admin approves a request -> status becomes approved", async () => {
    const create = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const { id } = await create.json();
    const res = await adminPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/admin/archive-requests"), env });
    expect(res.status).toBe(200);
    expect(env.DB.requests.get(id).status).toBe("approved");
  });

  it("admin denies a request -> status becomes denied", async () => {
    const create = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const { id } = await create.json();
    await adminPost({ request: asReq("admin1", { id, decision: "deny" }, "http://localhost/api/admin/archive-requests"), env });
    expect(env.DB.requests.get(id).status).toBe("denied");
  });

  it("cannot mark_archived a request that isn't approved yet", async () => {
    const create = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const { id } = await create.json();
    const res = await adminPost({ request: asReq("admin1", { id, decision: "mark_archived" }, "http://localhost/api/admin/archive-requests"), env });
    expect(res.status).toBe(400);
  });

  it("mark_archived after approval -> terminal 'archived' status", async () => {
    const create = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const { id } = await create.json();
    await adminPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/admin/archive-requests"), env });
    const res = await adminPost({ request: asReq("admin1", { id, decision: "mark_archived" }, "http://localhost/api/admin/archive-requests"), env });
    expect(res.status).toBe(200);
    expect(env.DB.requests.get(id).status).toBe("archived");
  });

  it("cannot re-decide an already-decided request", async () => {
    const create = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const { id } = await create.json();
    await adminPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/admin/archive-requests"), env });
    const res = await adminPost({ request: asReq("admin1", { id, decision: "deny" }, "http://localhost/api/admin/archive-requests"), env });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/archive-requests-export", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
    seedUser(env, { id: "t1" });
    seedUser(env, { id: "admin1", role: "admin" });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
    env.DB.courseTeachers.add("course-a|t1");
  });

  it("no auth -> 401/403", async () => {
    const res = await exportGet({ request: req({ url: "http://localhost/api/admin/archive-requests-export" }), env });
    expect(res.status).not.toBe(200);
  });

  it("admin session works", async () => {
    const res = await exportGet({ request: asReq("admin1", undefined, "http://localhost/api/admin/archive-requests-export"), env });
    expect(res.status).toBe(200);
  });

  it("Bearer EXPORT_TOKEN works without a session, and returns only approved requests", async () => {
    const create = await teacherPost({ request: asReq("t1", { courseId: "course-a", reason: "outdated" }), env });
    const { id } = await create.json();
    await adminPost({ request: asReq("admin1", { id, decision: "approve" }, "http://localhost/api/admin/archive-requests"), env });

    const request = new Request("http://localhost/api/admin/archive-requests-export", { headers: { Authorization: "Bearer test-export-token" } });
    const res = await exportGet({ request, env });
    expect(res.status).toBe(200);
    const { requests } = await res.json();
    expect(requests).toEqual([{ id, course_id: "course-a" }]);
  });

  it("wrong Bearer token falls back to session auth and is rejected without one", async () => {
    const request = new Request("http://localhost/api/admin/archive-requests-export", { headers: { Authorization: "Bearer wrong" } });
    const res = await exportGet({ request, env });
    expect(res.status).not.toBe(200);
  });
});

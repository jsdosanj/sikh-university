// admin/users.js's reviewer-flag grant/revoke extension, and discussions/
// moderate.js's resolve_report action (Workstream F admin surfaces).
import { describe, it, expect, beforeEach } from "vitest";
import { onRequestPost as usersPost } from "../functions/api/admin/users.js";
import { onRequestPost as moderatePost } from "../functions/api/discussions/moderate.js";
import { req } from "./helpers";

function fakeDB() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const userMfa = new Map<string, any>();
  const userFlags = new Set<string>();
  const discussions = new Map<string, any>();
  const reports = new Map<string, any>(); // `${message_id}|${user_id}`

  function handleFirst(sql: string, b: any[]) {
    if (sql.includes("FROM sessions s JOIN users u")) {
      const [sid, now] = b;
      const s = sessions.get(sid);
      if (!s || s.expires_at <= now) return null;
      const u = users.get(s.user_id);
      return u ? { id: u.id, email: u.email, name: u.name, role: u.role, mfa_ok: s.mfa_ok } : null;
    }
    if (sql.includes("SELECT enabled_at FROM user_mfa")) { const r = userMfa.get(b[0]); return r ? { enabled_at: r.enabled_at } : null; }
    if (sql.includes("SELECT course_id, parent_id FROM discussions")) {
      const d = discussions.get(b[0]);
      return d ? { course_id: d.course_id, parent_id: d.parent_id } : null;
    }
    return null;
  }
  function handleRun(sql: string, b: any[]) {
    if (sql.startsWith("CREATE TABLE")) return { success: true };
    if (sql.includes("INSERT INTO user_flags")) { userFlags.add(`${b[0]}|${b[1]}`); return { success: true }; }
    if (sql.includes("DELETE FROM user_flags WHERE user_id=? AND flag=?")) { userFlags.delete(`${b[0]}|${b[1]}`); return { success: true }; }
    if (sql.includes("UPDATE discussion_reports SET status='resolved'")) {
      for (const key of [...reports.keys()]) if (key.startsWith(b[0] + "|")) reports.get(key).status = "resolved";
      return { success: true };
    }
    return { success: true };
  }
  function prepare(sql: string) {
    let bound: any[] = [];
    const self = {
      bind(...args: any[]) { bound = args; return self; },
      async first() { return handleFirst(sql, bound); },
      async run() { return handleRun(sql, bound); },
      async all() { return { results: [] }; },
    };
    return self;
  }
  return { prepare, users, sessions, userMfa, userFlags, discussions, reports };
}

function makeEnv() { return { DB: fakeDB() }; }
function seedUser(env: any, { id, role = "teacher", mfaOk = 1 }: any) {
  env.DB.users.set(id, { id, email: id + "@example.com", name: id, role });
  env.DB.sessions.set("sid-" + id, { user_id: id, expires_at: Date.now() + 100000, mfa_ok: mfaOk });
}
function asReq(id: string, body: unknown, url = "http://localhost/api/admin/users") { return req({ url, cookie: "sid-" + id, body }); }

describe("reviewer flag grant/revoke", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
    seedUser(env, { id: "admin1", role: "admin", mfaOk: 1 });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
    seedUser(env, { id: "t1", role: "teacher" });
  });

  it("grants then revokes the reviewer flag", async () => {
    const grant = await usersPost({ request: asReq("admin1", { id: "t1", flag: "reviewer", action: "grant" }), env });
    expect(grant.status).toBe(200);
    expect(env.DB.userFlags.has("t1|reviewer")).toBe(true);

    const revoke = await usersPost({ request: asReq("admin1", { id: "t1", flag: "reviewer", action: "revoke" }), env });
    expect(revoke.status).toBe(200);
    expect(env.DB.userFlags.has("t1|reviewer")).toBe(false);
  });

  it("rejects an unknown flag", async () => {
    const res = await usersPost({ request: asReq("admin1", { id: "t1", flag: "superadmin", action: "grant" }), env });
    expect(res.status).toBe(400);
  });

  it("a non-admin cannot grant flags", async () => {
    const res = await usersPost({ request: asReq("t1", { id: "t1", flag: "reviewer", action: "grant" }), env });
    expect(res.status).toBe(403);
  });
});

describe("resolve_report action", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
    seedUser(env, { id: "admin1", role: "admin", mfaOk: 1 });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
    seedUser(env, { id: "t1", role: "teacher" });
    env.DB.discussions.set("m1", { course_id: "course-x", parent_id: null });
    env.DB.reports.set("m1|s1", { message_id: "m1", user_id: "s1", status: "open" });
  });

  it("admin can resolve a report without hiding the message", async () => {
    const res = await moderatePost({ request: asReq("admin1", { id: "m1", action: "resolve_report" }, "http://localhost/api/discussions/moderate"), env });
    expect(res.status).toBe(200);
    expect(env.DB.reports.get("m1|s1").status).toBe("resolved");
  });

  it("a course teacher (non-admin) cannot resolve_report", async () => {
    const res = await moderatePost({ request: asReq("t1", { id: "m1", action: "resolve_report" }, "http://localhost/api/discussions/moderate"), env });
    expect(res.status).toBe(403);
  });
});

import { describe, it, expect } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/cohorts.js";
import { mockEnv, req, LEARNER, TEACHER, ADMIN } from "./helpers";

const call = (fn: any, env: any, request: any) => fn({ request, env });

describe("GET /api/cohorts authz", () => {
  it("anonymous -> 403", async () => {
    const res = await call(onRequestGet, mockEnv({ user: null }), req({ url: "http://x/api/cohorts" }));
    expect(res.status).toBe(403);
  });
  it("learner -> 403", async () => {
    const res = await call(onRequestGet, mockEnv({ user: LEARNER }), req({ url: "http://x/api/cohorts", cookie: "s" }));
    expect(res.status).toBe(403);
  });
  it("teacher listing their cohorts -> 200", async () => {
    const env = mockEnv({ user: TEACHER, rows: [] });
    const res = await call(onRequestGet, env, req({ url: "http://x/api/cohorts", cookie: "s" }));
    expect(res.status).toBe(200);
    expect((await res.json()).cohorts).toEqual([]);
  });
  it("teacher cannot view a roster they don't own -> 403", async () => {
    const env = mockEnv({ user: TEACHER, cohortById: { id: "c1", owner_id: "someone-else", course_id: "x" } });
    const res = await call(onRequestGet, env, req({ url: "http://x/api/cohorts?id=c1", cookie: "s" }));
    expect(res.status).toBe(403);
  });
  it("unknown cohort id -> 404", async () => {
    const env = mockEnv({ user: ADMIN, cohortById: null });
    const res = await call(onRequestGet, env, req({ url: "http://x/api/cohorts?id=nope", cookie: "s" }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/cohorts create", () => {
  it("learner cannot create -> 403", async () => {
    const res = await call(onRequestPost, mockEnv({ user: LEARNER }), req({ cookie: "s", body: { action: "create", courseId: "c", name: "n" } }));
    expect(res.status).toBe(403);
  });
  it("missing course/name -> 400", async () => {
    const res = await call(onRequestPost, mockEnv({ user: TEACHER }), req({ cookie: "s", body: { action: "create", courseId: "", name: "" } }));
    expect(res.status).toBe(400);
  });
  it("teacher who does not teach the course -> 403", async () => {
    const env = mockEnv({ user: TEACHER, ownsCourse: false });
    const res = await call(onRequestPost, env, req({ cookie: "s", body: { action: "create", courseId: "c", name: "Camp A" } }));
    expect(res.status).toBe(403);
  });
  it("teacher who teaches the course -> creates with an invite code", async () => {
    const env = mockEnv({ user: TEACHER, ownsCourse: true });
    const res = await call(onRequestPost, env, req({ cookie: "s", body: { action: "create", courseId: "c", name: "Camp A" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.inviteCode).toMatch(/^[0-9A-F]{6}$/);
  });
  it("admin can create for any course", async () => {
    const env = mockEnv({ user: ADMIN, ownsCourse: false });
    const res = await call(onRequestPost, env, req({ cookie: "s", body: { action: "create", courseId: "c", name: "Camp" } }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cohorts join", () => {
  it("anonymous -> 401", async () => {
    const res = await call(onRequestPost, mockEnv({ user: null }), req({ body: { action: "join", code: "ABCDEF" } }));
    expect(res.status).toBe(401);
  });
  it("empty code -> 400", async () => {
    const res = await call(onRequestPost, mockEnv({ user: LEARNER }), req({ cookie: "s", body: { action: "join", code: "" } }));
    expect(res.status).toBe(400);
  });
  it("unknown code -> 404", async () => {
    const env = mockEnv({ user: LEARNER, cohortByCode: null });
    const res = await call(onRequestPost, env, req({ cookie: "s", body: { action: "join", code: "ZZZZZZ" } }));
    expect(res.status).toBe(404);
  });
  it("valid code -> joins and reports the course", async () => {
    const env = mockEnv({ user: LEARNER, cohortByCode: { id: "co1", course_id: "found-crs", name: "Camp A" } });
    const res = await call(onRequestPost, env, req({ cookie: "s", body: { action: "join", code: "ABCDEF" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.courseId).toBe("found-crs");
  });
  it("unknown action -> 400", async () => {
    const res = await call(onRequestPost, mockEnv({ user: LEARNER }), req({ cookie: "s", body: { action: "wat" } }));
    expect(res.status).toBe(400);
  });
});

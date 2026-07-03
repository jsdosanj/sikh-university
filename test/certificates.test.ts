import { describe, it, expect } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/certificates.js";
import { mockEnv, req, LEARNER } from "./helpers";

// INVARIANTS 3 & 4: certificate issuance requires a real, server-verified pass;
// verification must never call a genuine certificate "invalid" during a DB outage.
describe("POST /api/certificates — issuance gate", () => {
  const COURSE = "ai-foundations";

  it("signed-out → 401", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", body: { courseId: COURSE } }),
      env: mockEnv(), // no user
    });
    expect(res.status).toBe(401);
  });

  it("signed-in but no passing progress (null) → 403", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", cookie: "sess-learner", body: { courseId: COURSE } }),
      env: mockEnv({ user: LEARNER, progress: null }),
    });
    expect(res.status).toBe(403);
  });

  it("signed-in but passed_score < 80 → 403", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", cookie: "sess-learner", body: { courseId: COURSE } }),
      env: mockEnv({ user: LEARNER, progress: { passed_score: 50 } }),
    });
    expect(res.status).toBe(403);
  });

  it("signed-in with passed_score >= 80 → issues an SU- id", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", cookie: "sess-learner", body: { courseId: COURSE } }),
      env: mockEnv({ user: LEARNER, progress: { passed_score: 90 } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.id).toBe("string");
    expect(body.id.startsWith("SU-")).toBe(true);
  });

  it("a second POST returns the SAME existing id (idempotent)", async () => {
    // Reuse ONE env so the mock's certificate store persists between calls.
    const env = mockEnv({ user: LEARNER, progress: { passed_score: 90 } });
    const first = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", cookie: "sess-learner", body: { courseId: COURSE } }),
      env,
    });
    const firstBody = await first.json();

    const second = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", cookie: "sess-learner", body: { courseId: COURSE } }),
      env,
    });
    const secondBody = await second.json();

    expect(second.status).toBe(200);
    expect(secondBody.id).toBe(firstBody.id);
  });
});

describe("GET /api/certificates — public verification", () => {
  it("unknown id → { valid:false } with HTTP 200", async () => {
    const res = await onRequestGet({
      request: req({ url: "http://localhost/api/certificates?id=SU-DOESNOTEX" }),
      env: mockEnv(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("no id → { valid:false }", async () => {
    const res = await onRequestGet({
      request: req({ url: "http://localhost/api/certificates" }),
      env: mockEnv(),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).valid).toBe(false);
  });

  it("a real issued id verifies as valid:true", async () => {
    const env = mockEnv({ user: LEARNER, progress: { passed_score: 88 } });
    const issued = await onRequestPost({
      request: req({ url: "http://localhost/api/certificates", cookie: "sess-learner", body: { courseId: "ai-foundations", name: "Test Learner" } }),
      env,
    });
    const { id } = await issued.json();
    const res = await onRequestGet({
      request: req({ url: `http://localhost/api/certificates?id=${id}` }),
      env, // same env → same certificate store
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.courseId).toBe("ai-foundations");
  });

  // REGRESSION GUARD (invariant 4): a DB outage must NOT declare a genuine
  // certificate invalid on the public trust surface. It must signal 503
  // "cannot_check", never { valid:false }.
  it("DB outage → HTTP 503 { error:'cannot_check' }, NOT { valid:false }", async () => {
    const res = await onRequestGet({
      request: req({ url: "http://localhost/api/certificates?id=SU-REAL123" }),
      env: mockEnv({ dbThrows: true }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("cannot_check");
    expect(body.valid).toBeUndefined();
  });
});

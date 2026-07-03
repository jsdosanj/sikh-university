import { describe, it, expect } from "vitest";
import { onRequestPost } from "../functions/api/quiz.js";
import { QUIZ_KEYS } from "../functions/api/_quiz-keys.js";
import { mockEnv, req } from "./helpers";

// INVARIANT 1: server-side grading. Answers are never sent to the browser, so a
// client cannot forge a score (and thus a certificate). Anonymous grading works.
describe("POST /api/quiz — server-side grading", () => {
  const COURSE = "ai-foundations";
  const KEY = QUIZ_KEYS[COURSE]; // [1,2,0,1,2,3]

  it("all-correct answers → passed:true, score 100 (anonymous, no user)", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/quiz", body: { courseId: COURSE, answers: KEY.slice() } }),
      env: mockEnv(), // no user configured — pure anonymous path, never touches DB
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.passed).toBe(true);
    expect(body.score).toBe(100);
    expect(body.correct).toBe(KEY.length);
    expect(body.total).toBe(KEY.length);
    expect(body.signedIn).toBe(false);
  });

  it("wrong answers → passed:false, score < 80", async () => {
    // Shift every answer off the key so (almost) nothing matches.
    const wrong = KEY.map((k: number) => (k === 0 ? 9 : 0));
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/quiz", body: { courseId: COURSE, answers: wrong } }),
      env: mockEnv(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.passed).toBe(false);
    expect(body.score).toBeLessThan(80);
  });

  it("unknown courseId → 404", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/quiz", body: { courseId: "no-such-course", answers: [] } }),
      env: mockEnv(),
    });
    expect(res.status).toBe(404);
  });

  it("missing courseId → 404 (no key to grade against)", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/quiz", body: { answers: [1, 2, 0] } }),
      env: mockEnv(),
    });
    expect(res.status).toBe(404);
  });

  it("malformed JSON body → 400", async () => {
    const res = await onRequestPost({
      request: req({ url: "http://localhost/api/quiz", body: "{not json", method: "POST" }),
      env: mockEnv(),
    });
    expect(res.status).toBe(400);
  });
});

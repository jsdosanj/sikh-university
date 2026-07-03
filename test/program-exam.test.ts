import { describe, it, expect } from "vitest";
import { onRequestPost } from "../functions/api/program-exam.js";
import { QUIZ_KEYS } from "../functions/api/_quiz-keys.js";
import { mockEnv, req } from "./helpers";

// INVARIANT 2: program exam grades submitted {cid,qi,sel} tuples against the
// secret QUIZ_KEYS on the server. Unknown/out-of-range tuples are silently
// skipped (not counted), empty items → 400.
describe("POST /api/program-exam — cumulative exam grading", () => {
  const COURSE = "ai-foundations";
  const KEY = QUIZ_KEYS[COURSE]; // [1,2,0,1,2,3]

  const call = (body: unknown) =>
    onRequestPost({ request: req({ url: "http://localhost/api/program-exam", body }), env: mockEnv() });

  it("a correct tuple → passed:true (default passMark 70)", async () => {
    const res = await call({ items: [{ cid: COURSE, qi: 0, sel: KEY[0] }] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.correct).toBe(1);
    expect(body.score).toBe(100);
    expect(body.passed).toBe(true);
  });

  it("a wrong tuple → passed:false", async () => {
    const res = await call({ items: [{ cid: COURSE, qi: 0, sel: KEY[0] === 0 ? 9 : 0 }] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.correct).toBe(0);
    expect(body.passed).toBe(false);
  });

  it("empty items → 400", async () => {
    const res = await call({ items: [] });
    expect(res.status).toBe(400);
  });

  it("missing items → 400", async () => {
    const res = await call({ passMark: 70 });
    expect(res.status).toBe(400);
  });

  it("unknown cid is skipped, not counted against the score", async () => {
    // One valid correct tuple + one with an unknown course id.
    const res = await call({
      items: [
        { cid: COURSE, qi: 0, sel: KEY[0] }, // correct
        { cid: "no-such-course", qi: 0, sel: 0 }, // skipped
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1); // unknown cid did NOT add to the denominator
    expect(body.correct).toBe(1);
    expect(body.score).toBe(100);
    expect(body.passed).toBe(true);
  });

  it("out-of-range qi is skipped, not counted", async () => {
    const res = await call({
      items: [
        { cid: COURSE, qi: 0, sel: KEY[0] }, // correct
        { cid: COURSE, qi: 999, sel: 0 }, // qi out of range → skipped
      ],
    });
    const body = await res.json();
    expect(body.total).toBe(1);
  });

  it("only unknown/ungradable tuples → 400 (no gradable questions)", async () => {
    const res = await call({ items: [{ cid: "no-such-course", qi: 0, sel: 0 }] });
    expect(res.status).toBe(400);
  });

  it("passMark is honored: a 100% score fails when passMark exceeds 100-capable range only via clamp", async () => {
    // passMark clamps to [1,100]; a perfect score passes any valid mark.
    const res = await call({ items: [{ cid: COURSE, qi: 0, sel: KEY[0] }], passMark: 100 });
    const body = await res.json();
    expect(body.score).toBe(100);
    expect(body.passed).toBe(true);
  });
});

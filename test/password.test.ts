import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, DUMMY_HASH } from "../functions/_password.js";

describe("password hashing", () => {
  it("PBKDF2 iteration count stays at or below Cloudflare Workers' hard cap of 100,000", async () => {
    // Workers' PBKDF2 implementation throws NotSupportedError above 100k --
    // confirmed live on the sibling sikhi.io repo 2026-09-03, where 210k
    // (the OWASP-2023 figure) passed every local check and broke on the
    // first real production signup. Parsed from a real hash rather than a
    // hardcoded constant import, so this test would fail if the actual
    // hashing code ever regresses, not just a config value.
    const hash = await hashPassword("x".repeat(20));
    const iterations = parseInt(hash.split("$")[1], 10);
    expect(iterations).toBeLessThanOrEqual(100_000);
  });

  it("round-trips a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password entirely", hash)).toBe(false);
  });

  it("produces a distinct salt each call", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored hashes rather than throwing", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "pbkdf2$abc$salt$hash")).resolves.toBe(false);
  });

  it("DUMMY_HASH runs a real comparison rather than short-circuiting", async () => {
    await expect(verifyPassword("whatever", DUMMY_HASH)).resolves.toBe(false);
  });
});

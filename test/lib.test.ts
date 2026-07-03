import { describe, it, expect } from "vitest";
import { isAdminEmail, getUser } from "../functions/api/_lib.js";
import { mockEnv, req, ADMIN } from "./helpers";

// INVARIANT 6: isAdminEmail is the single source of admin identity. It must match
// ONLY emails in env.ADMIN_EMAILS, case-insensitively and trimmed.
describe("isAdminEmail", () => {
  const env = { ADMIN_EMAILS: "admin@example.com, Boss@Example.COM" };

  it("returns true for a listed email (exact)", () => {
    expect(isAdminEmail(env, "admin@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAdminEmail(env, "ADMIN@EXAMPLE.COM")).toBe(true);
  });

  it("trims surrounding whitespace in the list entries", () => {
    // "Boss@Example.COM" has a leading space in the list; still matches.
    expect(isAdminEmail(env, "boss@example.com")).toBe(true);
  });

  it("returns false for a non-listed email", () => {
    expect(isAdminEmail(env, "nobody@example.com")).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty/undefined", () => {
    expect(isAdminEmail({}, "admin@example.com")).toBe(false);
    expect(isAdminEmail({ ADMIN_EMAILS: "" }, "admin@example.com")).toBe(false);
  });

  it("returns false for a null/empty email", () => {
    expect(isAdminEmail(env, null as any)).toBe(false);
    expect(isAdminEmail(env, "")).toBe(false);
  });
});

// getUser: no cookie → null without touching the DB; a valid session → the joined
// user row. This underpins every authz gate.
describe("getUser", () => {
  it("no session cookie → null (does not query the DB)", async () => {
    // dbThrows:true proves getUser short-circuits before any DB call.
    const user = await getUser(mockEnv({ dbThrows: true }), req({ url: "http://localhost/api/me" }));
    expect(user).toBeNull();
  });

  it("valid session cookie → resolves the joined user row", async () => {
    const user = await getUser(
      mockEnv({ user: ADMIN }),
      req({ url: "http://localhost/api/me", cookie: "sess-admin" })
    );
    expect(user).not.toBeNull();
    expect(user.role).toBe("admin");
    expect(user.email).toBe(ADMIN.email);
  });
});

import { describe, it, expect } from "vitest";
import { onRequestGet as usersGet } from "../functions/api/admin/users.js";
import { onRequestGet as statsGet } from "../functions/api/admin/stats.js";
import { onRequestGet as applicationsGet } from "../functions/api/admin/applications.js";
import { mockEnv, req, LEARNER, ADMIN } from "./helpers";

// INVARIANT 5: admin endpoints must reject anonymous and non-admin callers.
//
// NOTE: these handlers gate on the joined user row's `role` column
// (`user.role !== "admin"`), NOT on isAdminEmail/ADMIN_EMAILS. So the security
// boundary here is the DB role, and an "admin user" for these routes is one
// whose users.role === "admin". We assert that CURRENT behavior. ADMIN_EMAILS is
// what promotes an account to the admin role at login time (elsewhere), not what
// these routes check.
const ADMIN_ENDPOINTS: Array<[string, (a: any) => Promise<Response>]> = [
  ["admin/users GET", usersGet as any],
  ["admin/stats GET", statsGet as any],
  ["admin/applications GET", applicationsGet as any],
];

describe.each(ADMIN_ENDPOINTS)("%s — authz", (_name, handler) => {
  it("anonymous (no session) → 403", async () => {
    const res = await handler({
      request: req({ url: "http://localhost/api/admin" }),
      env: mockEnv({ adminEmails: "admin@example.com" }),
    });
    expect(res.status).toBe(403);
  });

  it("non-admin learner → 403", async () => {
    const res = await handler({
      request: req({ url: "http://localhost/api/admin", cookie: "sess-learner" }),
      env: mockEnv({ user: LEARNER, adminEmails: "admin@example.com" }),
    });
    expect(res.status).toBe(403);
  });

  it("admin user → not 403 (200)", async () => {
    const res = await handler({
      request: req({ url: "http://localhost/api/admin", cookie: "sess-admin" }),
      env: mockEnv({ user: ADMIN, adminEmails: "admin@example.com", rows: [] }),
    });
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});

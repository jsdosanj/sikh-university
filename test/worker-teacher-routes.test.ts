// worker.js-level regression tests for the Workstream A/B additions. Kept to
// paths that DON'T invoke HTMLRewriter (a Workers-only global, unavailable in
// this plain-Node vitest environment) — i.e. the "no matching profile" and
// "no session" branches, which is exactly where a routing/fallback bug would
// most likely hide. The profile-found + HTMLRewriter path is verified
// separately via `wrangler dev` (see CONTRIBUTING.md manual verification loop).
import { describe, it, expect } from "vitest";
import worker from "../worker.js";

const htmlAssets = { fetch: async () => new Response("<!doctype html>not found", { status: 404, headers: { "content-type": "text/html" } }) };

function stubDB(overrides: Record<string, any> = {}) {
  return {
    prepare(sql: string) {
      let bound: any[] = [];
      return {
        bind(...args: any[]) { bound = args; return this; },
        async first() {
          for (const [pattern, value] of Object.entries(overrides.first || {})) {
            if (sql.includes(pattern)) return typeof value === "function" ? value(bound) : value;
          }
          return null;
        },
        async all() {
          for (const [pattern, value] of Object.entries(overrides.all || {})) {
            if (sql.includes(pattern)) return { results: typeof value === "function" ? value(bound) : value };
          }
          return { results: [] };
        },
        async run() { return { success: true }; },
      };
    },
  };
}

describe("/teacher/:slug — falls through safely on no match (never touches HTMLRewriter)", () => {
  it("unknown slug falls through to the Astro 404", async () => {
    const res = await worker.fetch(
      new Request("https://sikhiuni.com/teacher/no-such-teacher"),
      { ASSETS: htmlAssets, DB: stubDB() },
    );
    expect(res.status).toBe(404);
  });

  it("a slug with invalid characters is rejected before any DB lookup", async () => {
    const res = await worker.fetch(
      new Request("https://sikhiuni.com/teacher/../../etc"),
      { ASSETS: htmlAssets, DB: stubDB() },
    );
    expect(res.status).toBe(404);
  });
});

describe("/sitemaps/teachers.xml", () => {
  it("returns an XML urlset built from public profiles", async () => {
    const res = await worker.fetch(
      new Request("https://sikhiuni.com/sitemaps/teachers.xml"),
      { ASSETS: htmlAssets, DB: stubDB({ all: { "FROM teacher_profiles WHERE is_public=1": [{ slug: "t1", updated_at: 1700000000000 }] } }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");
    const body = await res.text();
    expect(body).toContain("<loc>https://sikhiuni.com/teacher/t1</loc>");
  });
});

describe("/media/ allowlist regression lock", () => {
  it("never serves anything under uploads/ — that prefix is private-by-construction, accessible only via /api/asset", async () => {
    const res = await worker.fetch(
      new Request("https://sikhiuni.com/media/uploads/some-user/profile/secret.jpg"),
      { ASSETS: htmlAssets, MEDIA: { get: async () => { throw new Error("should never be called for uploads/"); } } },
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT is routed generically (no special-casing needed for /api/upload/part)", () => {
  it("dispatches PUT /api/upload/part to its handler (401 with no session, not 405)", async () => {
    const res = await worker.fetch(
      new Request("https://sikhiuni.com/api/upload/part?key=uploads/x/y/z.mp4&uploadId=abc&partNumber=1", { method: "PUT", body: "chunk" }),
      { ASSETS: htmlAssets, DB: stubDB() },
    );
    expect(res.status).not.toBe(405);
    expect(res.status).toBe(401);
  });
});

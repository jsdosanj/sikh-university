import { describe, it, expect } from "vitest";
import worker from "../worker.js";

// INVARIANT: the site's canonical origin is https://sikhiuni.com. Any request
// reaching the Worker on a legacy production hostname must 301 to the canonical
// origin with path + query preserved, so old links and search results carry
// over. Dev/preview hosts must NOT be redirected.

const htmlAssets = {
  fetch: async () =>
    new Response("<!doctype html>ok", { headers: { "content-type": "text/html" } }),
};

describe("canonical-host redirect", () => {
  it("301s the old custom domain to sikhiuni.com, preserving path + query", async () => {
    const res = await worker.fetch(
      new Request("https://sikh-university.dosanjhlabs.com/course/abc?x=1&y=2"),
      { ASSETS: htmlAssets },
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://sikhiuni.com/course/abc?x=1&y=2");
  });

  it("301s the bare workers.dev alias", async () => {
    const res = await worker.fetch(
      new Request("https://sikh-university.jasvant-dosanjh.workers.dev/"),
      { ASSETS: htmlAssets },
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://sikhiuni.com/");
  });

  it("redirects API paths on a legacy host too (clients live on the new origin)", async () => {
    const res = await worker.fetch(
      new Request("https://sikh-university.dosanjhlabs.com/api/health"),
      { ASSETS: htmlAssets },
    );
    expect(res.status).toBe(301);
  });

  it("serves the canonical host without redirecting", async () => {
    const res = await worker.fetch(new Request("https://sikhiuni.com/"), {
      ASSETS: htmlAssets,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("TDM-Policy")).toBe("https://sikhiuni.com/ai-policy");
  });

  it("leaves dev/preview hosts alone (localhost keeps working under wrangler dev)", async () => {
    const res = await worker.fetch(new Request("http://localhost:8787/"), {
      ASSETS: htmlAssets,
    });
    expect(res.status).toBe(200);
  });
});

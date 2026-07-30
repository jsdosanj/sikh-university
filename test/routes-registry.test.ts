// Static consistency check: every handler file under functions/api/** (excluding
// _-prefixed shared modules) must be both imported by worker.js AND registered as
// a value in its `routes` map under some "/api/..." key. This is a text-scan
// against the real worker.js source, not a runtime test — it exists to catch the
// "wrote a handler, forgot to register it" mistake the plan calls out repeatedly.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "functions", "api");
const WORKER_SRC = readFileSync(path.join(ROOT, "worker.js"), "utf-8");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) { out.push(...walk(full)); continue; }
    if (name.startsWith("_") || !name.endsWith(".js")) continue;
    out.push(full);
  }
  return out;
}

const handlerFiles = walk(API_DIR);

describe("every functions/api handler is imported by worker.js", () => {
  it.each(handlerFiles)("%s", (file) => {
    const rel = "./" + path.relative(ROOT, file).replace(/\\/g, "/");
    const source = readFileSync(file, "utf-8");
    const exportsHandler = /export\s+(async\s+)?function\s+onRequest(Get|Post)/.test(source);
    if (!exportsHandler) return; // not a route handler (shouldn't happen given the _-prefix convention, but don't false-fail)
    expect(WORKER_SRC.includes(rel)).toBe(true);
  });
});

describe("routes map covers every registered import", () => {
  it("every imported onRequestGet/onRequestPost alias is used as a route value", () => {
    // Only handler imports (aliased from onRequestGet/onRequestPost, from a
    // non-underscore-prefixed module) need to be registered — shared helper
    // imports (e.g. from a _-prefixed module like _teacher-page.js) don't.
    const importAliases = [...WORKER_SRC.matchAll(/import\s*{([^}]+)}\s*from\s*"(\.\/functions\/api\/[^"]+)"/g)]
      .filter((m) => !path.basename(m[2]).startsWith("_"))
      .flatMap((m) => m[1].split(","))
      .map((s) => s.trim())
      .filter((s) => /^onRequest(Get|Post)\s+as\s+\w+$/.test(s))
      .map((s) => s.split(" as ")[1].trim());
    const routesBlockMatch = WORKER_SRC.match(/const routes = \{([\s\S]*?)\n\};/);
    expect(routesBlockMatch).not.toBeNull();
    const routesBlock = routesBlockMatch![1];
    const missing = importAliases.filter((alias) => !routesBlock.includes(alias));
    expect(missing).toEqual([]);
  });
});

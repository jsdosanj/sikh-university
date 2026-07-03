import { defineConfig } from "vitest/config";

// Plain vitest (node environment). Handlers are imported directly and exercised
// against a hand-built mock `env` — no miniflare/D1, so runs are deterministic
// and cannot flake in CI. See test/helpers.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,mjs,js}"],
  },
});

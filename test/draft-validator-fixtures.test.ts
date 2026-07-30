import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { validateDraft } from "../functions/api/_draft-validate.js";

// Shared fixtures also run through scripts/validate_draft.py in
// scripts/check_draft_validator_parity.py — CI fails if either side's
// verdict on a fixture ever drifts from the expected list below.
const FIXTURES_DIR = join(__dirname, "fixtures", "draft-validation");
const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));

describe("validateDraft — shared fixture parity with scripts/validate_draft.py", () => {
  it("found fixture files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: matches expected verdict`, () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf-8"));
      const errors = validateDraft(
        { draft: fixture.draft, lessons: fixture.lessons, quiz: fixture.quiz },
        fixture.topicIds
      );
      expect(errors).toEqual(fixture.expectErrors);
      expect(errors.length === 0).toBe(fixture.expectValid);
    });
  }
});

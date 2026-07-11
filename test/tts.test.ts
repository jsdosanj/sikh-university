import { describe, it, expect } from "vitest";
import { sentences } from "../web/src/lib/tts";

// The TTS engine reads chunk-by-chunk; bad splitting is audible (mid-sentence
// stops) so the splitter is pinned by tests.
describe("tts sentence splitting", () => {
  it("splits on Latin terminators", () => {
    const out = sentences("Guru Nanak Dev Ji founded Kartarpur. Sangat gathered daily! Who taught there?");
    expect(out.length).toBe(3);
    expect(out[0]).toMatch(/Kartarpur\.$/);
  });

  it("splits on Indic danda terminators (। and ॥)", () => {
    const out = sentences("ਪਹਿਲੀ ਤੁਕ ਇੱਥੇ ਹੈ ਜੀ। ਦੂਜੀ ਤੁਕ ਇੱਥੇ ਹੈ ਜੀ॥ ਤੀਜੀ ਤੁਕ ਵੀ ਹੈ ਜੀ।");
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it("merges tiny fragments so playback does not stutter", () => {
    const out = sentences("Yes. No. Maybe. This is a considerably longer sentence that stands on its own feet.");
    // The three 3-5 char fragments merge together instead of producing 4 chunks.
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it("collapses whitespace and drops empties", () => {
    const out = sentences("  One   sentence\n\nhere.   ");
    expect(out).toEqual(["One sentence here."]);
  });

  it("returns [] for blank input", () => {
    expect(sentences("   ")).toEqual([]);
  });
});

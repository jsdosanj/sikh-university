// Santhya audio ⇄ ang alignment math (web/src/lib/santhya-sync.ts).
import { describe, it, expect } from "vitest";
import {
  wordWeight,
  vishramWeight,
  angWeight,
  segmentTimeline,
  angWindow,
  wordIndexAt,
  wordTime,
} from "../web/src/lib/santhya-sync";

describe("weights", () => {
  it("matches the reader's original heuristic", () => {
    // 0.6 + 0.22·len + vishram
    expect(wordWeight("ਸਤਿ")).toBeCloseTo(0.6 + 0.22 * 3);
    expect(wordWeight("॥")).toBeCloseTo(0.6 + 3.2); // danda strips to len 0 + pause
    expect(vishramWeight("ਹੈ;")).toBe(1.6);
  });

  it("angWeight sums every token across lines, ignoring blanks", () => {
    const one = angWeight(["ਇਕ ਦੋ"]);
    expect(one).toBeCloseTo(wordWeight("ਇਕ") + wordWeight("ਦੋ"));
    expect(angWeight(["ਇਕ ਦੋ", "", "  "])).toBeCloseTo(one);
  });
});

describe("segmentTimeline", () => {
  it("splits the track proportionally to ang weights", () => {
    // segment covers angs 10..12 with weights 1,2,1 → fractions 0, .25, .75
    const tl = segmentTimeline(10, [1, 2, 1]);
    expect(tl.startFraction(10)).toBeCloseTo(0);
    expect(tl.startFraction(11)).toBeCloseTo(0.25);
    expect(tl.endFraction(11)).toBeCloseTo(0.75);
    expect(tl.endFraction(12)).toBeCloseTo(1);
  });

  it("fills a failed ang fetch (weight 0) with the mean of the others", () => {
    const tl = segmentTimeline(1, [2, 0, 2]); // missing middle → mean 2
    expect(tl.startFraction(2)).toBeCloseTo(1 / 3);
    expect(tl.endFraction(2)).toBeCloseTo(2 / 3);
  });

  it("clamps out-of-range angs to the segment edges", () => {
    const tl = segmentTimeline(5, [1, 1]);
    expect(tl.startFraction(1)).toBe(0);
    expect(tl.endFraction(99)).toBe(1);
  });
});

describe("angWindow + wordIndexAt + wordTime", () => {
  // 100s track over angs 1..4, equal weights → ang 3 owns [50s, 75s]
  const tl = segmentTimeline(1, [1, 1, 1, 1]);
  const win = angWindow(tl, 100, 3);
  // four words of equal weight on the ang → cum [1,2,3,4]
  const cum = [1, 2, 3, 4];
  const total = 4;

  it("window lands mid-track for a mid-segment ang", () => {
    expect(win.start).toBeCloseTo(50);
    expect(win.end).toBeCloseTo(75);
  });

  it("maps playback position inside the window to the right word", () => {
    expect(wordIndexAt(50, win, cum, total)).toBe(0); // window start → first word
    expect(wordIndexAt(62, win, cum, total)).toBe(1); // 48% in → 2nd word
    expect(wordIndexAt(74.9, win, cum, total)).toBe(3); // window end → last word
  });

  it("clamps positions outside the window instead of wandering off", () => {
    expect(wordIndexAt(10, win, cum, total)).toBe(0);
    expect(wordIndexAt(99, win, cum, total)).toBe(3);
  });

  it("wordTime inverts wordIndexAt at word starts", () => {
    const t2 = wordTime(2, win, cum, total); // third word starts at cum[1]/4 = 50%
    expect(t2).toBeCloseTo(50 + 0.5 * 25);
    expect(wordIndexAt(t2 + 0.01, win, cum, total)).toBe(2);
  });

  it("degenerate inputs return safe values", () => {
    expect(wordIndexAt(60, win, [], 0)).toBe(-1);
    expect(wordTime(0, win, cum, total)).toBe(win.start);
  });
});

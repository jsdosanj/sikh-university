#!/usr/bin/env python3
"""Report how well the catalogue meets the CLAUDE.md authoring constraints.

CLAUDE.md requires each course to cite scripture by ang, carry a Works-Cited list,
and include a keywords table. Those are prose rules today; this makes them visible
as coverage numbers. It is REPORT-ONLY (always exits 0) on purpose: current coverage
is partial (many legacy courses predate the rules), so a hard gate over all 558
courses would wedge the auto-merge pipeline. The blocking ratchet — fail CI when a
*new or changed* course misses these — lands in Phase 3 alongside quote verification,
where the ang-detection heuristic is defined precisely. Run with --json for machine output.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "site/assets/data/courses.json")

CHECKS = {
    "ang_citation": re.compile(r"data-ang=|ਅੰਗ|\bAng\s*\d+", re.I),   # data-ang | ਅੰਗ | Ang N
    "works_cited": re.compile(r"works[ -]?cited|bibliography|\breferences\b", re.I),
    "keywords_table": re.compile(r"Academic Context|Term \(Unicode\)|\bKeywords\b", re.I),
}


def course_text(c):
    return " ".join(l.get("html", "") for l in c.get("lessons", []))


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    published = [c for c in data.get("courses", []) if c.get("status") == "published"]
    n = len(published) or 1
    counts = {k: 0 for k in CHECKS}
    for c in published:
        text = course_text(c)
        for k, rx in CHECKS.items():
            if rx.search(text):
                counts[k] += 1

    if "--json" in sys.argv:
        print(json.dumps({"published": len(published), "coverage": counts}))
        return

    print(f"Content coverage over {len(published)} published courses (report only):")
    for k, v in counts.items():
        print(f"  {k:16} {v:4}/{len(published)}  ({100 * v // n}%)")
    print("Blocking ratchet for new/changed courses lands in Phase 3.")


if __name__ == "__main__":
    main()

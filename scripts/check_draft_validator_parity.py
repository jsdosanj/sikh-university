#!/usr/bin/env python3
"""CI gate: run test/fixtures/draft-validation/*.json through validate_draft.py
and confirm each verdict matches the fixture's expected result. The same
fixtures are run through the real JS validator (functions/api/_draft-validate.js)
by test/draft-validator-fixtures.test.ts under vitest — passing both is what
constitutes parity; this script never calls into JS or vice versa.
"""
import json
import os
import sys

from validate_draft import validate_draft

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES_DIR = os.path.join(ROOT, "test/fixtures/draft-validation")

errors = []
fixtures = sorted(f for f in os.listdir(FIXTURES_DIR) if f.endswith(".json"))
if not fixtures:
    print(f"VALIDATION FAILED: no fixtures found in {FIXTURES_DIR}")
    sys.exit(1)

for name in fixtures:
    fixture = json.load(open(os.path.join(FIXTURES_DIR, name), encoding="utf-8"))
    got = validate_draft(
        fixture["draft"], fixture["lessons"], fixture["quiz"], fixture.get("topicIds")
    )
    want = fixture["expectErrors"]
    if got != want:
        errors.append(f"{name}: expected errors {want!r}, got {got!r}")
    if (len(got) == 0) != fixture["expectValid"]:
        errors.append(f"{name}: expected expectValid={fixture['expectValid']}, got {len(got) == 0}")

if errors:
    print("VALIDATION FAILED — Python validator drifted from expected fixture verdicts:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print(f"OK — {len(fixtures)} draft-validation fixtures matched their expected verdicts.")

#!/usr/bin/env python3
"""CI gate: validate the course catalogue (and that referenced topics exist)."""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []
def err(m): errors.append(m)

data = json.load(open(os.path.join(ROOT, "site/assets/data/courses.json"), encoding="utf-8"))
topics = {t["id"] for t in data.get("topics", [])}
ids = []
for c in data.get("courses", []):
    cid = c.get("id", "?"); ids.append(cid)
    for k in ("id", "title", "topic", "level", "professor", "status", "summary"):
        if k not in c: err(f"{cid}: missing '{k}'")
    if c.get("topic") not in topics: err(f"{cid}: unknown topic '{c.get('topic')}'")
    for ls in c.get("lessons", []):
        if "title" not in ls or "html" not in ls: err(f"{cid}: lesson missing title/html")
    for q in c.get("quiz", []):
        opts = q.get("options", [])
        if not (isinstance(opts, list) and len(opts) >= 2): err(f"{cid}: quiz options must have >=2")
        a = q.get("answer")
        if not (isinstance(a, int) and 0 <= a < len(opts)): err(f"{cid}: quiz answer out of range")

dups = [i for i, n in collections.Counter(ids).items() if n > 1]
if dups: err(f"duplicate course ids: {dups}")

# No-shrink guard: a truncated/corrupt courses.json (say, 3 courses) parses fine and
# would auto-merge over the whole catalogue. Refuse to pass if the published count
# drops below the committed floor unless the shrink is explicit.
published = len([c for c in data.get("courses", []) if c.get("status") == "published"])
try:
    baseline = json.load(open(os.path.join(ROOT, "scripts/catalogue-baseline.json"), encoding="utf-8"))
    floor = int(baseline.get("published_min", 0))
except Exception as e:
    floor = 0
    err(f"could not read scripts/catalogue-baseline.json: {e}")
if floor and published < floor and not os.environ.get("ALLOW_CATALOGUE_SHRINK"):
    err(f"published courses ({published}) fell below the floor ({floor}). "
        f"If this shrink is intentional, re-run with ALLOW_CATALOGUE_SHRINK=1 and lower "
        f"published_min in scripts/catalogue-baseline.json in the same change.")

if errors:
    print("VALIDATION FAILED:")
    for e in errors: print("  -", e)
    sys.exit(1)
print(f"OK — {len(data['courses'])} courses, {published} published, {len(topics)} topics (floor {floor}).")

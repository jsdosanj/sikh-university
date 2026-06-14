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

if errors:
    print("VALIDATION FAILED:")
    for e in errors: print("  -", e)
    sys.exit(1)
print(f"OK — {len(data['courses'])} courses, {len([c for c in data['courses'] if c['status']=='published'])} published, {len(topics)} topics.")

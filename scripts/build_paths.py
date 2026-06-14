#!/usr/bin/env python3
"""Regenerate courses.json `paths`: keep the curated cross-topic journeys, then
add a comprehensive subject path for every topic so EVERY published course is
reachable from a learning path (level-ordered)."""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "site/assets/data/courses.json"

# The hand-ordered cross-topic journeys to keep as featured paths (by id).
CURATED_IDS = ["gurbani", "foundations", "history-journey", "language",
               "spiritual-practice", "philosophy-thought", "arts-culture",
               "modern-skills", "teekas"]

# Friendlier blurbs for the per-topic subject paths (falls back to topic blurb).
TOPIC_BLURBS = {
    "theology": "From Mool Mantar to deep Gurbani exegesis — the message of the Guru Sahibs, in order.",
    "history": "Walk the Sikh story from Guru Nanak to the present, era by era.",
    "literature": "The great works of Sikh letters — poetry, prose and the modern renaissance.",
    "spirituality": "The inner path — Naam, simran and the discipline of daily devotion.",
    "philosophy": "Sikh thought from the ground up — metaphysics, ethics and worldview.",
}


def main():
    data = json.loads(SRC.read_text())
    courses = data["courses"]
    topics = data["topics"]
    by_id = {c["id"]: c for c in courses}
    pub = [c for c in courses if c.get("status") == "published"]

    old_paths = {p["id"]: p for p in data.get("paths", [])}
    paths = []

    # 1) Keep curated journeys, dropping any course ids that no longer exist.
    for pid in CURATED_IDS:
        p = old_paths.get(pid)
        if not p:
            continue
        ids = [i for i in p["courseIds"] if i in by_id]
        if ids:
            p["courseIds"] = ids
            paths.append(p)

    # 2) One comprehensive subject path per topic (every published course, by level then title).
    tname = {t["id"]: t["name"] for t in topics}
    tblurb = {t["id"]: t.get("blurb", "") for t in topics}
    for t in topics:
        tid = t["id"]
        in_topic = sorted([c for c in pub if c.get("topic") == tid],
                          key=lambda c: (c.get("level", 99), c["title"]))
        if not in_topic:
            continue
        paths.append({
            "id": "topic-" + tid,
            "name": tname[tid],
            "blurb": TOPIC_BLURBS.get(tid) or tblurb.get(tid) or f"Every {tname[tid]} course, in order.",
            "courseIds": [c["id"] for c in in_topic],
        })

    data["paths"] = paths
    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    covered = set()
    for p in paths:
        covered.update(p["courseIds"])
    pub_ids = {c["id"] for c in pub}
    print(f"paths: {len(paths)} ({len([p for p in paths if not p['id'].startswith('topic-')])} curated + "
          f"{len([p for p in paths if p['id'].startswith('topic-')])} subject)")
    print(f"coverage: {len(covered & pub_ids)} / {len(pub_ids)} published courses in a path")
    missing = pub_ids - covered
    if missing:
        print("MISSING:", sorted(missing)[:20])


if __name__ == "__main__":
    main()

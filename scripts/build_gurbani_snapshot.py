#!/usr/bin/env python3
"""Build the committed canonical-Gurbani snapshot for build-time quote verification.

Extracts every SGGS ang cited by a course (blockquote.gurbani[data-ang]) and fetches
the canonical Unicode text for that ang from BaniDB, storing a normalised copy in
scripts/gurbani-snapshot.json. That snapshot is what verify_gurbani.py matches quotes
against — deterministic and offline, so CI never depends on a live api.banidb.com call.
Re-run this only to refresh the snapshot (a scheduled job / manual step); the matcher
reads the committed file.

Usage: python3 scripts/build_gurbani_snapshot.py
"""
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "site/assets/data/courses.json")
OUT = os.path.join(ROOT, "scripts/gurbani-snapshot.json")

# SGGS is BaniDB source 1. The course blockquotes label the granth; we snapshot only
# SGGS here (Dasam/Sarbloh coverage is a later step — their quotes stay "uncovered").
SGGS_LABEL = "ਸ੍ਰੀ ਗੁਰੂ ਗਰੰਥ ਸਾਹਿਬ"


def normalise(s):
    """Normalise Gurmukhi for tolerant matching: NFC, drop dandas/verse-numbers,
    collapse whitespace. Keeps letters + vowel signs so a real text change still fails."""
    import unicodedata
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"[॥।]", " ", s)          # danda / double-danda -> space
    s = re.sub(r"[੦-੯0-9]+", " ", s)     # Gurmukhi + ASCII digits (verse numbers)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def cited_sggs_angs():
    data = json.load(open(SRC, encoding="utf-8"))
    angs = set()
    block = re.compile(r'<blockquote class="gurbani[^"]*" data-ang="(\d+)">(.*?)</blockquote>', re.S)
    for c in data.get("courses", []):
        for l in c.get("lessons", []) or []:
            for m in block.finditer(l.get("html", "")):
                ang, inner = m.group(1), m.group(2)
                # Only snapshot angs labelled SGGS (others verify as uncovered).
                if SGGS_LABEL in inner:
                    angs.add(int(ang))
    return sorted(angs)


def fetch_ang(ang):
    url = f"https://api.banidb.com/v2/angs/{ang}/1"  # source 1 = SGGS
    req = urllib.request.Request(url, headers={"User-Agent": "sikh-university-verify/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.loads(r.read())
    verses = d.get("page") or d.get("verses") or []
    text = " ".join(v.get("verse", {}).get("unicode", "") for v in verses)
    return normalise(text)


def main():
    angs = cited_sggs_angs()
    print(f"Fetching {len(angs)} cited SGGS angs from BaniDB…", file=sys.stderr)
    snap = {}
    for i, ang in enumerate(angs):
        for attempt in range(3):
            try:
                snap[str(ang)] = fetch_ang(ang)
                break
            except Exception as e:
                if attempt == 2:
                    print(f"  ang {ang}: FAILED ({e})", file=sys.stderr)
                else:
                    time.sleep(1.5)
        if (i + 1) % 25 == 0:
            print(f"  {i + 1}/{len(angs)}", file=sys.stderr)
        time.sleep(0.15)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"source": "SGGS (BaniDB source 1)", "angs": snap}, f, ensure_ascii=False)
    print(f"wrote {os.path.relpath(OUT, ROOT)} — {len(snap)}/{len(angs)} angs", file=sys.stderr)


if __name__ == "__main__":
    main()

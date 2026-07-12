#!/usr/bin/env python3
"""Attach granthRef {src, start, end, label} to courses that study a specific
bani/granth section, so the course page can render the actual text ("From the
Granth" panel) verbatim from the local ang corpus with a Santhya reader link.

The map is CURATED, not fuzzy — accuracy is sacred here: a wrong ang range
would attach the wrong scripture to a course. Ang anchors come from the reader
corpus (web/public/assets/gurbani/chapters.json + the bani table in
web/src/lib/santhya.ts). Idempotent: reruns overwrite previous granthRef.

Run:  python3 scripts/build_granth_refs.py
"""
import json

COURSES = "site/assets/data/courses.json"

# course id -> (src, start ang, end ang, label). Whole-granth survey courses
# get the full span (the panel becomes a browse-the-granth reader).
REFS = {
    # ── Sri Guru Granth Sahib Ji ─────────────────────────────────────────
    "reading-japji-sahib":        ("sggs", 1, 8, "ਜਪੁ ਜੀ ਸਾਹਿਬ · Japji Sahib"),
    "garab-ganjani-teeka":        ("sggs", 1, 8, "ਜਪੁ ਜੀ ਸਾਹਿਬ · Japji Sahib"),
    "harnam-daas-udasi":          ("sggs", 1, 8, "ਜਪੁ ਜੀ ਸਾਹਿਬ · Japji Sahib"),
    "sant-waryam-singh-japji":    ("sggs", 1, 8, "ਜਪੁ ਜੀ ਸਾਹਿਬ · Japji Sahib"),
    "japji-sahib-deep-vichar":    ("sggs", 1, 8, "ਜਪੁ ਜੀ ਸਾਹਿਬ · Japji Sahib"),
    "guru-nanak-japji-deep":      ("sggs", 1, 8, "ਜਪੁ ਜੀ ਸਾਹਿਬ · Japji Sahib"),
    "guru-amar-das-anand-sahib":  ("sggs", 917, 922, "ਅਨੰਦੁ ਸਾਹਿਬ · Anand Sahib"),
    "guru-arjan-sukhmani-sahib":  ("sggs", 262, 296, "ਸੁਖਮਨੀ ਸਾਹਿਬ · Sukhmani Sahib"),
    "guru-nanak-sidh-gosht":      ("sggs", 938, 946, "ਸਿਧ ਗੋਸਟਿ · Sidh Gosht"),
    # ── Sri Dasam Granth (Hazoor Sahib Bir corpus, 1428 angs) ───────────
    "sant-kartar-singh-nirmala":       ("dasam", 1, 10, "ਜਾਪੁ ਸਾਹਿਬ · Jaap Sahib"),
    "dasam-granth-jap-swayye-chaupai": ("dasam", 1, 10, "ਜਾਪੁ ਸਾਹਿਬ · Jaap Sahib"),
    "guru-gobind-singh-poetry-works":  ("dasam", 1, 38, "ਜਾਪੁ ਸਾਹਿਬ ਤੇ ਅਕਾਲ ਉਸਤਤਿ"),
    "dr-gurcharan-singh-mehta":        ("dasam", 11, 38, "ਅਕਾਲ ਉਸਤਤਿ · Akal Ustat"),
    "dasam-granth-chandi-heroic-poetry": ("dasam", 74, 126, "ਚੰਡੀ ਚਰਿਤ੍ਰ ਤੇ ਚੰਡੀ ਦੀ ਵਾਰ"),
    "charitropakhyan-theological-framework": ("dasam", 809, 1388, "ਚਰਿਤ੍ਰੋਪਾਖਯਾਨ · Charitropakhyan"),
    "zafarnama-full-study":            ("dasam", 1389, 1428, "ਜ਼ਫ਼ਰਨਾਮਾ · Zafarnama"),
    "dasam-granth-zafarnama":          ("dasam", 1389, 1428, "ਜ਼ਫ਼ਰਨਾਮਾ · Zafarnama"),
    "dasam-granth-overview":           ("dasam", 1, 1428, "ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    "dasam-granth-theology-philosophy":("dasam", 1, 1428, "ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    "guru-gobind-singh-dasam-granth-legacy": ("dasam", 1, 1428, "ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    "dr-kamalroop-singh":              ("dasam", 1, 1428, "ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    "akali-kaur-singh":                ("dasam", 1, 1428, "ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    # ── Sri Sarbloh Granth (1040 angs) ───────────────────────────────────
    "sarbloh-granth-overview":      ("sarbloh", 1, 1040, "ਸ੍ਰੀ ਸਰਬਲੋਹ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    "sarbloh-granth-manglacharan":  ("sarbloh", 1, 12, "ਮੰਗਲਾਚਰਣ · Manglacharan"),
    "sarbloh-granth-philosophy-iron": ("sarbloh", 1, 1040, "ਸ੍ਰੀ ਸਰਬਲੋਹ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
    "sarbloh-granth-mythology-heroism": ("sarbloh", 1, 1040, "ਸ੍ਰੀ ਸਰਬਲੋਹ ਗ੍ਰੰਥ (ਪੂਰਾ)"),
}

MAX = {"sggs": 1430, "dasam": 1428, "sarbloh": 1040}


def main():
    with open(COURSES) as f:
        data = json.load(f)
    by_id = {c["id"]: c for c in data["courses"]}
    applied, missing = [], []
    for cid, (src, start, end, label) in REFS.items():
        assert 1 <= start <= end <= MAX[src], f"bad range for {cid}"
        c = by_id.get(cid)
        if not c:
            missing.append(cid)
            continue
        c["granthRef"] = {"src": src, "start": start, "end": end, "label": label}
        applied.append(cid)
    # Clear stale refs on courses no longer in the map.
    cleared = 0
    for c in data["courses"]:
        if "granthRef" in c and c["id"] not in REFS:
            del c["granthRef"]
            cleared += 1
    with open(COURSES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)  # repo's canonical style
    print(f"granthRef applied to {len(applied)} courses ({cleared} stale cleared)")
    if missing:
        print("NOT FOUND (fix the map):", ", ".join(missing))


if __name__ == "__main__":
    main()

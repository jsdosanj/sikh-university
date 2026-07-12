#!/usr/bin/env python3
"""Export page-aligned parallel texts (Gurmukhi ⇄ English) for the Panj
Granthavali study courses from the SikhLibrary HuggingFace dataset, into
web/public/assets/parallel/<courseId>.json — consumed by the course page's
"Parallel text" panel (hidden until these files exist).

Owner-run: needs network + the read-only dataset token.
    HF_TOKEN=hf_... python3 scripts/export_parallel_texts.py
Then commit the generated JSONs.

Alignment is PAGE-level (the OCR carries no line correspondence; guessing line
pairs would misalign the text — the same page's Gurmukhi and English sit side
by side instead). Data model matches build_source_snippets.py:
    <work>_gurmukhi/extracted_pages.json   pages{n: {page_number, text}}
    <work>_english/translated_pages.json   pages{n: {page_number, english_text}}
Each course's work folder is discovered from its existing sourceText.url
(written by build_source_snippets.py), so there is no fuzzy matching here.
"""
import json, os, re, sys, urllib.parse, urllib.request

DS = "jsdosanj/SikhLibrary"
COURSES = "site/assets/data/courses.json"
OUT_DIR = "web/public/assets/parallel"
# The five Panj Granthavali study courses (collection 'panj-granthavali' in
# web/src/lib/santhya.ts; adhyatam-prakash opens mahant-ganesha-singh).
COURSE_IDS = ["chanakya-niti", "sarukatavali", "bhavrasamrit", "vichar-mala", "mahant-ganesha-singh"]

TOK = os.environ.get("HF_TOKEN", "")
H = {"User-Agent": "SU/1"}
if TOK:
    H["Authorization"] = "Bearer " + TOK


def fetch(url):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=60).read()
    except Exception as e:
        print("  fetch failed:", url[:100], e)
        return None


def tree(path):
    r = fetch("https://huggingface.co/api/datasets/%s/tree/main/%s" % (DS, urllib.parse.quote(path)))
    return json.loads(r) if r else []


def load_pages(path, key):
    raw = fetch("https://huggingface.co/datasets/%s/resolve/main/%s" % (DS, urllib.parse.quote(path)))
    if not raw:
        return {}
    try:
        d = json.loads(raw.decode("utf-8", "replace")).get("pages", {})
    except Exception:
        return {}
    out = {}
    for k, v in d.items():
        txt = (v.get(key) or "").strip()
        if txt:
            out[int(v.get("page_number", k))] = txt
    return out


def work_dir_from_url(url):
    # sourceText.url looks like .../SikhLibrary/tree/main/<Author>/<Work...>
    m = re.search(r"/tree/main/(.+)$", url or "")
    return urllib.parse.unquote(m.group(1)) if m else None


def main():
    if not TOK:
        print("Set HF_TOKEN (read-only SikhLibrary token) and re-run.")
        sys.exit(1)
    os.makedirs(OUT_DIR, exist_ok=True)
    data = json.load(open(COURSES, encoding="utf-8"))
    by_id = {c["id"]: c for c in data["courses"]}
    for cid in COURSE_IDS:
        c = by_id.get(cid)
        st = (c or {}).get("sourceText") or {}
        wd = work_dir_from_url(st.get("url"))
        if not wd:
            print(cid, ": no sourceText.url to locate the work — run build_source_snippets.py first")
            continue
        print(cid, "→", wd)
        entries = tree(wd)
        gur_file = en_file = None
        for e in entries:
            p = e.get("path", "")
            if p.endswith("_gurmukhi/extracted_pages.json") or (e.get("type") == "directory" and p.endswith("_gurmukhi")):
                gur_file = p if p.endswith(".json") else p + "/extracted_pages.json"
            if p.endswith("_english/translated_pages.json") or (e.get("type") == "directory" and p.endswith("_english")):
                en_file = p if p.endswith(".json") else p + "/translated_pages.json"
        if not gur_file:
            print("  no Gurmukhi pages found — skipped")
            continue
        gur = load_pages(gur_file, "text")
        en = load_pages(en_file, "english_text") if en_file else {}
        pages = [{"n": n, "gur": gur[n], "en": en.get(n, "")} for n in sorted(gur)]
        if not pages:
            print("  empty — skipped")
            continue
        out = {"work": st.get("work", ""), "source": "SikhLibrary (HuggingFace) — OCR + machine translation", "pages": pages}
        path = os.path.join(OUT_DIR, cid + ".json")
        json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False)
        print("  wrote %s (%d pages, en for %d)" % (path, len(pages), sum(1 for p in pages if p["en"])))


if __name__ == "__main__":
    main()

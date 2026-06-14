#!/usr/bin/env python3
"""Attach a short bilingual source excerpt to every course that maps to a
SikhLibrary work: the original Gurmukhi/Punjabi OCR text AND its English
translation, taken from the SAME page so the two line up. Excerpts are
quotation-length study snippets with a clear disclaimer in the UI and a link to
the full work on HuggingFace. We never dump whole pages.

Data: each work has sibling folders
  <work>_english/translated_pages.json   {"pages": {"7": {"page_number":7, "english_text": "..."}}}
  <work>_gurmukhi/extracted_pages.json   {"pages": {"7": {"page_number":7, "text": "..."}}}
English-language originals (Macauliffe, Swami Rama, Dorothy Field) only have the
extracted file, in English — detected by script and shown as English.

Run with the read-only token exported:  HF_TOKEN=hf_... python3 scripts/build_source_snippets.py
"""
import json, os, re, sys, urllib.request, urllib.parse, time

TOK = os.environ.get("HF_TOKEN", "")  # read-only SikhLibrary token; export before running
H = {"User-Agent": "SU/1"}
if TOK:
    H["Authorization"] = "Bearer " + TOK
DS = "jsdosanj/SikhLibrary"
COURSES = "site/assets/data/courses.json"
STOP = {"the","a","an","of","and","to","in","on","ji","sahib","sri","guru","singh",
        "bhai","giani","sant","baba","dr","prof","pandit","mahant","kavi","de","da"}
FRONTMATTER = re.compile(
    r"(publication|publisher|published by|all rights reserved|english translation|"
    r"\bedition\b|page \d+ of \d+|copyright|isbn|printed|\bprice\b|reproduced|transmitted|"
    r"photocopying|retrieval|registrar|advisory board|advanced centre|cover design|"
    r"may not be|portion thereof|\brs\.?\b|sikhbookclub|contents\b|\beditor\b)", re.I)

def fetch(url, tries=3):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=45).read()
        except Exception:
            time.sleep(1.5 * (i + 1))
    return None

def tree(path="", rec=False):
    u = ("https://huggingface.co/api/datasets/%s/tree/main/" % DS) + urllib.parse.quote(path) + ("?recursive=true" if rec else "")
    r = fetch(u)
    return json.loads(r) if r else []

def load_pages(path):
    raw = fetch("https://huggingface.co/datasets/%s/resolve/main/%s" % (DS, urllib.parse.quote(path)))
    if not raw: return {}
    try:
        d = json.loads(raw.decode("utf-8", "replace")).get("pages", {})
    except Exception:
        return {}
    out = {}
    for k, v in d.items():
        txt = v.get("english_text") or v.get("text") or ""
        if txt.strip():
            out[int(v.get("page_number", k))] = txt
    return out

def norm(s):
    s = s.lower().replace(".", "").replace("’", "'")
    s = re.sub(r"\bji\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def toks(s):
    return {t for t in re.split(r"[^a-z0-9]+", norm(s)) if t and t not in STOP}

def gur_ratio(s):
    g = sum(1 for ch in s if "਀" <= ch <= "੿")
    a = sum(1 for ch in s if ch.isascii() and ch.isalpha())
    return g / max(1, g + a)

def score_en_page(text):
    words = text.split()
    if len(words) < 25: return -9
    sample = words[:200]
    letters = [ch for ch in " ".join(sample) if ch.isalpha() and ch.isascii()]
    if len(letters) < 60: return -9
    lower = sum(1 for ch in letters if ch.islower()) / len(letters)
    fm = len(FRONTMATTER.findall(" ".join(sample)))
    digity = sum(1 for w in sample if any(ch.isdigit() for ch in w)) / len(sample)
    shouty = sum(1 for w in sample if len(w) > 1 and w.isupper()) / len(sample)
    return lower - 1.5 * fm - 2.0 * digity - 1.2 * shouty

def score_gur_page(text):
    if gur_ratio(text) < 0.5: return -9
    g = sum(1 for ch in text if "਀" <= ch <= "੿")
    return min(g, 600) / 600.0  # favour a substantial Gurmukhi page

def trim(text, max_words, enders="[.!?।॥]"):
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split(" ")
    cut = " ".join(words[:max_words])
    m = list(re.finditer(enders, cut))
    if m and m[-1].end() > len(cut) * 0.4:
        cut = cut[:m[-1].end()]
    elif len(words) > max_words:
        cut = cut.rstrip(",;:") + "…"
    cut = re.sub(r"^[a-z,;:\s]+", "", cut).strip()  # don't start mid-sentence (latin only)
    return cut

def pretty(base):
    s = base.replace("_", " ").replace("(GurmatVeechar.com)", "").replace("(GurmatVeechaar.com)", "")
    return re.sub(r"\s+", " ", s).strip(" .-")

def main():
    d = json.load(open(COURSES, encoding="utf-8"))
    top = [t["path"].strip() for t in tree("") if t.get("type") == "directory"]
    ntop = {norm(t): t for t in top}
    ntoptok = {nf: {t for t in nf.split() if t not in STOP} for nf in ntop}

    def match_folder(prof):
        np = norm(prof)
        if np in ntop: return ntop[np]
        cand = [f for nf, f in ntop.items() if np and len(np.split()) >= 2 and (np in nf or nf in np)]
        if cand: return sorted(cand, key=len)[0]
        pt = {t for t in np.split() if t not in STOP}
        best, bs = None, 0
        for nf, ft in ntoptok.items():
            ov = len(pt & ft)
            if ov > bs: bs, best = ov, ntop[nf]
        return best if bs >= 2 else None

    folder_works, pages_cache = {}, {}

    def works_for(folder):
        if folder in folder_works: return folder_works[folder]
        eng, ext, ext_dir = {}, {}, {}
        for t in tree(folder, rec=True):
            p = t["path"]
            if t.get("type") != "file": continue
            if p.endswith("_english/translated_pages.json"):
                base = p.split("/")[-2][:-len("_english")]
                eng[base] = p
            elif p.endswith("/extracted_pages.json"):
                dirn = p.split("/")[-2]
                base = dirn
                for suf in ("_gurmukhi", "_english", "_punjabi"):
                    if base.endswith(suf): base = base[:-len(suf)]; break
                ext[base] = p; ext_dir[base] = p.rsplit("/", 1)[0]
        ws = []
        for base in sorted(set(eng) | set(ext)):
            ws.append({"base": base, "eng": eng.get(base), "ext": ext.get(base),
                       "dir": (eng.get(base) or ext.get(base)).rsplit("/", 1)[0]})
        folder_works[folder] = ws
        return ws

    def pages(path):
        if path not in pages_cache: pages_cache[path] = load_pages(path)
        return pages_cache[path]

    def build_excerpt(w):
        en_pages = pages(w["eng"]) if w["eng"] else {}
        ex_pages = pages(w["ext"]) if w["ext"] else {}
        english_pages, gurmukhi_pages = None, None
        if en_pages:
            english_pages, gurmukhi_pages = en_pages, (ex_pages or None)
        elif ex_pages:
            sample = " ".join(ex_pages.values())  # whole work — dominant script wins over front matter
            if gur_ratio(sample) >= 0.4: gurmukhi_pages = ex_pages
            else: english_pages = ex_pages
        # choose the page
        if english_pages:
            cand = [(score_en_page(t), -p, p) for p, t in english_pages.items() if p > 1]
        elif gurmukhi_pages:
            cand = [(score_gur_page(t), -p, p) for p, t in gurmukhi_pages.items() if p > 1]
        else:
            return None
        cand.sort(reverse=True)
        if not cand or cand[0][0] <= -9: return None
        p = cand[0][2]
        out = {"work": pretty(w["base"]),
               "url": "https://huggingface.co/datasets/%s/tree/main/%s" % (DS, urllib.parse.quote(w["dir"]))}
        if english_pages and p in english_pages:
            out["english"] = trim(english_pages[p], 140)
        if gurmukhi_pages and p in gurmukhi_pages and gur_ratio(gurmukhi_pages[p]) >= 0.5:
            out["gurmukhi"] = trim(gurmukhi_pages[p], 80)
        if not out.get("english") and not out.get("gurmukhi"): return None
        return out

    stats = {"both": 0, "en": 0, "gur": 0, "none": 0}
    by_prof = {}
    for c in d["courses"]:
        by_prof.setdefault(c.get("professor", "?"), []).append(c)

    for prof, courses in by_prof.items():
        folder = match_folder(prof)
        ws = works_for(folder) if folder else []
        if not ws:
            for c in courses: c.pop("sourceText", None); stats["none"] += 1
            continue
        for i, c in enumerate(courses):
            ct = toks(c.get("title", "")) | toks(c.get("id", ""))
            scored = sorted(ws, key=lambda w: len(ct & toks(w["base"])), reverse=True)
            w = scored[0] if (scored and len(ct & toks(scored[0]["base"]))) else ws[i % len(ws)]
            ex = build_excerpt(w)
            if not ex:
                c.pop("sourceText", None); stats["none"] += 1; continue
            c["sourceText"] = ex
            if ex.get("english") and ex.get("gurmukhi"): stats["both"] += 1
            elif ex.get("english"): stats["en"] += 1
            else: stats["gur"] += 1
        sys.stderr.write("  %-38s -> %d work(s)\n" % (prof[:38], len(ws)))

    json.dump(d, open(COURSES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(COURSES, "a").write("\n")
    n = len(d["courses"])
    print("\nbilingual (Gurmukhi+English): %d" % stats["both"])
    print("English only:                 %d" % stats["en"])
    print("Gurmukhi only:                %d" % stats["gur"])
    print("no source excerpt:            %d  (of %d courses)" % (stats["none"], n))

if __name__ == "__main__":
    main()

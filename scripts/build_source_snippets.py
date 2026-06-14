#!/usr/bin/env python3
"""Attach a short *translated* source excerpt to every course that maps to a
SikhLibrary work. Excerpts are quotation-length (~150 words), carry a clear
"this is a translation of the author's text" disclaimer in the UI, and link to
the full work on HuggingFace. We never dump whole pages — study excerpts only.

Mapping: course.professor -> top-level dataset folder (exact / containment only,
no loose token overlap, to avoid attaching the wrong author's words). Each course
picks the work under that folder whose name best overlaps the course title.
"""
import json, os, re, sys, urllib.request, urllib.parse, time

TOK = os.environ.get("HF_TOKEN", "")  # read-only SikhLibrary token; export before running
H = {"User-Agent": "SU/1"}
if TOK:
    H["Authorization"] = "Bearer " + TOK
DS = "jsdosanj/SikhLibrary"
COURSES = "site/assets/data/courses.json"
STOP = {"the","a","an","of","and","to","in","on","ji","sahib","sri","guru","singh",
        "bhai","giani","sant","baba","dr","prof","pandit","mahant","kavi","an","de","da"}

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

def norm(s):
    s = s.lower().replace(".", "").replace("’", "'")
    s = re.sub(r"\bji\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def toks(s):
    return {t for t in re.split(r"[^a-z0-9]+", norm(s)) if t and t not in STOP}

FRONTMATTER = re.compile(
    r"(publication|publisher|published by|all rights reserved|english translation|"
    r"\bedition\b|page \d+ of \d+|copyright|isbn|printed|\bprice\b|reproduced|transmitted|"
    r"photocopying|retrieval|mechanical|registrar|advisory board|advanced centre|"
    r"cover design|may not be|portion thereof|\brs\.?\b|u\.s\.|telephone|email|website|"
    r"first published|reprint|dedicated to|preface|foreword|contents\b)", re.I)

def _window_score(words):
    """High for flowing narrative prose, low for title pages / colophons /
    addresses / tables of contents (digit-heavy, ALL-CAPS, keyword-laden)."""
    text = " ".join(words)
    letters = [ch for ch in text if ch.isalpha() and ch.isascii()]
    if len(letters) < 40:
        return -9  # mostly non-latin (untranslated Gurmukhi banner) or too sparse
    lower = sum(1 for ch in letters if ch.islower()) / len(letters)
    fm = len(FRONTMATTER.findall(text))
    digity = sum(1 for w in words if any(ch.isdigit() for ch in w)) / len(words)
    shouty = sum(1 for w in words if len(w) > 1 and w.isupper()) / len(words)
    tabley = sum(1 for w in words if len(w) <= 1 or w == "|") / len(words)  # transliteration/grids
    return lower - 1.5 * fm - 2.0 * digity - 1.2 * shouty - 2.5 * tabley

def clean_snippet(txt, max_words=150):
    lines = []
    for ln in txt.splitlines():
        s = ln.strip()
        if not s: continue
        if re.fullmatch(r"=+", s): continue
        if re.fullmatch(r"PAGE\s+\d+", s, re.I): continue
        if re.fullmatch(r"[਀-੿\s।॥|]+", s) and len(s) < 40: continue  # short Gurmukhi salutation
        lines.append(s)
    body = re.sub(r"\s+", " ", " ".join(lines)).strip()
    words = body.split(" ")
    if not words:
        return ""
    # slide a window across the opening; pick the most narrative-like passage,
    # which robustly skips front matter (title page, colophon, contents, address).
    win = min(max_words, len(words))
    scan = min(len(words) - win + 1, 4000)
    best_i, best_s = 0, -1e9
    for i in range(0, max(1, scan), 20):
        sc = _window_score(words[i:i + win])
        if sc > best_s:
            best_s, best_i = sc, i
    chunk = words[best_i:best_i + win]
    out = " ".join(chunk)
    m = list(re.finditer(r"[.!?।]", out))
    if m and m[-1].end() > len(out) * 0.5:
        out = out[:m[-1].end()]
    else:
        out = out.rstrip(",;:") + "…"
    # don't begin mid-sentence: drop a leading lowercase/conjunction fragment
    out = re.sub(r"^[a-z,;:\s]+", "", out).strip()
    if best_i > 0:
        out = "…" + out if not out.startswith("…") else out
    return out.strip()

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
        # guarded fallback: >=2 shared DISTINCTIVE tokens (stop words stripped),
        # so "max arthur macauliffe" still finds "...maucliffe" but "Bhai Avtar
        # Singh" never matches "Bhai Chaupa Singh" (0 distinctive tokens shared).
        pt = {t for t in np.split() if t not in STOP}
        best, bs = None, 0
        for nf, ft in ntoptok.items():
            ov = len(pt & ft)
            if ov > bs: bs, best = ov, ntop[nf]
        return best if bs >= 2 else None

    folder_works = {}   # folder -> [(work_base, text_file_path, lang)]
    text_cache = {}     # text_file_path -> snippet

    def works_for(folder):
        if folder in folder_works: return folder_works[folder]
        trans, orig = {}, {}
        for t in tree(folder, rec=True):
            p = t["path"]
            if t.get("type") != "file": continue
            if p.endswith("_english/translated_text.txt"):
                d_ = p[:-len("/translated_text.txt")]
                base = d_.split("/")[-1][:-len("_english")]
                trans[base] = p
            elif p.endswith("/extracted_text.txt"):
                d_ = p[:-len("/extracted_text.txt")]
                base = d_.split("/")[-1]
                for suf in ("_gurmukhi", "_english", "_punjabi"):
                    if base.endswith(suf): base = base[:-len(suf)]; break
                orig[base] = p
        ws = []
        for base, path in trans.items():
            ws.append((base, path, "translated"))     # prefer English translation
        for base, path in orig.items():
            if base not in trans:
                ws.append((base, path, "original"))    # original OCR where no translation
        folder_works[folder] = ws
        return ws

    def snippet_for(path):
        if path in text_cache: return text_cache[path]
        raw = fetch("https://huggingface.co/datasets/%s/resolve/main/%s" % (DS, urllib.parse.quote(path)))
        sn = clean_snippet(raw.decode("utf-8", "replace")) if raw else None
        text_cache[path] = sn
        return sn

    def pretty(base):
        s = base.replace("_", " ").replace("(GurmatVeechar.com)", "").replace("(GurmatVeechaar.com)", "")
        s = re.sub(r"\s+", " ", s).strip(" .-")
        return s

    stats = {"snip": 0, "nofolder": 0, "nowork": 0, "notext": 0}
    by_prof = {}
    for c in d["courses"]:
        by_prof.setdefault(c.get("professor", "?"), []).append(c)

    for prof, courses in by_prof.items():
        folder = match_folder(prof)
        if not folder:
            for c in courses:
                c.pop("sourceText", None); stats["nofolder"] += 1
            continue
        ws = works_for(folder)
        if not ws:
            for c in courses:
                c.pop("sourceText", None); stats["nowork"] += 1
            continue
        for i, c in enumerate(courses):
            ct = toks(c.get("title", "")) | toks(c.get("id", ""))
            scored = sorted(ws, key=lambda w: len(ct & toks(w[0])), reverse=True)
            best = scored[0]
            if len(ct & toks(best[0])) == 0:
                best = ws[i % len(ws)]  # no keyword hit: spread across works
            base, path, lang = best
            sn = snippet_for(path)
            if not sn or len(sn) < 60:
                c.pop("sourceText", None); stats["notext"] += 1; continue
            work_dir = path.rsplit("/", 1)[0]
            c["sourceText"] = {
                "work": pretty(base),
                "snippet": sn,
                "lang": lang,
                "url": "https://huggingface.co/datasets/%s/tree/main/%s" % (DS, urllib.parse.quote(work_dir)),
            }
            stats["snip"] += 1
        sys.stderr.write("  %-40s -> %d work(s)\n" % (prof[:40], len(ws)))

    json.dump(d, open(COURSES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(COURSES, "a").write("\n")
    total = len(d["courses"])
    print("\nsnippets attached: %d / %d courses" % (stats["snip"], total))
    print("  no source folder (modern scholars etc.): %d" % stats["nofolder"])
    print("  folder but no translated work:           %d" % stats["nowork"])
    print("  text too short / fetch failed:           %d" % stats["notext"])

if __name__ == "__main__":
    main()

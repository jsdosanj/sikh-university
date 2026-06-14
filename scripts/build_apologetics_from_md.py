#!/usr/bin/env python3
"""Build the Apologetics section directly from the user's own manuscript
~/Documents/sikh-archive-apologetics.md — one course per category, embedding
EVERY question (key points + answer + the Gurbani citations the document gives).

Out-of-range SGGS Ang numbers (>1430, often OCR-doubled like 1188188) are
demoted to a plain "SGGS" reference rather than asserting a wrong Ang.
Writes the rebuilt catalogue in place (replacing any existing topic==apologetics).
"""
import json, os, re, html

MD = os.path.expanduser("~/Documents/sikh-archive-apologetics.md")
COURSES = "site/assets/data/courses.json"

# category heading (after emoji) -> (course id, level)
CAT = {
    "Sikh Foundation": ("apol-foundation", 200),
    "Christian Perspectives": ("apol-christian", 300),
    "Islamic Perspectives": ("apol-islamic", 300),
    "Hindu Perspectives": ("apol-hindu", 300),
    "Jewish Perspectives": ("apol-jewish", 300),
    "Atheist & Secular": ("apol-atheist-secular", 300),
    "Buddhist Perspectives": ("apol-buddhist", 300),
    "Secular & Materialist Perspectives": ("apol-atheist-secular", 300),  # merged
    "Internal Sikh Debates": ("apol-internal-debates", 300),
    "Comparative & General Questions": ("apol-comparative-general", 250),
    "Transmission & Historicity": ("apol-transmission", 320),
    "Conversion Tactics": ("apol-conversion-tactics", 250),
    "Plato": ("apol-plato", 350),
    "Aristotle": ("apol-aristotle", 350),
    "Nietzsche": ("apol-nietzsche", 350),
    "Kant": ("apol-kant", 350),
}
TITLE = {
    "apol-foundation": "The Sikh Foundation: The Case for Sikhi",
    "apol-christian": "Sikhi & Christian Perspectives",
    "apol-islamic": "Sikhi & Islamic Perspectives",
    "apol-hindu": "Sikhi & Hindu Perspectives",
    "apol-jewish": "Sikhi & Jewish Perspectives",
    "apol-atheist-secular": "Sikhi & the Atheist / Secular Challenge",
    "apol-buddhist": "Sikhi & Buddhist Perspectives",
    "apol-internal-debates": "Internal Sikh Debates: Answering the Critics",
    "apol-comparative-general": "Comparative & General Questions",
    "apol-transmission": "Transmission & Historicity: The Verifiable Record",
    "apol-conversion-tactics": "Understanding Conversion Tactics",
    "apol-plato": "Sikhi in Dialogue with Plato",
    "apol-aristotle": "Sikhi in Dialogue with Aristotle",
    "apol-nietzsche": "Sikhi in Dialogue with Nietzsche",
    "apol-kant": "Sikhi in Dialogue with Kant",
}

def clean_ang(src):
    # keep "Ang N" only when 1<=N<=1430 (SGGS); else drop the number, keep the rest
    def fix(m):
        n = int(m.group(1))
        return ("Ang %d" % n) if 1 <= n <= 1430 else "SGGS"
    s = re.sub(r"Ang\s+(\d+)", fix, src)
    s = re.sub(r"\bSGGS,\s*SGGS\b", "SGGS", s)
    return re.sub(r"\s+", " ", s).strip(" ,")

def esc(t):
    return html.escape(t, quote=False)

def parse():
    lines = open(MD, encoding="utf-8").read().split("\n")
    # split into category sections by level-2 headings
    cats, cur = [], None
    for ln in lines:
        m = re.match(r"^##\s+(.+)$", ln)
        if m and not ln.startswith("###"):
            name = re.sub(r"^[^\w]+", "", m.group(1)).strip()  # strip leading emoji
            if name in ("Contents",) or name.startswith("Sikh Archive"):
                cur = None; continue
            cur = {"name": name, "body": []}
            cats.append(cur)
        elif cur is not None:
            cur["body"].append(ln)
    return cats

def parse_questions(body_lines):
    text = "\n".join(body_lines)
    # plain-English thesis
    pm = re.search(r"### Thesis \(plain English\)\s*(.+?)(?=\n### )", text, re.S)
    thesis = ""
    if pm:
        thesis = re.sub(r"\s+", " ", pm.group(1)).strip()
    # question blocks
    qs = []
    parts = re.split(r"\n####\s+\d+\.\s+", "\n" + text)
    # first part is preamble; locate where Questions begin
    # re-split capturing titles
    blocks = re.findall(r"\n####\s+(\d+)\.\s+(.+?)(?=\n####\s+\d+\.|\Z)", "\n" + text, re.S)
    for num, block in blocks:
        # split off the title line
        nl = block.find("\n")
        title = block[:nl].strip() if nl != -1 else block.strip()
        rest = block[nl:] if nl != -1 else ""
        # key points
        kp = []
        km = re.search(r"\*\*Key points:\*\*\s*(.+?)(?=\*\*Answer:\*\*|\*\*Gurbani|\Z)", rest, re.S)
        if km:
            kp = [re.sub(r"\s+", " ", x).strip(" -") for x in re.findall(r"^\s*-\s+(.+)$", km.group(1), re.M)]
        # answer
        ans = ""
        am = re.search(r"\*\*Answer:\*\*\s*(.+?)(?=\*\*Gurbani citations:\*\*|\Z)", rest, re.S)
        if am:
            ans = "\n\n".join(p.strip() for p in re.split(r"\n\s*\n", am.group(1).strip()) if p.strip())
        # citations
        cites = []
        cm = re.search(r"\*\*Gurbani citations:\*\*\s*(.+)\Z", rest, re.S)
        if cm:
            # each citation is a blockquote group; lines starting with >
            quoted = [l[1:].strip() for l in cm.group(1).split("\n") if l.strip().startswith(">")]
            # regroup: a citation = gurmukhi line, translation (italic), source (— ...)
            grp = []
            for q in quoted:
                if not q: continue
                grp.append(q)
                if q.startswith("—") or q.startswith("- "):  # source ends a group
                    gur = next((g for g in grp if re.search(r"[਀-੿]", g)), "")
                    tr = next((g.strip("*") for g in grp if g.startswith("*")), "")
                    srcs = [g for g in grp if g.startswith("—") or g.startswith("- ")]
                    cites.append({"gur": gur, "tr": tr, "src": clean_ang(srcs[0]) if srcs else ""})
                    grp = []
        qs.append({"n": int(num), "title": title, "kp": kp, "ans": ans, "cites": cites})
    return thesis, qs

def q_html(q):
    h = ['<div class="qa">', "<h4>%d. %s</h4>" % (q["n"], esc(q["title"]))]
    if q["kp"]:
        h.append('<ul class="keypoints">' + "".join("<li>%s</li>" % esc(k) for k in q["kp"]) + "</ul>")
    for p in q["ans"].split("\n\n"):
        if p.strip():
            h.append("<p>%s</p>" % esc(p.strip()))
    for c in q["cites"]:
        parts = ['<blockquote class="gurbani">']
        if c["gur"]:
            parts.append('<span class="gur">%s</span>' % c["gur"])
        if c["tr"]:
            parts.append("<br><em>%s</em>" % esc(c["tr"]))
        if c["src"]:
            parts.append('<br><span class="cite">— %s</span>' % esc(c["src"].lstrip("—- ").strip()))
        parts.append("</blockquote>")
        h.append("".join(parts))
    h.append("</div>")
    return "".join(h)

def first_sentence(t, cap=150):
    t = re.sub(r"\s+", " ", t).strip()
    m = re.search(r"^(.+?[.!?])\s", t)
    s = m.group(1) if m else t
    return (s[:cap].rsplit(" ", 1)[0] + "…") if len(s) > cap else s

def build_quiz(qs):
    pool = [(q["title"], first_sentence(q["ans"])) for q in qs if q["ans"]]
    quiz = []
    n = len(pool)
    if n < 2:
        return quiz
    for i in range(min(8, n)):
        correct = pool[i][1]
        distract = [pool[(i + k) % n][1] for k in (1, 2, 3)]
        distract = [d for d in distract if d != correct][:3]
        opts = distract + [correct]
        # deterministic placement of correct answer
        pos = i % len(opts)
        opts[-1], opts[pos] = opts[pos], opts[-1]
        ans = opts.index(correct)
        if len(opts) >= 2:
            quiz.append({"q": "Which best reflects the Sikh response — “%s”" % first_sentence(pool[i][0], 90),
                         "options": opts, "answer": ans})
    return quiz

def make_course(cat_name, thesis, qs):
    cid, level = CAT[cat_name]
    intro = ('<div class="toc"><strong>About this course</strong><p>This course is drawn from the Sikh Archive '
             'apologetics resource. It presents, in a question-and-answer format, how Sikhi engages this area — '
             'always aiming to inform with clarity and respect, never to disparage any people or faith.</p></div>'
             '<h4>Overview</h4><p>%s</p>' % esc(thesis))
    lessons = [{"title": "Overview & Thesis", "summary": "The core argument of this section.", "html": intro}]
    # chunk questions into lessons of ~7
    CHUNK = 7
    for i in range(0, len(qs), CHUNK):
        grp = qs[i:i + CHUNK]
        body = "".join(q_html(q) for q in grp)
        lessons.append({"title": "Questions %d–%d" % (grp[0]["n"], grp[-1]["n"]),
                        "summary": "%d questions answered." % len(grp), "html": body})
    return {
        "id": cid, "title": TITLE[cid], "topic": "apologetics", "level": level,
        "professor": "Sikh Archive", "source": "Sikh Archive apologetics",
        "aiCreated": True, "status": "published",
        "summary": first_sentence(thesis, 300) if thesis else TITLE[cid],
        "lessons": lessons, "quiz": build_quiz(qs),
    }

def main():
    cats = parse()
    built = {}
    counts = {}
    for c in cats:
        if c["name"] not in CAT:
            continue
        thesis, qs = parse_questions(c["body"])
        cid = CAT[c["name"]][0]
        counts[c["name"]] = len(qs)
        if cid in built:  # merge (Secular & Materialist -> atheist)
            built[cid]["lessons"][0]["html"] += "<h4>%s</h4><p>%s</p>" % (esc(c["name"]), esc(thesis))
            CH = 7
            base = built[cid]
            for i in range(0, len(qs), CH):
                grp = qs[i:i + CH]
                base["lessons"].append({"title": "%s — Q%d–%d" % (c["name"], grp[0]["n"], grp[-1]["n"]),
                                        "summary": "%d more questions." % len(grp),
                                        "html": "".join(q_html(q) for q in grp)})
            continue
        built[cid] = make_course(c["name"], thesis, qs)

    d = json.load(open(COURSES, encoding="utf-8"))
    before = len(d["courses"])
    d["courses"] = [c for c in d["courses"] if c.get("topic") != "apologetics"]
    removed = before - len(d["courses"])
    d["courses"].extend(built.values())
    json.dump(d, open(COURSES, "w", encoding="utf-8"), ensure_ascii=False, indent=2); open(COURSES, "a").write("\n")
    print("parsed Q per category:", counts)
    print("removed old apologetics:", removed, "| built:", len(built), "courses")
    for cid, c in built.items():
        print("  %-26s %d lessons, %d quiz, %d Q-total" % (cid, len(c["lessons"]), len(c["quiz"]),
              sum(h["html"].count('class="qa"') for h in c["lessons"])))

if __name__ == "__main__":
    main()

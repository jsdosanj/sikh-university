#!/usr/bin/env python3
"""Build a chapter/section index for the Gurbani reader (SGGS, Dasam, Sarbloh)
and VALIDATE each SGGS raag start-Ang against the actual page text, so no
hand-typed Ang error slips onto sacred content.
Writes web/public/assets/gurbani/chapters.json (and mirrors to site/).
"""
import json, os, re, sys

BASE = "web/public/assets/gurbani"

# Standard, universally-published SGGS structure: (ang, English label, Gurmukhi name token to verify)
SGGS = [
    (1, "Japji Sahib", "ਜਪੁ"),
    (8, "Rehras / So Dar", "ਸੋ ਦਰੁ"),
    (12, "Kirtan Sohila", "ਸੋਹਿਲਾ"),
    (14, "Raag Siri Raag", "ਸਿਰੀਰਾਗੁ"),
    (94, "Raag Maajh", "ਮਾਝ"),
    (151, "Raag Gauri", "ਗਉੜੀ"),
    (347, "Raag Aasaa", "ਆਸਾ"),
    (489, "Raag Gujri", "ਗੂਜਰੀ"),
    (527, "Raag Devgandhari", "ਦੇਵਗੰਧਾਰੀ"),
    (537, "Raag Bihagra", "ਬਿਹਾਗੜਾ"),
    (557, "Raag Wadhans", "ਵਡਹੰਸੁ"),
    (595, "Raag Sorath", "ਸੋਰਠਿ"),
    (660, "Raag Dhanasari", "ਧਨਾਸਰੀ"),
    (696, "Raag Jaitsri", "ਜੈਤਸਰੀ"),
    (711, "Raag Todi", "ਟੋਡੀ"),
    (719, "Raag Bairari", "ਬੈਰਾੜੀ"),
    (721, "Raag Tilang", "ਤਿਲੰਗ"),
    (728, "Raag Suhi", "ਸੂਹੀ"),
    (795, "Raag Bilaval", "ਬਿਲਾਵਲੁ"),
    (859, "Raag Gond", "ਗੋਂਡ"),
    (876, "Raag Ramkali", "ਰਾਮਕਲੀ"),
    (975, "Raag Nat Narayan", "ਨਟ"),
    (984, "Raag Mali Gaura", "ਮਾਲੀ ਗਉੜਾ"),
    (989, "Raag Maru", "ਮਾਰੂ"),
    (1107, "Raag Tukhari", "ਤੁਖਾਰੀ"),
    (1118, "Raag Kedara", "ਕੇਦਾਰਾ"),
    (1125, "Raag Bhairo", "ਭੈਰਉ"),
    (1168, "Raag Basant", "ਬਸੰਤੁ"),
    (1197, "Raag Sarang", "ਸਾਰਗ"),
    (1254, "Raag Malar", "ਮਲਾਰ"),
    (1294, "Raag Kanra", "ਕਾਨੜਾ"),
    (1319, "Raag Kalyan", "ਕਲਿਆਨ"),
    (1327, "Raag Prabhati", "ਪ੍ਰਭਾਤੀ"),
    (1352, "Raag Jaijawanti", "ਜੈਜਾਵੰਤੀ"),
    (1353, "Salok Sehskriti", "ਸਹਸਕ੍ਰਿਤੀ"),
    (1360, "Gatha", "ਗਾਥਾ"),
    (1361, "Phunhe", "ਫੁਨਹੇ"),
    (1363, "Chaubole", "ਚਉਬੋਲੇ"),
    (1364, "Salok Bhagat Kabir", "ਕਬੀਰ"),
    (1377, "Salok Sheikh Farid", "ਫਰੀਦ"),
    (1389, "Swaiye", "ਸਵਈਏ"),
    (1410, "Salok Vaaran Te Vadeek", "ਸਲੋਕ ਵਾਰਾਂ"),
    (1426, "Salok Mahalla 9", "ਮਹਲਾ ੯"),
    (1429, "Mundavani & Raagmala", "ਮੁੰਦਾਵਣੀ"),
]

# Dasam Granth banis — standard Angs (also used in the Santhya Das Granthi)
DASAM = [
    (1, "Jaap Sahib"), (11, "Akal Ustat"), (39, "Bachittar Natak"),
    (74, "Chandi Charitar (Ukti Bilas)"), (99, "Chandi Charitar II"),
    (119, "Chandi di Vaar"), (127, "Gyan Prabodh"), (155, "Chaubis Avtar"),
    (717, "Shastar Naam Mala"), (809, "Charitropakhyan"), (1389, "Zafarnama"),
]

def load(src, ang):
    p = os.path.join(BASE, src, "%d.json" % ang)
    if not os.path.exists(p): return None
    return json.load(open(p, encoding="utf-8"))

def validate_sggs():
    bad = []
    for ang, label, tok in SGGS:
        ok = False
        for a in (ang, ang - 1, ang + 1):  # allow the header to sit on an adjacent ang
            d = load("sggs", a)
            if d and any(tok in ln for ln in d.get("lines", [])):
                ok = True; break
        if not ok:
            bad.append((ang, label, tok))
    return bad

def main():
    bad = validate_sggs()
    if bad:
        print("SGGS chapter validation MISMATCHES (token not found near ang):")
        for ang, label, tok in bad:
            print("  ang %d %s — expected %r" % (ang, label, tok))
    else:
        print("SGGS: all %d chapter start-Angs validated against the text." % len(SGGS))

    dasam_max = len([f for f in os.listdir(os.path.join(BASE, "dasam")) if f.endswith(".json")])
    dasam = [(a, l) for a, l in DASAM if load("dasam", a)]
    # sarbloh: whatever sections exist
    sar_idx = os.path.join(BASE, "sarbloh", "index.json")
    sarbloh = []
    if os.path.exists(sar_idx):
        si = json.load(open(sar_idx, encoding="utf-8"))
        secs = si.get("sections") or si.get("items") or []
        for i, s in enumerate(secs, 1):
            sarbloh.append({"ang": s.get("ang", i), "label": s.get("title", "Section %d" % i)})
    if not sarbloh:
        sarbloh = [{"ang": 1, "label": "Sarbloh Granth (excerpt)"}]

    out = {
        "sggs": [{"ang": a, "label": l, "gur": g} for a, l, g in SGGS],
        "dasam": [{"ang": a, "label": l} for a, l in dasam],
        "sarbloh": sarbloh,
    }
    for d in (BASE, "site/assets/data/gurbani"):
        os.makedirs(d, exist_ok=True)
        json.dump(out, open(os.path.join(d, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("wrote chapters.json — sggs %d, dasam %d, sarbloh %d" % (len(out["sggs"]), len(out["dasam"]), len(out["sarbloh"])))
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()

# Content sources & licensing register

The platform is only as legitimate as its content rights. Rule of thumb: **link or embed by
default; rehost only what we own or what is openly licensed; get written permission for the rest.**

| Source | What | Rights status | How we may use it |
|---|---|---|---|
| **Sikh Archive (sikharchive.net)** | Articles, scans, media — Jasvant's own archive | We control it (but **audit for any third-party items inside it** before redistribution) | Host/import directly; this is our primary library |
| **SikhLibrary (HF: `jsdosanj/SikhLibrary`)** | Digitized texts, commentaries, theses by many authors | **Jasvant owns it and states full use rights**; gated on HF | Build **author-as-professor** courses *about* the works (summary/analysis/brief attributed quotes) — not verbatim rehosting; AI-labeled + scholar-reviewed |
| **Sri Guru Granth Sahib Ji — original Gurmukhi** | Scripture text | **Public domain** (centuries old) | Host freely, with the reverence/handling guidelines below |
| **Bhagat Jaswant Singh Ji Daudar (Gursevak) — Santhya recitation** | SGGS Santhya audio (1428 per-Ang recordings, `/santhiya?src=sggs`) + per-letter/Muharni audio (`baal-updesh.astro`, still being extracted) | **Used with the reciter's permission** (owner-confirmed) | Host directly on our R2/CDN, with attribution shown on every page that plays it |
| **Gurbani translations / transliterations** | English/other renderings | **Mixed** — modern translations are often copyrighted | Use only public-domain or openly-licensed translations; verify each; or commission our own |
| **Basics of Sikhi (Everythings 13, UK charity)** | Videos, courses | **Copyrighted** by the charity | **Embed their public YouTube videos** (allowed by YouTube embed terms) or **link out**; **do NOT rehost/repackage** without a written partnership/permission. Reach out for an official partnership. |
| **MIT OpenCourseWare** | Full courses | **CC BY-NC-SA 4.0** | Reuse/import with **attribution**, **non-commercial** (a free university qualifies), **share-alike**; keep notices intact |
| **Harvard CS50 / select HarvardX** | Courses | **CC BY-NC-SA** (CS50); others vary | Use only the openly CC-licensed ones; **verify per course** — Harvard's paid "Online" catalog is **not** open |
| **AI-skills curriculum** | Our courses | We author it | Original; license it openly (e.g., CC BY-SA) to live the "open to all" mission |
| **AI Engineering from Scratch** (`rohitg00/ai-engineering-from-scratch`) | ~511-lesson curriculum behind the Institute of Technology's AI-engineering phases | **MIT**, © Rohit Ghumare and contributors | Import + reformat under MIT: retain the MIT text (`/technology/licenses`), credit Rohit as professor on every AISF phase, no AISF logo, a non-affiliation line. Our reformatting/quizzes/lab are ours; the curriculum text stays MIT. See `docs/ADR-0003`. |
| **freeCodeCamp** (`freeCodeCamp/freeCodeCamp`) | ~11k interactive challenges / ~15 certifications — the `/technology/explore` booth | Curriculum **CC BY-SA 4.0**; platform code **BSD-3-Clause**; name + logo are trademarks of freeCodeCamp.org | **Link out only** — rehost nothing. No logo, no implied partnership; carry "not affiliated with / endorsed by freeCodeCamp.org, certifications are theirs". If we ever quote their prose, that quote is attributed and the page carries a CC BY-SA 4.0 notice. |
| **Libre.academy** (`InfamousVague/Libre.academy`) | ~100 book-derived course packs | App MIT; **packs derive from separately-licensed books — several CC BY-NC / BY-NC-ND** (Eloquent JS, You Don't Know JS Yet, Pro Git, JavaScript.info, Automate the Boring Stuff) | **Link out only** — honoring non-commercial / no-derivatives is a hard rule below. Deferred to a depth wave. |
| **Institute of Technology — our own additions** | Seva-framed phase intros, code-lab exercises + checks, "Build for the Panth" briefs, `/technology/licenses` | We author it | **CC BY-SA 4.0** (prose); **MIT** (engine code — the code lab, terminal dojo). English-authoritative, never machine-translated. |

## Hard rules
- **No scraping/rehosting copyrighted third-party content** (videos, books, paid courses) without
  written permission. Embedding a creator's *own public YouTube video* is fine; copying their
  course materials onto our servers is not.
- **Attribution + license notices preserved** on every reused open work (CC requires it).
- **Non-commercial honored** for NC-licensed material — keep the platform free; if we ever add
  paid tiers, NC content must be excluded or separately licensed.
- **Trademarks**: don't imply endorsement by MIT/Harvard/Basics of Sikhi without agreement.

## Respect & handling (Sikhi-specific)
- Treat Gurbani with reverence: correct Gurmukhi, faithful translations, scholarly review,
  and a clear "report a correction" path. Establish a **scholar review board** for doctrinal accuracy.

## Action items
- [ ] Audit sikharchive.net contents for embedded third-party rights.
- [ ] Open a partnership conversation with Basics of Sikhi (embed + co-branding).
- [ ] Pick verified open Gurbani translation sources (or commission).
- [ ] Per-course CC verification for each OCW/HarvardX import.

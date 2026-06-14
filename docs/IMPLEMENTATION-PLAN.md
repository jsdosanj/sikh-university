# Implementation plan — Sikh University on Open edX

Platform decision: **Open edX** (see ADR-0001). Public, open to all. Edge via **Cloudflare**.

## Success criteria (what "done" means)
- A public **course-catalogue website** (Cloudflare Pages) where anyone can browse courses.
- A running **Open edX** instance (VM origin) where learners enroll and take courses, fronted by Cloudflare.
- Courses for **Sikh History, Sikh Theology, Sikh Philosophy, Sikh Music**, each at levels
  **100/150/200/250/300/350/400/450/500** (9 levels × 4 = 36 courses).
- Every AI-drafted course carries a visible **"Created by AI"** label and passes **scholar review**
  before it's presented as authoritative.
- All content is rights-clean (owned, openly licensed, or permissioned).

## 1. Can Cloudflare host this? (precise answer)
- **The public course website: YES** — host it on **Cloudflare Pages** (static). 100% Cloudflare.
- **The Open edX LMS app: NOT on Cloudflare Pages/Workers.** Open edX is a Django + MySQL + MongoDB
  + Redis Docker stack; it needs a real compute host (a Linux VM, or Kubernetes to scale).
- **Cloudflare's role for the LMS (the right way):**
  - DNS + CDN + **WAF** + DDoS + bot protection at the edge.
  - **Cloudflare Tunnel (`cloudflared`)** from the origin VM → no open inbound ports, origin IP hidden.
  - **Cloudflare Access (Zero Trust)** to gate Studio/admin.
  - **R2** (S3-compatible object storage) for media; **Cloudflare Stream** for course video.
- **Net:** website = fully Cloudflare; LMS = a VM *behind* Cloudflare. You still provision one VM
  (any cloud, or even a self-hosted box — Tunnel makes that viable). Cloudflare ≠ the app server.

```
Learner ── Cloudflare edge (DNS, CDN, WAF, Access) ──┬── Pages: course-catalogue website (static)
                                                     └── Tunnel ── Origin VM: Open edX (Tutor/Docker)
                                                                     ├ LMS + Studio
                                                                     ├ MySQL / MongoDB / Redis
                                                                     └ media → R2 / video → Stream
```

## 2. Content & rights plan (the gate, per CLAUDE.md + licensing register)
- **Everythings 13 / Basics of Sikhi content:** **out of scope until written permission exists.**
  No partnership yet → we do **not** use their "E13" name and do **not** rehost their content (we may
  embed their public YouTube videos / link out). Platform name is **Sikh University**, independent of E13.
- **`jsdosanj/SikhLibrary` dataset (yours):** you confirm you own it and may use it freely. We build
  **author-as-professor** courses *about* each author's writings — original teaching content
  (summaries, key themes, analysis, historical context) with brief **attributed** quotations — **not**
  verbatim reproductions of the underlying books. (That is what makes it a *course*, and it keeps us
  clean on any third-party works bundled in the library.) Each is **"Created by AI"**-labeled +
  scholar-reviewed. Note: the dataset is **gated** on HF — we need an author/works manifest or access
  to enumerate authors and titles.
- **What we author instead:** **original** courses that *teach about* Sikh history/theology/philosophy/
  music — facts and ideas (not copyrightable), in our own words, citing **public-domain primary
  sources** (SGGS Gurmukhi text, historical records) and **openly-licensed** scholarship. Each is
  **"Created by AI"**-labeled and **scholar-reviewed** before publishing.
- **Sikh Archive (yours):** primary owned library — import freely (after a quick third-party audit).
- **OCW/CS50 (CC BY-NC-SA):** optional partner courses, attributed.

## 3. Course catalogue design (36 courses)
Four subjects × nine levels. Level intent (applied per subject):

| Level | Intent |
|---|---|
| 100 | Foundations — absolute beginner, no prerequisites |
| 150 | Survey — broad map of the subject |
| 200 | Core I — key topics in depth |
| 250 | Core II — continued core |
| 300 | Intermediate — analysis & connections |
| 350 | Advanced topics — focused deep dives |
| 400 | Seminar — primary-source engagement |
| 450 | Specialized — niche/expert subtopics |
| 500 | Capstone / graduate — synthesis & independent study |

Each course = outcomes, modules (video + readings + quiz), discussion, certificate. Exact titles/
syllabi designed with scholar input. **All AI-drafted → labeled + reviewed.**

### Author-as-professor courses (from SikhLibrary)
Separate from the survey grid: each **author in SikhLibrary is a "professor"** whose course(s) are
built from their writings. Prolific authors → several courses; authors with one work → one course.
Each course teaches *about* the work (summary, themes, context, close reading with brief attributed
quotes), labeled "Created by AI" + reviewed.

**Open: how the two structures relate** (needs your call):
- (A) Two parallel catalogues — survey grid (subject × level) **and** author-led courses; or
- (B) Author-led courses *are* the catalogue, each tagged with a subject + a level; or
- (C) Survey grid = core curriculum; author courses = electives/seminars (e.g., 400-level).
Default if unspecified: **(A)** — survey courses for newcomers, author courses for depth.

## 4. The public course-catalogue website (build now-ready, Cloudflare Pages)
Static site listing schools → subjects → the 36 courses, each with title, level, description,
"Created by AI" badge where applicable, and an enroll link to the LMS. Same lightweight vanilla
stack we use elsewhere; deploys to Cloudflare Pages.

## 5. Phased execution (goal-driven, with verify checks)
1. **Plan + decisions** (this doc) → verify: open questions answered, rights cleared.
2. **Catalogue website v1** (Cloudflare Pages) → verify: live URL, all 36 courses listed with AI labels.
3. **Open edX pilot** on a VM via Tutor + Cloudflare Tunnel/WAF → verify: a test learner can enroll/complete a course; hardening checklist (SECURITY.md) passes.
4. **Flagship course** (e.g., Sikh History 100) authored as OLX, imported, AI-labeled, scholar-reviewed → verify: end-to-end learner flow.
5. **Author remaining courses** in batches, each through the label+review gate → verify: review board sign-off per course.
6. **E13 + OCW partner content** once permissions confirmed → verify: signed permission on file; attribution intact.
7. **Scale + localization** (Punjabi, low-bandwidth) → verify: load + accessibility gates.

## 6. Open questions
See the questions raised with Jasvant (E13 permission, dataset rights, hosting/VM, accuracy/review
board, AI-generation depth, "AI free courses from Sikharchive" scope, domain/name confirmation).

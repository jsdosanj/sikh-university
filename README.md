# Sikh University — open learning platform (working title)

A free, global, open online university where **anyone, anywhere** can learn about Sikhi —
and grow modern skills (starting with AI) — taught by scholars and built on open content.

> Status: **planning + scaffold**. This repo holds the vision, the architecture decision,
> the security model, the content/licensing register, the curriculum, and the deployment
> runbook. Platform deployment begins once the direction is confirmed.

## Mission
- **Open to all** — free, no barriers, works on any device, available worldwide.
- **Sikhi at the centre** — Gurbani, history, philosophy, Rehat, Kirtan, Gurmukhi/Punjabi,
  sourced from authentic scholarship.
- **21st-century skills** — start with AI literacy, extend to data, security, and more.
- **Scholar-built** — verified scholars can author and maintain courses (with review).
- **Security as a core mission** — privacy-respecting, hardened, auditable by design.

## What it is (and isn't)
- It **is** a MOOC-style open university: self-paced courses, video, readings, quizzes,
  discussion, certificates of completion, and a course-authoring studio for scholars.
- It **is not** a fork of a legacy school LMS. See [docs/ADR-0001-platform-choice.md](docs/ADR-0001-platform-choice.md).

## Content sources (see [docs/CONTENT-AND-LICENSING.md](docs/CONTENT-AND-LICENSING.md))
- **Sikh Archive (sikharchive.net)** — Jasvant's own archive; primary source library.
- **Basics of Sikhi** — third-party charity content; **requires written permission/partnership**
  (embed/link, do not rehost without it).
- **OpenCourseWare (MIT OCW, Harvard CS50, etc.)** — reusable under Creative Commons
  **BY-NC-SA** with attribution; non-commercial use fits an open university.
- **Original AI-skills curriculum** — authored in-house.

## Name candidates (to decide)
- **Miri-Piri Academy** / **Miri Piri Open University** — the Sikh concept of temporal + spiritual.
- **Akal Academy / Akal Open University** — (note: "Akal University" already exists in Talwandi Sabo).
- **Khalsa University Online** — clear, but "Khalsa University" is also an existing institution.
- **Gurmat Vidyala** ("school of the Guru's wisdom") — distinctly Sikh, less collision risk.
- **Charhdi Kala University** — uplifting, evocative.
- Working repo name: `sikh-university`.

## Repo layout
```
docs/    vision, ADR, security model, licensing register, curriculum, roadmap, deployment runbook
theme/   custom branding / micro-frontend theme plan for the platform
deploy/  infrastructure-as-code + Tutor config plan for the chosen platform
```

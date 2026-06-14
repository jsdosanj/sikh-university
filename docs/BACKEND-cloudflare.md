# Backend architecture — Cloudflare-native (Pages + Functions + D1 + R2)

Fully Cloudflare, no VM. Builds on ADR-0002 (static frontend) by adding a serverless backend.

```
Browser ── Cloudflare Pages (static frontend: site/) 
              └─ Pages Functions / Workers  ── D1 (SQLite: courses, users, enrollment, progress)
                                            └─ R2 (object storage: media, video, SikhLibrary PDFs)
```

## What each piece does
- **Pages** — serves the static site (already built in `site/`).
- **Pages Functions / Workers** — the API (`/api/*`): read courses, record progress, auth (if enabled).
- **D1** (serverless SQLite) — relational data: courses/lessons (so we can manage content without
  redeploying), and — *if we add accounts* — users, enrollments, progress.
- **R2** (S3-compatible) — large/binary content: course images, audio, **video**, and the
  **SikhLibrary source files** (PDFs) that author-as-professor courses reference.

## Phased (don't overbuild)
- **Phase A — now:** static frontend on Pages; courses in `courses.json`; progress in `localStorage`.
  No backend required. **Deployable today.**
- **Phase B — content at scale:** move course media + SikhLibrary PDFs into **R2**; serve via a
  Function. Optionally move the course catalogue into **D1** so courses can be added without a redeploy.
- **Phase C — accounts (needs a decision):** **D1** users + enrollments + progress-sync across
  devices + completion certificates. **Requires choosing an auth method (see below).**

## D1 schema (initial — Phase B/C)
```sql
CREATE TABLE courses (
  id TEXT PRIMARY KEY, title TEXT, topic TEXT, level INTEGER,
  professor TEXT, source TEXT, ai_created INTEGER, status TEXT, summary TEXT
);
CREATE TABLE lessons (
  course_id TEXT, idx INTEGER, title TEXT, body TEXT,
  PRIMARY KEY (course_id, idx)
);
-- Phase C (only if accounts are enabled):
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT DEFAULT 'learner', created_at TEXT);
CREATE TABLE enrollments (user_id TEXT, course_id TEXT, enrolled_at TEXT, PRIMARY KEY (user_id, course_id));
CREATE TABLE progress (user_id TEXT, course_id TEXT, lesson_idx INTEGER, completed_at TEXT,
  PRIMARY KEY (user_id, course_id, lesson_idx));
```

## R2 layout
```
media/<course-id>/...        course images / audio / video
library/<author>/<file>.pdf  SikhLibrary source documents (private; served via Function with checks)
```

## Auth — the decision before Phase C (security is core)
| Option | Friction | Security | Notes |
|---|---|---|---|
| **No accounts** (today) | none | n/a | progress per-browser only; anonymous; simplest |
| **Email magic-link** (passwordless) | low | strong (no passwords) | needs a mail sender; good default for an open university |
| **OAuth (Google/Apple)** | low | strong | relies on providers; quick sign-in |
| **Passkeys (WebAuthn)** | low-med | strongest | most modern; a bit more build |

Recommendation: stay **No accounts** through Phases A–B; if/when we want cross-device progress &
certificates, add **email magic-link or OAuth**. Whichever we pick: MFA for admins, least-privilege
roles, secrets in Workers secrets (not code), rate limiting, audit logging (see SECURITY.md).

## Deploy (Cloudflare, free tier)
- Frontend: connect this repo to **Cloudflare Pages**, build output dir = `site/`.
- D1: `wrangler d1 create sikh-university` → bind in `wrangler.toml`; apply `schema.sql`.
- R2: `wrangler r2 bucket create sikh-university-media` → bind; upload assets.
- Functions: add `site/functions/api/*` (Pages Functions) bound to D1/R2.
(These run when we start Phase B/C, after the auth decision.)

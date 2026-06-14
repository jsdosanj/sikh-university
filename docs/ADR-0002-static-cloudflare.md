# ADR-0002: Host as a static interactive site on Cloudflare Pages (supersedes ADR-0001)

**Status:** Accepted · **Date:** 2026-06-13 · **Supersedes:** ADR-0001 (Open edX)

## Context
Constraints from Jasvant: **no VM to manage**, **free Cloudflare web hosting**, public/open to all,
interactive and robust, named **Sikh University** (no E13 — no permission yet).

## Problem with ADR-0001 (Open edX)
Open edX is a Django + MySQL + MongoDB + Redis Docker stack. It **requires a compute host** (a VM
or Kubernetes) and **cannot run on Cloudflare Pages/Workers**. That conflicts directly with
"no VM + free Cloudflare."

## Decision
Build a **custom, static, interactive course website** and host it on **Cloudflare Pages (free)**:
- Vanilla HTML/CSS/JS + JSON content (the no-build pattern already proven in cert-prep / the study
  sites). No server, no database, no VM.
- Course **catalogue browsable by topic**; an interactive **course viewer** (lessons, readings,
  progress saved in `localStorage`).
- AI-drafted courses carry a **"Created by AI"** badge; **Jasvant signs off accuracy** (status moves
  draft → published on his review).

## Tradeoffs (explicit)
- ✅ Free, no ops, global CDN, fast, secure-by-default (static surface).
- ➖ No server-side accounts/enrollment, no server-graded assessments, no external Studio authoring,
  no server-issued certificates. (Progress is per-browser.)
- If those become requirements later, reintroduce a backend (or Open edX on a VM) — course content
  authored here (structured JSON/Markdown) is portable.

## Consequences
- "School" content is curated in-repo and reviewed before publish.
- Cloudflare Pages = deploy target; optionally Cloudflare for DNS/WAF on the custom domain.
- The earlier Open edX runbook (`deploy/DEPLOYMENT-openedx.md`) is kept for reference only.

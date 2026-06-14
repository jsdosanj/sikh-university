# ADR-0001: Platform foundation

**Status:** Proposed (awaiting confirmation) · **Date:** 2026-06-13

## Context
We need a global, open, MOOC-style university platform: free for anyone worldwide,
scholar-authored courses, video + readings + assessments + certificates, able to host
imported OpenCourseWare-style courses, with **security and openness as core values**.

## Options considered
1. **Fork Moodle** (the explicit ask). PHP monolith with ~30 plugin types. Strengths: huge
   community, deep plugins, classroom features. Weaknesses for *this* goal: it's a cohort/
   classroom LMS, not a global MOOC platform; large plugin attack surface (55 CVEs in 2024,
   38 in 2025, incl. RCE/SQLi/XSS) — at odds with "security as a core mission"; legacy
   architecture. Forking means inheriting and fighting that surface.
2. **Open edX** (recommended). Python/Django + React micro-frontends, deployed via Docker
   (Tutor). Built by MIT + Harvard for edX; 140M+ learners across 196 countries; MOOC-scale;
   **Studio** authoring for scholars; certificates; xBlock/OLX content (OCW imports map to OLX);
   curated, actively-secured core. AGPL/Apache — fully open.
3. **Canvas (open-core)** — Ruby on Rails; good UX, but open-core (key features gated) and
   higher-ed-course oriented, not global-MOOC oriented.
4. **Fully custom** (Next.js + Django/Postgres). Maximum control + cleanest "security-by-design"
   story, but re-implements authoring, video pipeline, grading, certs, scale — multi-year.

## Decision
Adopt **Open edX** as the foundation:
- Deploy with **Tutor** (official Docker distribution) → reproducible, container-isolated.
- **Brand and theme** it for the Sikh University via a custom micro-frontend (MFE) theme — this
  is where the "21st-century" look/feel lives, without forking the core.
- **Harden** per [SECURITY.md](SECURITY.md) (the "core mission").
- **Extend** with light custom xBlocks/integrations (e.g., Sikh Archive embeds, Gurbani viewer)
  rather than modifying core.

Rationale: fastest path to *best-in-class* for our exact use case; smallest security surface we
can own; real authoring tool for scholars; OCW-compatible; genuinely open; proven at global scale.

## Why not the literal "fork Moodle and customise"
It optimizes for the wrong workload (classroom vs. global MOOC), starts us behind on security,
and "customising into a MOOC" is more work than theming Open edX, which already is one.

## If full ownership is the priority
We can instead build a modern custom stack (Next.js + Django/DRF + Postgres + a video CDN).
Pick this only if owning every line outweighs ~1+ year of rebuild. We can also **start on Open
edX now and migrate later** — courses authored in OLX are portable.

## Consequences
- Requires DevOps: Docker/Kubernetes, MySQL + MongoDB, Linux; min ~8 GB RAM / 4 vCPU to start,
  scale-out on Kubernetes for global load. Managed hosting (e.g., a reputable Open edX provider)
  is a valid bridge while we build in-house ops capability.
- The custom work is **theme + integrations + content + hardening**, not core LMS plumbing.

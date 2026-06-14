# Roadmap (phased)

A platform this size ships in phases. Each phase is a usable milestone, not a big-bang launch.

## Phase 0 — Foundation (this repo) ✅ in progress
Vision, platform decision (ADR-0001), security model, content/licensing register, curriculum,
deployment runbook. Decide: platform confirmation, name, hosting, domain.

## Phase 1 — Pilot platform (private)
- Stand up **Open edX via Tutor** on a single host (staging); enable MFEs.
- Apply baseline hardening (TLS, MFA for staff, backups, dependency/image scanning).
- Custom **theme v1** (brand, colors, logo, fonts, RTL/Gurmukhi support).
- Author **1 flagship course** end-to-end: *Foundations of Sikhi* (from Sikh Archive material).
- Internal review only.

## Phase 2 — Soft launch (public beta)
- Production deploy behind a CDN/WAF; domain + email; status page.
- 3–5 courses live: Foundations of Sikhi, Gurmukhi I, AI Literacy, + 1 OCW partner course.
- Scholar onboarding workflow + review board v1; "report a correction."
- Free certificates of completion; accessibility + low-bandwidth pass.

## Phase 3 — Scale & partnerships
- Kubernetes scale-out for global concurrency; multi-region/CDN tuning.
- **Basics of Sikhi** partnership (embed/co-brand) once agreed.
- More OCW/HarvardX imports (rights-verified); Punjabi localization; mobile apps (PWA first).
- Community translation program; discussion + cohorts; analytics (privacy-respecting).

## Phase 4 — Sustainability & governance
- Non-profit/governance structure; scholar board formalized.
- Funding model that preserves "free & open" (donations/grants/sponsorship; NC content honored).
- Annual pen test; vuln disclosure program; transparency reports.

## Cross-cutting (every phase)
Security, accessibility, performance/low-bandwidth, and content-rights compliance are gates,
not features — checked before each milestone ships.

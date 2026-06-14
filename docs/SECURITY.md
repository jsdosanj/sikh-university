# Security model — a core mission, not an afterthought

Principle: **secure by design, private by default, auditable always.** An open university for a
global community (including people in places where their faith or speech may be sensitive) must
protect its learners.

## Identity & access
- SSO/OAuth2 + OIDC; strong password policy; **MFA available to all, required for staff/scholars/admins**.
- **Least-privilege RBAC**: learner / scholar-author / reviewer / admin — scoped capabilities, no shared admin accounts.
- Session hardening: short-lived tokens, secure+httpOnly+SameSite cookies, idle/absolute timeouts.

## Data protection & privacy
- **TLS 1.3 everywhere**; HSTS. Encryption at rest for DBs, backups, and object storage.
- **Data minimization** — collect only what's needed; no selling/ad-tracking; clear privacy policy.
- GDPR-style rights: export & delete my data; cookie consent; regional data considerations.
- PII segregated; secrets in a vault (never in code/images); rotation policy.

## Application security
- Secure SDLC: dependency scanning (SCA), SAST/DAST in CI, image scanning, signed builds.
- OWASP Top 10 controls; strict input validation/output encoding; CSP, anti-CSRF, rate limiting.
- **Minimize the plugin/attack surface** — a key reason we don't fork a plugin-heavy LMS;
  vet every xBlock/extension; pin and review dependencies.
- Coordinated **vulnerability disclosure** (security.txt + a reporting address); track upstream
  Open edX security advisories and patch promptly.

## Infrastructure & operations
- Container isolation (Tutor/Docker); network segmentation; WAF + DDoS protection at the edge (CDN).
- Centralized logging + audit trail (who changed which course/role/data); tamper-evident.
- Automated, **encrypted, tested backups**; documented disaster recovery (RPO/RTO targets).
- IaC with reviewed changes; no manual prod edits; staging mirrors prod.

## Content integrity & trust & safety
- Course publishing requires review (esp. doctrinal accuracy via the scholar board).
- Moderated discussions; abuse reporting; anti-spam.
- Provenance/attribution preserved for all imported open content.

## Governance
- Annual third-party pen test + ongoing automated scanning.
- Incident response runbook; breach notification process.
- Public **SECURITY.md / security.txt** with how to report issues responsibly.

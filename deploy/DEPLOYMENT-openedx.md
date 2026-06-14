# Deployment runbook — Open edX via Tutor

> Reference for Phase 1. Open edX is heavy: **don't run this on a laptop sandbox** — use a
> proper host/VM. Minimum to start: ~8 GB RAM / 4 vCPU / 50+ GB disk (Ubuntu LTS), Docker engine.
> Scale-out later on Kubernetes (Tutor supports `tutor k8s`).

## 1. Provision host
- Ubuntu LTS VM (a reputable cloud or on-prem). Open ports 80/443 only; SSH key-only; firewall on.
- Install Docker Engine + Compose plugin. Create a non-root deploy user.

## 2. Install Tutor (official distribution)
```bash
pip install "tutor[full]"          # or the pinned release for the current Open edX named release
tutor config save                   # interactive: set LMS/CMS domains, platform name, contact email
```

## 3. Branding & domains
```bash
tutor config save \
  --set "PLATFORM_NAME=Sikh University" \
  --set "LMS_HOST=learn.<domain>" \
  --set "CMS_HOST=studio.<domain>"
```
- DNS A/AAAA records → host; enable HTTPS (Tutor + Caddy/Let's Encrypt, or terminate at the CDN).

## 4. Launch
```bash
tutor local launch                  # builds + starts LMS, Studio (CMS), MySQL, MongoDB, etc.
tutor local do createuser --staff --superuser admin admin@<domain>
```

## 5. Micro-frontends (the modern UI) + theme
- Enable the MFE plugin; build a **custom theme** (`/theme`): logo, palette, Gurmukhi/RTL fonts,
  landing page. Keep customization in the theme/plugins layer — **never edit core**.

## 6. Security hardening (gate for any public exposure) — see ../docs/SECURITY.md
- TLS 1.3 + HSTS; CDN/WAF in front (DDoS, rate limiting).
- MFA for staff/scholars/admins; least-privilege roles; rotate the bootstrap admin.
- Secrets in a vault, not in `config.yml` committed to git (gitignore the rendered config).
- Enable + ship logs to central logging; turn on audit logging.
- Automated encrypted backups of MySQL + MongoDB + object storage; **test restores**.
- CI: dependency (SCA) + image scanning before deploy; pin versions; track Open edX security advisories.

## 7. Content pipeline
- Author in **Studio**; or import **OLX** course packages (OCW imports converted to OLX).
- Sikh Archive integration: start by embedding (iframes/links) + curated readings; later a
  custom xBlock for archive items / a Gurbani viewer.

## 8. Scale (Phase 3)
- Move to `tutor k8s` on a managed Kubernetes cluster; autoscale; multi-AZ DBs; CDN for media.
- Reference point from research: ~50k concurrent sessions achieved on ~7 optimized K8s nodes.

## Managed-hosting bridge (optional)
While in-house DevOps matures, a reputable Open edX hosting provider can run the platform; we keep
the theme, courses, and content portable (OLX) so we can move in-house anytime.

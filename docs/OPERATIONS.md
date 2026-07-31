# Operations runbook

How Sikhi University is deployed, monitored, and recovered. Written for whoever is on
call — including an AI agent or a future sevadar, not just the person who built it.

## Deploy

Production is a single Cloudflare Worker (`worker.js`) serving the Astro build in
`web/dist` plus the `/api/*` handlers.

- **Auto-deploy on merge.** A Cloudflare Workers Build git integration runs on every push
  to `master`: it runs the `wrangler.toml` `[build]` command (`cd web && npm install &&
  npm run build`) and deploys. No GitHub secret is needed for this.
- **The build is the gate.** `npm run build` runs the catalogue validator, the answer-strip
  assertion, and the Gurbani accuracy gate (`web/scripts/verify-gurbani.mjs`) before Astro
  builds, so a bad catalogue or a quote that contradicts canonical text fails the deploy.
- **Manual fallback.** The Cloudflare build can take 2+ minutes and occasionally does not
  self-complete. If a merge hasn't gone live within a few minutes, deploy from an
  authenticated machine: `wrangler deploy` (uses your `wrangler login` OAuth). Verify with
  `curl -s https://sikhiuni.com/api/health`.
- **Catalogue → R2.** The browser-served catalogue (`courses.json`, answer-stripped) is
  published to R2 by `.github/workflows/deploy.yml` on merge — but only if the repo secret
  `CLOUDFLARE_API_TOKEN` is set (R2 Storage:Edit). Without it, that step skips; publish
  manually with `cd web && npm run deploy-data`.

## Monitoring

- **`GET /api/health`** probes D1 and R2 directly and returns `{ok,db,r2}` (503 if either is
  down). A D1 outage looks like a healthy homepage otherwise, so always check this endpoint.
- **`uptime.yml`** curls `/api/health` + the homepage every 30 min and emails on failure.
- **`freshness.yml`** fails daily if the canonical snapshot is 100+ days old (a stalled
  refresh).

## Runbooks

**D1 (database) down / corrupted.** Symptoms: logins fail, dashboards empty, `/api/health`
`db:false`. There is no failover — D1 has built-in point-in-time restore (Time Travel, 7
days): `wrangler d1 time-travel restore sikh-university --timestamp=<ISO>`. For older data,
restore from the monthly export in the `sikh-university-backups` R2 bucket
(`wrangler d1 execute sikh-university --remote --file=<dump.sql>`). Communicate via a banner
while restoring.

**R2 (storage) down.** Symptoms: the catalogue or audio won't load, `/api/health` `r2:false`.
Nothing to fail over to; wait for Cloudflare. (Most course data moved off R2 in the
data-layer split, so the blast radius is media + the legacy `courses.json` route.)

**Resend (email) down / quota exhausted.** Symptom: `/api/auth/request` returns 502; existing
sessions keep working (30-day cookie). Sign-in is fully email-dependent — check the Resend
dashboard quota and bump if needed. Failures are logged (`auth_request` errors in Workers
Logs).

**Snapshot refresh failed.** The freshness canary will alert. Re-run
`Refresh Gurbani snapshot` via `workflow_dispatch`, or locally:
`python3 scripts/build_gurbani_snapshot.py` then open a PR. CI re-verifies quotes against
the new snapshot; a mismatch means BaniDB changed a tuk a course quotes — review before merge.

**Accuracy gate failed a PR/deploy.** A quoted shabad does not match canonical text at its
cited ang, or cites the wrong ang. The build log names the course + ang. Fix the quote (or
the `data-ang`) — do not weaken the gate.

**Sole admin locked out of MFA.** The single admin account (from `ADMIN_EMAILS`) lost their
authenticator and can't clear `/mfa`. Recovery ladder: their own backup codes first; if
those are gone too, delete the enrollment directly against production D1 — this is safe
because admin identity is already anchored to `ADMIN_EMAILS` + mailbox control, not to MFA
itself:
```bash
wrangler d1 execute sikh-university --remote --command \
  "DELETE FROM user_mfa WHERE user_id IN (SELECT id FROM users WHERE email='<admin email>')"
```
They can then sign in via magic link and re-enroll from `/mfa`. The same `mfa_reset` action
is available for a locked-out teacher from the admin Teachers tab (`POST /api/admin/users
{id, action:'mfa_reset'}`) — no direct D1 access needed for that case.

**Importing approved course drafts.** Scholar review happens in D1 (`/review`); publishing a
course is still a git PR, never a runtime mutation. Once one or more drafts are
`status='approved'`:
1. Confirm the `EXPORT_TOKEN` repo secret is set (Settings → Secrets and variables → Actions)
   — it must match the `EXPORT_TOKEN` Worker secret.
2. Run the import: `gh workflow run import-drafts.yml` (or trigger it from the Actions tab).
   Zero approved drafts → the job exits cleanly, no PR.
3. Review the opened `import/drafts-YYYY-MM-DD` PR like any other catalogue change — it runs
   the full existing gate suite (`validate.py`, quiz-key parity, answer-strip, emoji, CSP).
4. Once it merges and deploys, click **Mark published** next to each course in the admin
   Review tab (or `POST /api/admin/drafts-mark-published {draftId}`) to close the loop in D1.

**Retiring a published course.** A teacher can't delete a live, git-managed catalogue entry
directly — no staging environment, and courses.json has a no-shrink CI guard. Instead a
teacher files a request from their dashboard (`POST /api/teacher/archive-request
{courseId, reason}`), which an admin reviews in the Review tab's "Course archive requests"
section:
1. Approve or deny the pending request. Approving queues it for the next import run.
2. Run `gh workflow run import-drafts.yml` — the same run that imports approved drafts also
   fetches approved archive requests and flips the matching course's `status` to `"archived"`
   in the same PR. Archived courses drop out of `/catalog`, search, sitemaps, and quiz grading,
   but existing enrollments/certificates/progress records are untouched.
3. If this drops the published count below `scripts/catalogue-baseline.json`'s
   `published_min`, `validate.py` will (correctly) fail the PR until you re-run with
   `ALLOW_CATALOGUE_SHRINK=1` and lower `published_min` in the same change — this is the
   guard doing its job (a deliberate archive, not a corrupt file), not a bug.
4. Once the PR merges and deploys, click **Mark archived** in the Review tab (or
   `POST /api/admin/archive-requests {id, decision:'mark_archived'}`) to close the loop in D1.

## Content

- **Add/edit a course:** edit `site/assets/data/courses.json`, then run
  `python3 scripts/validate.py`, `python3 scripts/build_quiz_keys.py`, and
  `python3 scripts/build_paths.py`. The build regenerates the slim indexes and the
  verification report. See CONTRIBUTING.md.
- **Refresh the canonical snapshot:** `python3 scripts/build_gurbani_snapshot.py` (monthly
  via `snapshot-refresh.yml`).

## Known pending ops tasks

- Move `ADMIN_EMAILS` from `wrangler.toml [vars]` to a Worker secret
  (`wrangler secret put ADMIN_EMAILS`) — the local OAuth token could not write secrets; do
  it from the Cloudflare dashboard. Code reads it identically either way.
- Add the `CLOUDFLARE_API_TOKEN` repo secret (R2 Storage:Edit) to enable the automatic R2
  catalogue sync and archival backup workflows.
- Set the two Worker secrets the teacher platform needs before it can run in production:
  `wrangler secret put MFA_ENC_KEY` (base64 256-bit key, e.g.
  `openssl rand -base64 32`) and `wrangler secret put EXPORT_TOKEN` (any long random
  string — mirror it as a GitHub repo secret of the same name for `import-drafts.yml`).

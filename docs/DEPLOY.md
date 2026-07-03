# Deploy runbook

Operational reference for the live Sikh University Worker
(`sikh-university.dosanjhlabs.com`). Architecture is described in
[BACKEND-cloudflare.md](BACKEND-cloudflare.md).

## The moving parts
A full production update can touch three independent things:

1. **Code + static site** — `worker.js`, `functions/api/*`, and the Astro build (`web/dist`).
   Shipped by `wrangler deploy`. The `[build]` command in `wrangler.toml` builds the
   frontend first: `cd web && npm install && npm run build && rm -f dist/assets/data/courses.json`.
2. **Course catalogue** — `site/assets/data/courses.json`. Served from R2, **not** from the
   deploy, so it must be pushed separately (see below).
3. **Client cache** — the service worker (`web/public/sw.js`) caches the app shell. Bump its
   cache version to force clients to refresh immediately.

## Deploy the code + site

### Automatic (default)
Production **auto-deploys on merge to `master`** via GitHub Actions. Every push and PR to
`master` first runs the CI validation workflow (`.github/workflows/ci.yml`):

- `node --check` on `site/assets/app.js`, `worker.js`, and every file under `functions/`;
- `python3 scripts/validate.py` on the course catalogue.

Merge the PR once CI is green and the deploy job publishes the Worker to production.

### Manual fallback
From a maintainer laptop with `wrangler` authenticated to the Dosanjh Labs account:

```bash
wrangler deploy        # runs the [build] command, then publishes worker.js + web/dist
```

## Push the course catalogue to R2 (required after any catalogue change)
`site/assets/data/courses.json` (~43 MB) exceeds Cloudflare's 25 MiB asset limit, so the
build strips it from `web/dist` and the Worker serves it from R2 (`worker.js`). **`wrangler
deploy` alone does NOT update the catalogue** — the R2 object must be pushed separately, or
the site will show a stale course count.

After any change to `site/assets/data/courses.json`:

```bash
cd web && npm run deploy-data
# = wrangler r2 object put sikh-university-media/courses.json \
#     --file ../site/assets/data/courses.json --remote --config ../wrangler.toml
```

The Worker caches the R2 object for 1 hour. For an immediate client refresh, bump the
service-worker cache (below) and redeploy.

## Bump the service-worker cache
Edit the cache version at the top of `web/public/sw.js`:

```js
var CACHE = 'su-web-v11';   // → 'su-web-v12', etc.
```

Incrementing it invalidates the old app-shell cache so returning clients pick up the new
build on next load. Redeploy the site after bumping.

## D1 schema & migrations
The authoritative schema is `schema.sql`. Most tables are created with `IF NOT EXISTS`, and
several are also auto-created by their handlers on first write (discussions, ratings,
certificates, gradebook, announcements, enrollments, feedback, audit events) — so new
handlers need no manual migration.

Apply the schema to a database:

```bash
wrangler d1 execute sikh-university --remote --file schema.sql     # --local for local dev
```

### Adding columns to existing tables (one-off migrations)
`IF NOT EXISTS` does not add columns to a table that already exists. When a column is added,
run the `ALTER TABLE` once against the live DB. Example — the profile columns added to
`users`:

```bash
wrangler d1 execute sikh-university --remote --command "ALTER TABLE users ADD COLUMN country TEXT"
wrangler d1 execute sikh-university --remote --command "ALTER TABLE users ADD COLUMN languages TEXT"
```

(The `enrollments` table auto-creates on first write, so it needs no migration.)

## Local development
Root scripts drive local dev:

```bash
npm install       # root + web dependencies
npm run dev       # Worker + Astro frontend together
npm run db:seed   # seed a local D1 database
```

To create/bind resources for a fresh environment:

```bash
wrangler d1 create sikh-university          # then set database_id in wrangler.toml
wrangler r2 bucket create sikh-university-media
wrangler d1 execute sikh-university --local --file schema.sql
```

`RESEND_API_KEY` is a secret. Without it, `functions/api/auth/request.js` runs in dev mode
and returns the magic link in the response instead of emailing it.

## Backups & restore (D1)
Export a full snapshot:

```bash
wrangler d1 export sikh-university --remote --output backup.sql
```

Restore into a database from that snapshot:

```bash
wrangler d1 execute sikh-university --remote --file backup.sql
```

D1 Time Travel can also roll a database back without a manual snapshot:

```bash
wrangler d1 time-travel info sikh-university
wrangler d1 time-travel restore sikh-university --timestamp="2026-07-01T00:00:00Z"
```

R2 media/catalogue objects are re-pushable from source (`npm run deploy-data` for the
catalogue); keep the source `courses.json` and media under version control / backup as the
source of truth.

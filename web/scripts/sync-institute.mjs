// Copy the Institute data tree into public/ so pages can fetch it at runtime
// (dev) and so the manifest ships as a static asset. Node-only; runs first in
// `npm run build`.
//
//   src/data/institute/manifest.json      -> public/data/institute/manifest.json
//   src/data/institute/professors.json    -> public/data/institute/professors.json
//   src/data/institute/imported/**        -> public/data/institute/lessons/**   (Wave 4)
//   src/data/institute/ours/**            -> merged over lessons/** at read time (Wave 4)
//   src/data/institute/dojo/**            -> public/data/institute/dojo/**       (Wave 3)
//
// Wave 4+ note: the large lesson bodies are STRIPPED from public/ before
// `astro build` (Cloudflare's 25 MiB asset limit) and pushed to R2 by
// `npm run deploy-institute`. A `wrangler deploy` that skips that push ships an
// empty catalogue — same discipline as courses.json (`deploy-data`).
import { cpSync, mkdirSync, existsSync, readFileSync } from 'node:fs';

const SRC = 'src/data/institute';
const OUT = 'public/data/institute';

mkdirSync(OUT, { recursive: true });

// Always: the manifest + professor cards (small, safe to ship as assets).
cpSync(`${SRC}/manifest.json`, `${OUT}/manifest.json`);
cpSync(`${SRC}/professors.json`, `${OUT}/professors.json`);

// Wave 3+: dojo scripts (still small enough to ship as assets).
if (existsSync(`${SRC}/dojo`)) {
  cpSync(`${SRC}/dojo`, `${OUT}/dojo`, { recursive: true });
}

// Wave 4+: lesson bodies. For dev/runtime they land in public/data/institute/
// lessons/; the build's strip step removes them before astro build.
if (existsSync(`${SRC}/imported`)) {
  cpSync(`${SRC}/imported`, `${OUT}/lessons`, { recursive: true });
}

const m = JSON.parse(readFileSync(`${SRC}/manifest.json`, 'utf-8'));
console.log(
  `synced institute: ${m.tracks.length} tracks, ${m.explore.length} explore, schema v${m.schemaVersion}`,
);

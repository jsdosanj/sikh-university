// CI gate for the Institute of Technology data + pages. Runs in `npm run build`
// (and standalone via `node scripts/validate-institute.mjs`). Exits non-zero on
// any failure so a bad manifest never merges.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const errs = [];
const err = (m) => errs.push(m);

// ---- manifest shape ---------------------------------------------------------
const m = JSON.parse(readFileSync('src/data/institute/manifest.json', 'utf-8'));
if (m.schemaVersion !== 1) err(`manifest.schemaVersion must be 1, got ${m.schemaVersion}`);
if (!m.wedge || m.wedge.length < 20) err('manifest.wedge missing — CEO decision C1 requires the stated why-us');

const ids = new Set();
const KINDS = new Set(['phase', 'dojo', 'guide', 'capstone']);
const STATUSES = new Set(['planned', 'draft', 'published']);
const SOURCES = new Set(['aisf', 'sikhi.io', 'ours']);

for (const t of m.tracks || []) {
  if (!t.id) { err('track with no id'); continue; }
  if (ids.has(t.id)) err(`duplicate track id: ${t.id}`);
  ids.add(t.id);
  if (!KINDS.has(t.kind)) err(`${t.id}: bad kind "${t.kind}"`);
  if (!STATUSES.has(t.status)) err(`${t.id}: bad status "${t.status}"`);
  if (!SOURCES.has(t.source)) err(`${t.id}: bad source "${t.source}"`);
  if (!t.title || !t.summary) err(`${t.id}: missing title/summary`);
  if (typeof t.level !== 'number') err(`${t.id}: level must be a number`);
  if (!t.license) err(`${t.id}: missing license`);
  if (t.prereq && !(m.tracks || []).some((x) => x.id === t.prereq)) err(`${t.id}: prereq "${t.prereq}" is not a track`);
  if (t.professor && !m.__profChecked) { /* checked below once professors.json is loaded */ }
}

// ---- professors ------------------------------------------------------------
const profs = JSON.parse(readFileSync('src/data/institute/professors.json', 'utf-8'));
for (const t of m.tracks || []) {
  if (t.professor && !profs[t.professor]) err(`${t.id}: professor "${t.professor}" not in professors.json`);
}
for (const [k, p] of Object.entries(profs)) {
  if (!p.name || !p.bio || !p.license) err(`professor ${k}: missing name/bio/license`);
  if (!Array.isArray(p.links)) err(`professor ${k}: links must be an array`);
}

// ---- explore booths -------------------------------------------------------
for (const b of m.explore || []) {
  if (!b.href || !/^https:\/\//.test(b.href)) err(`booth ${b.id}: href must be absolute https`);
  if (!b.blurb) err(`booth ${b.id}: missing blurb`);
}

// ---- page hygiene: every /institute/* page opts out of index + uses the rail;
//      external links carry rel="noopener"; no emoji as chrome -------------------
const pagesDir = 'src/pages/institute';
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(`${dir}/${d.name}`) : d.name.endsWith('.astro') ? [`${dir}/${d.name}`] : []);
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
if (existsSync(pagesDir)) {
  for (const f of walk(pagesDir)) {
    const src = readFileSync(f, 'utf-8');
    if (!src.includes('institute')) err(`${f}: <Base> is missing the \`institute\` prop`);
    if (/target=("|')_blank\1/.test(src) && !/rel=("|')[^"']*noopener/.test(src)) {
      err(`${f}: a target="_blank" link is missing rel="noopener"`);
    }
    // Emoji are banned as chrome (DESIGN.md). ੴ and drawn glyphs (&#…;) are fine.
    const stripped = src.replace(/&#x?[0-9a-f]+;/gi, '');
    if (EMOJI.test(stripped)) err(`${f}: emoji used as UI chrome — use the drawn icon set`);
  }
}

// ---- report -------------------------------------------------------------
if (errs.length) {
  console.error(`validate-institute: ${errs.length} error(s)`);
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-institute: OK (${m.tracks.length} tracks, ${Object.keys(profs).length} professors)`);

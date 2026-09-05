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

// ---- page hygiene: every /technology/* page carries the `institute` prop +
//      the rail; external links carry rel="noopener"; no emoji as chrome --------
const pagesDir = 'src/pages/technology';
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

// ---- imported AISF lessons ------------------------------------------------
const IMP = 'src/data/institute/imported';
if (existsSync(IMP)) {
  for (const track of readdirSync(IMP, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const t = (m.tracks || []).find((x) => x.id === track);
    if (!t) { err(`imported/${track}: no matching track in manifest`); continue; }
    let idx;
    try { idx = JSON.parse(readFileSync(`${IMP}/${track}/index.json`, 'utf-8')); }
    catch { err(`imported/${track}: missing or bad index.json`); continue; }
    if (t.status === 'published' && idx.lessons.length !== t.lessonCount) {
      err(`${track}: manifest lessonCount ${t.lessonCount} != ${idx.lessons.length} imported lessons`);
    }
    for (const lref of idx.lessons) {
      let lesson;
      try { lesson = JSON.parse(readFileSync(`${IMP}/${track}/${lref.slug}.json`, 'utf-8')); }
      catch { err(`${track}/${lref.slug}.json: missing or unreadable`); continue; }
      if (!lesson.title || !lesson.prose_html) err(`${track}/${lref.slug}: missing title/prose_html`);
      if (/<script\b/i.test(lesson.prose_html) || /\son\w+=/i.test(lesson.prose_html)) {
        err(`${track}/${lref.slug}: prose_html contains a script or event handler — the sanitiser let something through`);
      }
      for (const q of lesson.quiz || []) {
        if (!Array.isArray(q.options) || q.options.length < 2) err(`${track}/${lref.slug}: quiz option list < 2`);
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) {
          err(`${track}/${lref.slug}: quiz answer index out of range`);
        }
      }
    }
  }
}

// ---- ours/ sidecars (C7): authored labs for a lesson --------------------
const OURS = 'src/data/institute/ours';
const LAB_LANGS = new Set(['js', 'html', 'py']);
if (existsSync(OURS)) {
  for (const track of readdirSync(OURS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const f of readdirSync(`${OURS}/${track}`).filter((n) => n.endsWith('.json'))) {
      const slug = f.replace(/\.json$/, '');
      // intro.json is a track-level sidecar (the seva-framed phase intro, C4),
      // not a per-lesson override — it has no matching imported lesson.
      if (f === 'intro.json') {
        let intro;
        try { intro = JSON.parse(readFileSync(`${OURS}/${track}/${f}`, 'utf-8')); }
        catch { err(`ours/${track}/intro.json: not valid JSON`); continue; }
        if (typeof intro.blurb !== 'string' || intro.blurb.trim().length < 20) {
          err(`ours/${track}/intro.json: needs a "blurb" string`);
        }
        if (!(m.tracks || []).some((x) => x.id === track)) {
          err(`ours/${track}/intro.json: no matching track "${track}" in manifest`);
        }
        continue;
      }
      if (!existsSync(`${IMP}/${track}/${slug}.json`)) {
        err(`ours/${track}/${f}: no matching imported lesson ${track}/${slug}.json`);
        continue;
      }
      let o;
      try { o = JSON.parse(readFileSync(`${OURS}/${track}/${f}`, 'utf-8')); }
      catch { err(`ours/${track}/${f}: not valid JSON`); continue; }
      if (o.lab) {
        const L = o.lab;
        if (!LAB_LANGS.has(L.lang || 'js')) err(`ours/${track}/${f}: lab.lang "${L.lang}" not one of js/html/py`);
        if (typeof L.starter !== 'string' || !L.starter.trim()) err(`ours/${track}/${f}: lab.starter missing`);
        for (const [ci, c] of (L.checks || []).entries()) {
          if (!c.name || !c.test) err(`ours/${track}/${f}: lab.checks[${ci}] needs name + test`);
        }
      }
    }
  }
}

// ---- report -------------------------------------------------------------
if (errs.length) {
  console.error(`validate-institute: ${errs.length} error(s)`);
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-institute: OK (${m.tracks.length} tracks, ${Object.keys(profs).length} professors)`);

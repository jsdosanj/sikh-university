// Build-time Gurbani verification gate (node-only, runs in `npm run build`).
// Matches every quoted tuk (blockquote.gurbani[data-ang], SGGS-labelled) against the
// committed canonical snapshot (../scripts/gurbani-snapshot.json). Writes
// public/data/verification.json (per-course counts for badges + the integrity page),
// and EXITS 1 if any quote MISMATCHES canonical text — a fail-closed accuracy gate.
// It does NOT fail on "uncovered" quotes (Dasam/Sarbloh, or angs not yet snapshotted),
// so it can never wedge the pipeline on the unverified backlog; only a contradiction fails.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';

const SGGS_LABEL = 'ਸ੍ਰੀ ਗੁਰੂ ਗਰੰਥ ਸਾਹਿਬ';
const src = JSON.parse(readFileSync('../site/assets/data/courses.json', 'utf-8'));
const snap = existsSync('../scripts/gurbani-snapshot.json')
  ? JSON.parse(readFileSync('../scripts/gurbani-snapshot.json', 'utf-8')).angs
  : {};

function norm(s) {
  return s.normalize('NFC')
    .replace(/[।॥]/g, ' ')          // danda / double-danda
    .replace(/[੦-੯0-9]+/g, ' ')     // Gurmukhi + ASCII digits (verse numbers)
    .replace(/\s+/g, ' ').trim();
}

const BLOCK = /<blockquote class="gurbani[^"]*" data-ang="(\d+)">([\s\S]*?)<\/blockquote>/g;
const GUR = /<p class="gur[^"]*"[^>]*>([\s\S]*?)<\/p>/g;

const per = {};
const tot = { verified: 0, mismatch: 0, uncovered: 0 };
const mismatches = [];

for (const c of src.courses || []) {
  if (c.status !== 'published') continue;
  for (const l of c.lessons || []) {
    const html = l.html || '';
    let m;
    BLOCK.lastIndex = 0;
    while ((m = BLOCK.exec(html))) {
      const ang = m[1], inner = m[2];
      const isSggs = inner.includes(SGGS_LABEL);
      let g;
      GUR.lastIndex = 0;
      while ((g = GUR.exec(inner))) {
        const txt = norm(g[1].replace(/<[^>]+>/g, ' '));
        if (!txt) continue;
        const p = (per[c.id] ||= { verified: 0, mismatch: 0, uncovered: 0 });
        if (isSggs && snap[ang]) {
          if (snap[ang].includes(txt)) { p.verified++; tot.verified++; }
          else { p.mismatch++; tot.mismatch++; mismatches.push(`${c.id} ang ${ang}: ${txt.slice(0, 60)}`); }
        } else { p.uncovered++; tot.uncovered++; }
      }
    }
  }
}

const total = tot.verified + tot.mismatch + tot.uncovered;
const coursesFullyVerified = Object.values(per).filter((v) => v.verified && !v.mismatch && !v.uncovered).length;
const summary = {
  generated: true, totals: tot, totalQuotes: total,
  coursesWithQuotes: Object.keys(per).length, coursesFullyVerified,
  snapshotAngs: Object.keys(snap).length, courses: per,
};
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/verification.json', JSON.stringify(summary));

console.log(`verify-gurbani: ${total} quotes / ${Object.keys(per).length} courses — ` +
  `verified ${tot.verified}, mismatch ${tot.mismatch}, uncovered ${tot.uncovered} ` +
  `(snapshot ${Object.keys(snap).length} angs)`);

if (tot.mismatch > 0) {
  console.error('ACCURACY GATE FAILED: quoted Gurbani does not match canonical text:');
  mismatches.slice(0, 20).forEach((x) => console.error('  - ' + x));
  process.exit(1);
}

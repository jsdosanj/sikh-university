#!/usr/bin/env node
// Build web/public/assets/gurbani/santhya-dasam-index.json from
// scripts/dasam-tracks.json (the Kabaal Singh / Hazoor Sahib Bir recording
// list) — fully offline.
//
// Method: chapters.json anchors each bani to its ang span in the 1428-ang
// reader corpus. Within one bani, consecutive tracks partition the span so
// that each track's share of the bani's total DURATION matches its share of
// the bani's total TEXT WEIGHT (the same per-word heuristic the reader's
// live sync uses, web/src/lib/santhya-sync.ts) — recitation time tracks text
// length, so duration is the best offline signal for where each track's angs
// begin. Boundaries snap to whole angs; every ang in a covered span gets
// exactly one track.
//
// URL filenames are gurmatveechar's `NNN--<Collection>--<Title>.mp3` pattern
// (same shape as the committed SGGS index). Run scripts/verify-audio-index.mjs
// from a network-enabled machine to HEAD-check every URL and auto-correct the
// filename pattern if gurmatveechar's differs.
import { readFileSync, writeFileSync } from 'node:fs';

const TRACKS = JSON.parse(readFileSync('scripts/dasam-tracks.json', 'utf8'));
const CHAPTERS = JSON.parse(readFileSync('web/public/assets/gurbani/chapters.json', 'utf8')).dasam;
const MAX_ANG = 1428;

// Same weight model as web/src/lib/santhya-sync.ts (keep in step).
const vishram = (w) => (w.includes('॥') ? 3.2 : w.includes(';') ? 1.6 : w.includes('.') ? 0.9 : 0);
const wordWeight = (w) => 0.6 + 0.22 * w.replace(/[॥;.]/g, '').length + vishram(w);
function angWeight(n) {
  const d = JSON.parse(readFileSync(`web/public/assets/gurbani/dasam/${n}.json`, 'utf8'));
  let t = 0;
  for (const line of d.lines || []) for (const tok of line.split(/\s+/)) if (tok) t += wordWeight(tok);
  return t;
}

const durSec = (s) => s.split(':').reduce((a, b) => a * 60 + Number(b), 0);
const BASE = `https://www.gurmatveechar.com/audios/${TRACKS.folder}/`;
const COLLECTION = 'Sri.Dasam.Granth.Sahib.(Hazoor.Sahib.Bir)';
const fileFor = (t) => `${String(t.n).padStart(3, '0')}--${COLLECTION}--${t.title.replace(/ /g, '.')}.mp3`;

// Group mapped tracks by chapter, in listing order.
const groups = new Map();
for (const t of TRACKS.tracks) {
  if (t.skip || t.mapped === false) continue;
  if (!groups.has(t.chapter)) groups.set(t.chapter, []);
  groups.get(t.chapter).push(t);
}

// Each chapter's ang span = its anchor to the next chapter's anchor - 1.
const spanFor = (label) => {
  const i = CHAPTERS.findIndex((c) => c.label === label);
  if (i === -1) throw new Error(`chapter not in chapters.json: ${label}`);
  return { start: CHAPTERS[i].ang, end: i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].ang - 1 : MAX_ANG };
};

const index = [];
let covered = 0;
for (const [label, tracks] of groups) {
  const { start, end } = spanFor(label);
  const angs = [];
  for (let a = start; a <= end; a++) angs.push({ a, w: angWeight(a) });
  const totalW = angs.reduce((s, x) => s + x.w, 0);
  const totalD = tracks.reduce((s, t) => s + durSec(t.dur), 0);

  // Walk angs, cutting a boundary when cumulative text weight reaches the
  // track's cumulative duration share.
  let ai = 0, cumW = 0, cumD = 0;
  for (let ti = 0; ti < tracks.length; ti++) {
    const t = tracks[ti];
    cumD += durSec(t.dur);
    const targetW = (cumD / totalD) * totalW;
    const s = angs[ai].a;
    if (ti === tracks.length - 1) { ai = angs.length; } // last track takes the rest
    else {
      while (ai < angs.length - (tracks.length - 1 - ti) && cumW + angs[ai].w <= targetW) { cumW += angs[ai].w; ai++; }
      if (angs[ai - 1] === undefined || angs[ai - 1].a < s) ai = Math.min(ai + 1, angs.length); // every track owns >=1 ang
    }
    const e = ai < angs.length ? angs[ai].a - 1 : end;
    index.push({ start: s, end: Math.max(s, e), url: BASE + fileFor(t), title: `${label} · ${t.title} (Ang ${s}-${Math.max(s, e)})` });
    covered += Math.max(s, e) - s + 1;
  }
}

index.sort((x, y) => x.start - y.start);
// Sanity: contiguous, non-overlapping coverage from first to last mapped ang.
for (let i = 1; i < index.length; i++) {
  if (index[i].start !== index[i - 1].end + 1) {
    throw new Error(`gap/overlap at ${index[i - 1].title} -> ${index[i].title}`);
  }
}

writeFileSync('web/public/assets/gurbani/santhya-dasam-index.json', JSON.stringify(index, null, 1) + '\n');
const skipped = TRACKS.tracks.filter((t) => t.skip).length;
const unmapped = TRACKS.tracks.filter((t) => t.mapped === false).length;
console.log(`santhya-dasam-index: ${index.length} segments, angs ${index[0].start}-${index[index.length - 1].end} (${covered} covered)`);
console.log(`  ${skipped} intro/katha tracks skipped; ${unmapped} supplementary-bani tracks outside the ${MAX_ANG}-ang corpus left unmapped`);

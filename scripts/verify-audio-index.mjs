#!/usr/bin/env node
// Verify (and self-heal) the santhya audio indexes against gurmatveechar.com.
//
//   node scripts/verify-audio-index.mjs            # check both indexes
//   node scripts/verify-audio-index.mjs dasam      # just one
//
// Run from a network-enabled machine (the cloud sandbox blocks gurmatveechar).
// For every entry it requests the URL (Range: first byte — cheap, some servers
// reject HEAD). A miss tries the known gurmatveechar filename patterns for the
// same track and REWRITES the index with the first that hits, so a wrong
// pattern guess never ships as 89 broken links. Exits non-zero if any entry
// stays unresolved.
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = {
  sggs: 'web/public/assets/gurbani/santhya-sggs-index.json',
  dasam: 'web/public/assets/gurbani/santhya-dasam-index.json',
};
const only = process.argv[2];

async function alive(url) {
  try {
    const r = await fetch(new URL(url), { headers: { Range: 'bytes=0-0' }, redirect: 'follow' });
    return r.ok || r.status === 206;
  } catch { return false; }
}

// Candidate filename builders for one entry, derived from its current URL.
function candidates(url) {
  const i = url.lastIndexOf('/');
  const dir = url.slice(0, i + 1);
  const file = url.slice(i + 1); // NNN--Collection--Title.mp3
  const m = file.match(/^(\d{3})--(.+?)--(.+)\.mp3$/);
  if (!m) return [url];
  const [, nnn, collection, title] = m;
  const artist = 'Kabaal.Singh.(Hazoor.Sahib.wale)';
  return [
    url,
    `${dir}${nnn}--${artist}--${title}.mp3`,
    `${dir}${nnn}--${title}.mp3`,
    `${dir}${nnn}--${collection}--${title.replace(/[()]/g, '')}.mp3`,
    `${dir}${nnn}--${artist}--${title.replace(/[()]/g, '')}.mp3`,
    `${dir}${title}.mp3`,
  ];
}

let failed = 0;
for (const [name, path] of Object.entries(FILES)) {
  if (only && only !== name) continue;
  const index = JSON.parse(readFileSync(path, 'utf8'));
  let fixed = 0, dead = [];
  for (const entry of index) {
    if (await alive(entry.url)) { process.stdout.write('.'); continue; }
    let ok = false;
    for (const cand of candidates(entry.url).slice(1)) {
      if (await alive(cand)) { entry.url = cand; fixed++; ok = true; process.stdout.write('+'); break; }
    }
    if (!ok) { dead.push(entry.title); process.stdout.write('x'); }
  }
  console.log(`\n${name}: ${index.length} entries, ${fixed} auto-corrected, ${dead.length} unresolved`);
  if (fixed) writeFileSync(path, JSON.stringify(index, null, 1) + '\n');
  if (dead.length) { failed++; dead.slice(0, 10).forEach((t) => console.log('  DEAD: ' + t)); }
}
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
// i18n key completeness check.
//
// Collects every data-i18n / data-i18n-ph / data-i18n-aria key used in
// web/src/**/*.astro and diffs them against each dictionary in
// web/public/assets/i18n/<lang>.json.
//
//   MISSING key (used in markup, absent from a dictionary)  -> FATAL (exit 1)
//   ORPHAN key (in a dictionary, unused in markup)          -> warning only
//
// Run: node scripts/i18n-extract.mjs   (wired into `npm run check-i18n` in web/)

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'web/src');
const I18N_DIR = join(ROOT, 'web/public/assets/i18n');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.astro')) yield p;
  }
}

// Keys appear three ways: as markup attributes, via window.suRelabel(el, key,
// fallback) for JS-driven labels, and via setAttribute('data-i18n', key).
const KEY_RES = [
  /data-i18n(?:-ph|-aria)?=["']([\w.-]+)["']/g,
  /suRelabel\([^,)]+,\s*['"]([\w.-]+)['"]/g,
  /setAttribute\(\s*['"]data-i18n(?:-ph|-aria)?['"]\s*,\s*['"]([\w.-]+)['"]/g,
];
const used = new Map(); // key -> first file seen
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  for (const re of KEY_RES) {
    for (const m of text.matchAll(re)) {
      if (!used.has(m[1])) used.set(m[1], file.slice(ROOT.length + 1));
    }
  }
}

const dicts = readdirSync(I18N_DIR).filter((f) => f.endsWith('.json')).sort();
let missingTotal = 0;
let orphanTotal = 0;

for (const dict of dicts) {
  const lang = dict.replace(/\.json$/, '');
  const entries = JSON.parse(readFileSync(join(I18N_DIR, dict), 'utf8'));
  const have = new Set(Object.keys(entries));
  const missing = [...used.keys()].filter((k) => !have.has(k)).sort();
  const orphans = [...have].filter((k) => !used.has(k)).sort();
  if (missing.length) {
    missingTotal += missing.length;
    console.error(`✗ ${lang}: ${missing.length} missing key(s):`);
    for (const k of missing) console.error(`    ${k}  (used in ${used.get(k)})`);
  }
  if (orphans.length) {
    orphanTotal += orphans.length;
    console.warn(`⚠ ${lang}: ${orphans.length} orphan key(s) (in dictionary, unused in markup): ${orphans.join(', ')}`);
  }
  if (!missing.length && !orphans.length) console.log(`✓ ${lang}: complete (${have.size} keys)`);
}

console.log(`check-i18n: ${used.size} keys in markup, ${dicts.length} dictionaries, ${missingTotal} missing, ${orphanTotal} orphans`);
if (missingTotal) {
  console.error('check-i18n: FAIL — add the missing keys to every dictionary (translations ship complete).');
  process.exit(1);
}

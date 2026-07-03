// Per-course Gurbani verification status, read once at build time from the report that
// web/scripts/verify-gurbani.mjs writes before `astro build`. A course counts as verified
// only if it quotes Sri Guru Granth Sahib Ji and every quote matches canonical text with
// nothing uncovered — so the badge is an earned claim, never a default. Absent in `astro
// dev` (the report isn't generated there), in which case nothing is marked verified.
import { readFileSync, existsSync } from 'node:fs';

type Counts = { verified: number; mismatch: number; uncovered: number };
let courses: Record<string, Counts> = {};
try {
  if (existsSync('./public/data/verification.json')) {
    courses = JSON.parse(readFileSync('./public/data/verification.json', 'utf-8')).courses || {};
  }
} catch { /* report absent — leave empty */ }

export function isVerified(id: string): boolean {
  const v = courses[id];
  return !!(v && v.verified > 0 && !v.mismatch && !v.uncovered);
}

#!/usr/bin/env node
// Emoji-ban guard (DESIGN.md "Iconography — law"): emoji are banned as UI glyphs
// on core surfaces. Scans the Astro UI source (web/src) for pictographic emoji and
// emoji-presentation symbols and exits 1 if any are found. Node-only; runs in CI.
//
// What it flags: the pictographic planes plus the symbol/dingbat blocks that render
// in colour per-OS (☀ ✍ ✓ ★ ⭐ ⏱ 🪔 …) and the emoji variation selector (U+FE0F).
// What it allows: Gurmukhi/Latin/digits/punctuation, and mono typographic marks that
// render identically everywhere — arrows (→ ← ↗ ↺, U+2190–21FF), geometric shapes
// (▾ ◐, U+25xx) and box-drawing (─, U+2500). Those are text, not UI-glyph emoji.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'web/src';
const EXTS = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.jsx']);

// Pictographic + emoji-presentation symbol ranges (see header for rationale).
// U+2318 (⌘, the macOS command key) is carved out: it's keyboard typography in
// shortcut hints (the ⌘K chip / palette), rendered as text, not a pictograph.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{2317}\u{2319}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXTS.has(extname(entry))) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const ch of line) {
      if (EMOJI.test(ch)) {
        const cp = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        hits.push({ file, line: i + 1, ch, cp });
      }
    }
  });
}

if (hits.length) {
  console.error(`Emoji used as UI glyphs are banned (DESIGN.md). ${hits.length} found — use <Icon name="..."/> or iconSvg() from web/src/lib/icons.ts:`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.ch}  (U+${h.cp})`);
  process.exit(1);
}

console.log('check-no-emoji: OK — no emoji UI glyphs in web/src.');

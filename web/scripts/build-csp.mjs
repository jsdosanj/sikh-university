// Harden the CSP: replace `script-src '... unsafe-inline'` with an exact SHA-256 hash of
// every EXECUTABLE inline <script> in the built site, so injected inline scripts (the XSS
// amplifier) can no longer run. Runs AFTER `astro build`, reading the exact bytes that
// ship, so the hash set is always complete and self-maintaining — change a script and the
// next build recomputes it. Non-executable data blocks (application/ld+json, /json) are
// NOT hashed: browsers don't execute them, so script-src never blocks them. `style-src`
// keeps 'unsafe-inline' because inline style="" attributes (2000+ of them) cannot be
// hashed by CSP. Fails LOUD (non-zero exit) if _headers is missing, so a silent
// regression can't ship an un-hardened policy.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

const HEADERS = 'dist/_headers';
let hdr;
try { hdr = readFileSync(HEADERS, 'utf-8'); }
catch { console.error('build-csp: dist/_headers not found — did astro build run?'); process.exit(1); }

const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
const hashesOf = (html, into) => {
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const attrs = m[1], body = m[2];
    if (/\bsrc=/.test(attrs)) continue;                                   // external — covered by 'self'
    if (!body.trim()) continue;                                           // empty
    if (/type\s*=\s*["'](application\/(ld\+json|json))/i.test(attrs)) continue; // data, not executed
    into.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
};

// Global hash set: every inline script anywhere in the site.
const hashes = new Set();
// Institute hash set: only the inline scripts that appear on /institute/* pages
// (dist/institute.html + dist/institute/**). Kept separate so the /institute/*
// CSP line stays short — it only needs its own hashes, not the whole site's.
const instHashes = new Set();
for (const f of walk('dist')) {
  const html = readFileSync(f, 'utf-8');
  hashesOf(html, hashes);
  if (f === 'dist/institute.html' || f.startsWith('dist/institute/')) hashesOf(html, instHashes);
}

if (!hashes.size) { console.error('build-csp: no inline scripts found — refusing to write an empty script-src'); process.exit(1); }
const cspLines = (hdr.match(/^\s*Content-Security-Policy:/gm) || []).length;
if (cspLines < 2) { console.error(`build-csp: expected 2 Content-Security-Policy lines in _headers (global + /institute/*), found ${cspLines}`); process.exit(1); }

// Global CSP (first occurrence): script-src 'self' + all hashes.
hdr = hdr.replace(/script-src[^;]*/, "script-src 'self' " + [...hashes].sort().join(' '));
// Institute CSP (now the only remaining un-hardened one): + its hashes, keep
// 'wasm-unsafe-eval' for Pyodide.
hdr = hdr.replace(/script-src[^;]*'wasm-unsafe-eval'[^;]*/,
  "script-src 'self' " + [...instHashes].sort().join(' ') + " 'wasm-unsafe-eval'");

// Cloudflare's API rejects any _headers line over 2000 characters — and only at
// DEPLOY time, after CI is already green. Fail the build here instead. If this
// trips, too many scripts are being inlined into HTML: astro.config.mjs sets
// vite build.assetsInlineLimit 0 to keep hoisted scripts external ('self');
// only deliberate is:inline scripts should contribute hashes.
const CF_LINE_LIMIT = 2000;
const over = hdr.split('\n').filter((l) => l.length > CF_LINE_LIMIT);
if (over.length) {
  console.error(`build-csp: _headers line exceeds Cloudflare's ${CF_LINE_LIMIT}-char limit (${over[0].length} chars, ${hashes.size} hashes) — deploy would fail`);
  process.exit(1);
}

writeFileSync(HEADERS, hdr);
console.log(`build-csp: hardened script-src with ${hashes.size} inline-script hashes (unsafe-inline removed from scripts; kept for styles)`);

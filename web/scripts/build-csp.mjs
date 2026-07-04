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

const hashes = new Set();
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
for (const f of walk('dist')) {
  const html = readFileSync(f, 'utf-8');
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const attrs = m[1], body = m[2];
    if (/\bsrc=/.test(attrs)) continue;                                   // external — covered by 'self'
    if (!body.trim()) continue;                                           // empty
    if (/type\s*=\s*["'](application\/(ld\+json|json))/i.test(attrs)) continue; // data, not executed
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
}

if (!hashes.size) { console.error('build-csp: no inline scripts found — refusing to write an empty script-src'); process.exit(1); }
if (!/script-src[^;]*/.test(hdr)) { console.error('build-csp: no script-src directive in _headers to harden'); process.exit(1); }

const scriptSrc = "script-src 'self' " + [...hashes].sort().join(' ');
hdr = hdr.replace(/script-src[^;]*/, scriptSrc);
writeFileSync(HEADERS, hdr);
console.log(`build-csp: hardened script-src with ${hashes.size} inline-script hashes (unsafe-inline removed from scripts; kept for styles)`);

// Build gate: text-on-glass contrast (WCAG 2.2 AA, 4.5:1). Composites each
// sanctioned text token over each glass surface over the DARKEST stop of each
// ambient background, in both themes, and fails if a sanctioned pair drops
// below AA. This locks the token values in global.css — a future tweak to a
// glass alpha, ambient gradient or text colour that silently breaks AA fails
// the build here instead of shipping.
//
// Sanctioned pairs (the design law this file enforces):
//   • ink        — everywhere: any glass, any ambient, both themes.
//   • muted, saffron-deep — on .glass-strong everywhere; on regular .glass only
//     over the study ambient (light theme) or any ambient (dark theme).
//   NOT sanctioned (and not asserted): muted/saffron-deep on regular .glass
//   over hall/sanctum in the LIGHT theme (~3.6–4.4:1) — pages must use ink or
//   .glass-strong there.
//
// Token values are parsed live from web/src/styles/global.css.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cssPath = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'web', 'src', 'styles', 'global.css');
const css = readFileSync(cssPath, 'utf8');

// ── parse tokens ────────────────────────────────────────────────────────────
const themeBlock = (marker) => {
  const i = css.indexOf(marker);
  if (i === -1) throw new Error(`contrast-glass: marker not found: ${marker}`);
  return css.slice(i, i + 2500);
};
const light = themeBlock(':root {');
const dark = themeBlock('[data-theme="dark"] {');

const triplet = (block, name) => {
  const m = block.match(new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));
  if (!m) throw new Error(`contrast-glass: token --${name} not found`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const alpha = (block, name) => {
  const m = block.match(new RegExp(`--${name}:\\s*rgb\\(var\\(--c-surface\\)\\s*/\\s*(\\.\\d+)\\)`));
  if (!m) throw new Error(`contrast-glass: alpha --${name} not found`);
  return Number('0' + m[1]);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const gradientDarkest = (selector) => {
  const m = css.match(new RegExp(`\\${selector}\\s*\\{[^}]*background:[^;]*;`));
  if (!m) throw new Error(`contrast-glass: ${selector} not found`);
  const stops = [...m[0].matchAll(/#([0-9a-f]{6})/gi)].map((x) => hex('#' + x[1]));
  if (!stops.length) throw new Error(`contrast-glass: no hex stops in ${selector}`);
  return stops.reduce((a, b) => (lum(a) < lum(b) ? a : b));
};

// ── colour math ─────────────────────────────────────────────────────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function lum([r, g, b]) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (top, a, bot) => top.map((c, i) => a * c + (1 - a) * bot[i]);

// ── build the matrix ────────────────────────────────────────────────────────
const themes = {
  light: {
    block: light,
    text: { ink: triplet(light, 'c-ink'), muted: triplet(light, 'c-muted'), 'saffron-deep': triplet(light, 'c-saffron-deep') },
  },
  dark: {
    block: dark,
    text: { ink: triplet(dark, 'c-ink'), muted: triplet(dark, 'c-muted'), 'saffron-deep': triplet(dark, 'c-saffron-deep') },
  },
};
const HALL = gradientDarkest('.ambient-hall');
const SANCTUM = gradientDarkest('.ambient-sanctum');

let checked = 0;
const failures = [];
for (const [tn, t] of Object.entries(themes)) {
  const surface = triplet(t.block, 'c-surface');
  const glassA = alpha(t.block, 'glass-bg');
  const strongA = alpha(t.block, 'glass-bg-strong');
  const ambients = { hall: HALL, sanctum: SANCTUM, study: triplet(t.block, 'c-paper') };
  for (const [an, ac] of Object.entries(ambients)) {
    for (const [gn, ga] of [['glass', glassA], ['glass-strong', strongA]]) {
      const bg = over(surface, ga, ac);
      for (const [xn, xc] of Object.entries(t.text)) {
        // The one carve-out: muted/saffron-deep on regular glass over dark
        // ambients in light theme is NOT sanctioned — skip, don't assert.
        if (tn === 'light' && gn === 'glass' && an !== 'study' && xn !== 'ink') continue;
        checked++;
        const c = contrast(xc, bg);
        if (c < 4.5) failures.push(`${tn}/${an}/${gn}/${xn}: ${c.toFixed(2)}:1`);
      }
    }
  }
}

if (failures.length) {
  console.error(`contrast-glass: FAIL — sanctioned pair(s) below 4.5:1`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`contrast-glass: OK — ${checked} sanctioned text/glass/ambient pairs ≥ 4.5:1`);

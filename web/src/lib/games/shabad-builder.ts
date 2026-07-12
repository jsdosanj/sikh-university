// ਸ਼ਬਦ ਜੋੜ — Shabad Builder: assemble a target Gurbani word from its letter tiles.
//
// SITE LAWS honored here:
//  • No emoji (check-no-emoji gate). No icons needed beyond the kit's close X.
//  • No NEW data-i18n attributes — UI strings stay plain (runtime MT translates them).
//  • ACCURACY IS SACRED. Every Gurmukhi string in this file is COPIED VERBATIM from a
//    repo source and carries a source comment naming the file it came from. No Gurmukhi
//    is ever typed from memory. A base letter is NEVER split from its matra: words are
//    segmented into extended grapheme clusters (Intl.Segmenter, with a safe fallback).
//  • localStorage: this module writes none directly; stars/seals flow through ../kit
//    (su_v1_games_ prefix). • No inline <script>/handlers — bundled .ts module.
//  • prefers-reduced-motion gates EVERY animation (shake becomes a color pulse instead).
//  • Touch targets >= 44px (min-h-11 = 44px; kid mode uses min-h-16 = 64px).
//
// Module contract: exports `const game` with mount(body, ctx) -> cleanup. See below.
import { celebrate } from './kit';

const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Word bank ───────────────────────────────────────────────────────────────
// { gur, tr } pairs COPIED VERBATIM from web/src/data/gurbani-words.json (imported by
// web/src/pages/baal-updesh.astro as `gurbaniWords`). Short 2–3 grapheme-cluster words
// suited to tiles; `tr` is that file's transliteration, shown as the round's clue.
const WORDS: { gur: string; tr: string }[] = [
  { gur: 'ਆਦਿ', tr: 'Aad' },       // gurbani-words.json
  { gur: 'ਆਨ', tr: 'Aan' },        // gurbani-words.json
  { gur: 'ਜਲ', tr: 'Jal' },        // gurbani-words.json
  { gur: 'ਨਰ', tr: 'Nar' },        // gurbani-words.json
  { gur: 'ਧਰਮ', tr: 'Dharam' },    // gurbani-words.json
  { gur: 'ਸੇਵਕ', tr: 'Sevak' },    // gurbani-words.json
  { gur: 'ਸੰਗਤਿ', tr: 'Sangat' },  // gurbani-words.json
  { gur: 'ਮੀਤ', tr: 'Meet' },      // gurbani-words.json
  { gur: 'ਰੂਪ', tr: 'Roop' },      // gurbani-words.json
  { gur: 'ਰੋਗੁ', tr: 'Rog' },      // gurbani-words.json
  { gur: 'ਸਾਗਰੁ', tr: 'Saagar' },  // gurbani-words.json
  { gur: 'ਪਿਤਾ', tr: 'Pitaa' },    // gurbani-words.json
  { gur: 'ਭਰਮੁ', tr: 'Bharam' },   // gurbani-words.json
  { gur: 'ਕਾਮ', tr: 'Kaam' },      // gurbani-words.json
];

// ── Grapheme segmentation ────────────────────────────────────────────────────
// Gurmukhi combining marks (matras, tippi ੰ, addak ੱ, bindi, nukta, virama ੍, …) that
// must stay attached to the base letter before them.
const GURMUKHI_COMBINING = new Set([
  0x0a01, 0x0a02, 0x0a03, 0x0a3c, 0x0a3e, 0x0a3f, 0x0a40, 0x0a41, 0x0a42,
  0x0a47, 0x0a48, 0x0a4b, 0x0a4c, 0x0a4d, 0x0a51, 0x0a70, 0x0a71, 0x0a75,
]);
const VIRAMA = 0x0a4d;

function graphemes(word: string): string[] {
  // Prefer the platform segmenter — correct extended grapheme clusters for Gurmukhi.
  const Seg = (Intl as unknown as { Segmenter?: unknown }).Segmenter as
    | (new (l: string, o: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> })
    | undefined;
  if (typeof Seg === 'function') {
    const seg = new Seg('pa', { granularity: 'grapheme' });
    return Array.from(seg.segment(word), (s) => s.segment);
  }
  // Fallback: attach every combining mark — and any consonant subjoined after a virama —
  // to the cluster before it, so a base letter is never split from its matra.
  const out: string[] = [];
  for (const ch of word) {
    const cp = ch.codePointAt(0)!;
    const prev = out.length ? out[out.length - 1] : '';
    const prevCps = prev ? [...prev] : [];
    const prevLast = prevCps.length ? prevCps[prevCps.length - 1].codePointAt(0)! : -1;
    if (out.length && (GURMUKHI_COMBINING.has(cp) || prevLast === VIRAMA)) {
      out[out.length - 1] = prev + ch;
    } else {
      out.push(ch);
    }
  }
  return out;
}

// Pool of distinct graphemes across the whole bank, used to draw decoy tiles.
const ALL_GRAPHEMES = Array.from(new Set(WORDS.flatMap((w) => graphemes(w.gur))));

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function pickDecoys(target: string[], n: number): string[] {
  return shuffle(ALL_GRAPHEMES.filter((g) => !target.includes(g))).slice(0, n);
}

function el(tag: string, cls: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// Structural / test-hook classes: su-sb-built, su-sb-tile. Styling is Tailwind utilities.
const BUILT_DEFAULT =
  'su-sb-built gur flex min-h-16 flex-wrap items-center justify-center gap-1 rounded-xl2 border border-dashed border-line bg-paper/40 p-3 text-3xl font-bold text-navy';
const BUILT_DONE =
  'su-sb-built gur flex flex-wrap items-center justify-center gap-1 rounded-xl2 border border-saffron bg-saffron-soft p-4 text-5xl font-bold text-navy';

function tileClass(kid: boolean, used: boolean): string {
  const size = kid ? 'min-h-16 min-w-16 text-4xl' : 'min-h-11 min-w-11 text-2xl';
  const skin = used
    ? 'border-saffron bg-saffron-soft opacity-40'
    : 'border-line bg-paper hover:border-saffron hover:bg-saffron-soft';
  return `su-sb-tile gur ${size} inline-flex items-center justify-center rounded-xl2 border px-3 font-bold text-navy ${skin}`;
}

// ── Game ─────────────────────────────────────────────────────────────────────
export const game: {
  id: string;
  title: string;
  gur: string;
  blurb: string;
  needsAudio?: boolean;
  mount(body: HTMLElement, ctx: { kid: boolean; onScore(stars: number): void; done(): void }): () => void;
} = {
  id: 'shabad-builder',
  title: 'Shabad Builder',
  gur: 'ਸ਼ਬਦ ਜੋੜ', // verbatim from web/src/pages/baal-updesh.astro line 206 ("4. Reading words")
  blurb: 'Read the word, then build it from its Gurmukhi letter tiles — a matra always rides with its letter.',

  mount(body, ctx) {
    const { kid, onScore, done } = ctx;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
      return id;
    };

    const rounds = shuffle(WORDS).slice(0, 5);
    let idx = 0;

    // Static shell (rebuilt contents per round).
    const root = el('div', 'flex flex-col gap-4');
    const status = el('div', 'text-sm font-semibold text-muted');
    const clue = el('div', 'text-center');
    const clueLabel = el('div', 'text-xs uppercase tracking-wide text-muted', 'Build this word');
    const clueText = el('div', 'font-sans text-2xl font-bold text-navy');
    clue.append(clueLabel, clueText);
    const built = el('div', BUILT_DEFAULT);
    built.lang = 'pa';
    const tiles = el('div', 'flex flex-wrap justify-center gap-2');
    const controls = el('div', 'flex items-center justify-center gap-3');
    const feedback = el('div', 'min-h-6 text-center text-sm font-semibold');
    feedback.setAttribute('aria-live', 'polite');
    root.append(status, clue, built, tiles, controls, feedback);
    body.appendChild(root);

    function renderRound() {
      const word = rounds[idx];
      const target = graphemes(word.gur);
      let pos = 0;
      let hints = 0;
      let solved = false;

      status.textContent = `Round ${idx + 1} of ${rounds.length}`;
      clueText.textContent = word.tr;
      built.className = BUILT_DEFAULT;
      built.textContent = '';
      feedback.textContent = '';
      feedback.style.color = '';
      tiles.replaceChildren();
      controls.replaceChildren();

      // Tile letters: the target's graphemes, plus 2 decoys in adult mode.
      let letters = target.slice();
      if (!kid) letters = letters.concat(pickDecoys(target, 2));
      letters = shuffle(letters);

      const tileEls: HTMLButtonElement[] = [];
      letters.forEach((g) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.lang = 'pa';
        b.textContent = g; // a verbatim grapheme of a verbatim word
        b.className = tileClass(kid, false);
        b.addEventListener('click', () => onTile(b, g));
        tiles.appendChild(b);
        tileEls.push(b);
      });

      const nextExpectedTile = (): HTMLButtonElement | undefined =>
        tileEls.find((t) => !t.disabled && t.textContent === target[pos]);

      function pulse(t?: HTMLButtonElement) {
        if (!t) return;
        if (reduced()) {
          const bd = t.style.borderColor;
          t.style.borderColor = '#f4b21a';
          later(() => { t.style.borderColor = bd; }, 600);
          return;
        }
        t.style.animation = 'su-sb-pulse 700ms ease-in-out 2';
        later(() => { t.style.animation = ''; }, 1500);
      }

      if (kid) {
        // Kid mode: free first-tile hint pulse, no decoys, no timers.
        later(() => { if (!solved) pulse(nextExpectedTile()); }, 400);
      } else {
        // Adult mode: a Hint button; each use costs a star.
        const hintBtn = document.createElement('button');
        hintBtn.type = 'button';
        hintBtn.textContent = 'Hint';
        hintBtn.className =
          'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl2 border border-line px-4 font-semibold text-navy hover:bg-saffron-soft';
        hintBtn.addEventListener('click', () => {
          if (solved) return;
          hints++;
          pulse(nextExpectedTile());
        });
        controls.appendChild(hintBtn);
      }

      function onTile(b: HTMLButtonElement, g: string) {
        if (solved || b.disabled) return;
        if (g === target[pos]) {
          b.disabled = true;
          b.className = tileClass(kid, true);
          built.appendChild(el('span', '', g));
          pos++;
          feedback.textContent = '';
          feedback.style.color = '';
          if (pos === target.length) finishRound();
        } else {
          wrongTile(b);
        }
      }

      function wrongTile(b: HTMLButtonElement) {
        feedback.style.color = '#b91c1c';
        feedback.textContent = 'Not that letter yet';
        if (reduced()) {
          // Reduced motion: a brief color pulse instead of a shake.
          const bg = b.style.backgroundColor;
          const bd = b.style.borderColor;
          b.style.backgroundColor = 'rgba(185,28,28,.15)';
          b.style.borderColor = '#b91c1c';
          later(() => { b.style.backgroundColor = bg; b.style.borderColor = bd; }, 420);
        } else {
          b.style.animation = 'su-sb-shake 320ms ease-in-out';
          later(() => { b.style.animation = ''; }, 360);
        }
      }

      function finishRound() {
        solved = true;
        // Show the full word large, with its reading.
        built.className = BUILT_DONE;
        const stars = Math.max(1, 3 - hints);
        feedback.style.color = '#b45309';
        feedback.textContent = `${word.tr} — ${stars} star${stars === 1 ? '' : 's'}`;
        onScore(stars);

        const last = idx === rounds.length - 1;
        celebrate(last ? body : built, last ? 'shabad-builder' : undefined);

        controls.replaceChildren();
        const next = document.createElement('button');
        next.type = 'button';
        next.textContent = last ? 'Finish' : 'Next word';
        next.className =
          'inline-flex min-h-12 items-center justify-center rounded-xl2 bg-saffron px-6 font-bold text-navy hover:bg-saffron-deep hover:text-white';
        next.addEventListener('click', () => {
          if (last) { done(); return; }
          idx++;
          renderRound();
        });
        controls.appendChild(next);
        next.focus();
      }
    }

    renderRound();

    // Cleanup: cancel pending timers. The integrator removes `body` itself.
    return () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  },
};

// ── Custom keyframes ─────────────────────────────────────────────────────────
// The integrator hoists this into a <style> once (alongside the kit's KEYFRAMES) on any
// page mounting this game. Every animation that references these names is gated on
// prefers-reduced-motion in code, so hoisting them is safe under reduced motion.
export const GAME_KEYFRAMES = `
@keyframes su-sb-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
@keyframes su-sb-pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244,178,26,0); } 50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(244,178,26,.35); } }
`;

// ਅੱਖਰ — Akhar Pop: a LISTENING game for the santhiya games arcade. Hear an
// akhar recitation, then pop the bubble of the letter you heard.
//
// SITE LAWS honored here:
//  • NO emoji (check-no-emoji gate). The only glyphs drawn are via icons.ts iconSvg().
//  • NO new data-i18n attributes — every UI string stays plain; runtime MT translates it.
//  • ALL Gurmukhi is COPIED VERBATIM from repo sources, never typed from memory. Each
//    Gurmukhi-bearing constant below carries a source comment naming its origin file.
//  • localStorage: this module writes NONE (progress/stars/streak are the integrator's
//    job via ctx + kit). It reads none either.
//  • No inline <script>/handlers — this is a plain .ts module bundled by Astro.
//  • prefers-reduced-motion gates the slow bubble float (frozen when reduced).
//  • Touch targets >= 44px (bubbles are >= 96px; the replay button is min-h-11).
//
// AUDIO: mirrors the akhar player in web/src/pages/baal-updesh.astro (lines ~497–546).
// The manifest is fetched once from /assets/audio/akhar/manifest.json; a clip URL is
// /assets/audio/akhar/ + manifest[cat][slug]. Only the "letters" category is used.
// If the manifest has zero letter clips (it is empty today — the clips arrive with the
// Bhagat Ji recordings), mount() renders a dignified "coming soon" state, not a broken
// game. The integrator additionally gates the entry chip on `needsAudio`.

import { iconSvg } from '../icons';
import { celebrate } from './kit';

// ── The Painti letters (the "letters" audio category) ──────────────────────
// COPIED VERBATIM from web/src/pages/baal-updesh.astro: `const akhar` (the 35
// Painti, lines 6–14). [glyph, name]. Do not retype — accuracy is sacred.
const AKHAR: [string, string][] = [
  ['ੳ', 'Ura'], ['ਅ', 'Aira'], ['ੲ', 'Iri'], ['ਸ', 'Sassa'], ['ਹ', 'Haha'],
  ['ਕ', 'Kakka'], ['ਖ', 'Khakha'], ['ਗ', 'Gagga'], ['ਘ', 'Ghagha'], ['ਙ', 'Nganga'],
  ['ਚ', 'Chacha'], ['ਛ', 'Chhachha'], ['ਜ', 'Jajja'], ['ਝ', 'Jhajha'], ['ਞ', 'Njanja'],
  ['ਟ', 'Tainka'], ['ਠ', 'Tthattha'], ['ਡ', 'Dadda'], ['ਢ', 'Dhadha'], ['ਣ', 'Nanha'],
  ['ਤ', 'Tatta'], ['ਥ', 'Thatha'], ['ਦ', 'Dadda'], ['ਧ', 'Dhadha'], ['ਨ', 'Nanna'],
  ['ਪ', 'Pappa'], ['ਫ', 'Phapha'], ['ਬ', 'Babba'], ['ਭ', 'Bhabha'], ['ਮ', 'Mamma'],
  ['ਯ', 'Yaiya'], ['ਰ', 'Rara'], ['ਲ', 'Lalla'], ['ਵ', 'Vava'], ['ੜ', 'Rrarra'],
];

// Slug derivation COPIED VERBATIM from web/src/pages/baal-updesh.astro
// `function slugged` (lines 27–35), so our keys match manifest.letters exactly.
function slugged(pairs: [string, string][]): [string, string, string][] {
  const seen: Record<string, number> = {};
  return pairs.map(([ch, name]) => {
    let s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    seen[s] = (seen[s] || 0) + 1;
    if (seen[s] > 1) s = `${s}-${seen[s]}`;
    return [ch, name, s];
  });
}
const LETTERS = slugged(AKHAR); // [glyph, name, slug]

const ROUNDS = 8;
const BASE = '/assets/audio/akhar/';

type Ctx = { kid: boolean; onScore(stars: number): void; done(): void };
type Game = {
  id: string; title: string; gur: string; blurb: string; needsAudio?: boolean;
  mount(body: HTMLElement, ctx: Ctx): () => void;
};
type Letter = [string, string, string]; // [glyph, name, slug]

function el(tag: string, cls?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 3 stars for near-perfect listening, 2 for solid, 1 for finishing at all.
function starsFor(correct: number): number {
  if (correct >= ROUNDS - 1) return 3;
  if (correct >= Math.ceil(ROUNDS * 0.6)) return 2;
  return 1;
}

export const game: Game = {
  id: 'akhar-pop',
  title: 'Akhar Pop',
  gur: 'ਅੱਖਰ', // COPIED VERBATIM from web/src/pages/baal-updesh.astro (line 174: "ਅੱਖਰ").
  blurb: 'Listen to each letter, then pop the bubble of the akhar you heard.',
  needsAudio: true,
  mount(body, ctx) {
    const reduced =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const kid = ctx.kid;

    let cancelled = false;
    const controller = new AbortController();
    const timers = new Set<number>();
    const after = (ms: number, fn: () => void): void => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };

    const player = new Audio();
    player.preload = 'none';

    // ── Loading state ────────────────────────────────────────────────────
    body.innerHTML = '';
    const loading = el('p', 'text-sm text-muted');
    loading.textContent = 'Loading the letters…';
    body.appendChild(loading);

    // ── Dignified "coming soon" state (no clips yet, or manifest missing) ──
    function renderComingSoon(): void {
      if (cancelled) return;
      body.innerHTML = '';
      const card = el('div', 'glass-lite flex flex-col items-center gap-3 rounded-xl2 p-8 text-center');
      const icon = el('div', 'text-saffron-deep');
      icon.innerHTML = iconSvg('volume', 'h-10 w-10');
      const h = el('p', 'font-serif text-lg font-bold text-navy');
      h.textContent = 'Coming soon';
      const p = el('p', 'max-w-sm text-sm text-muted');
      p.textContent = 'Audio arrives with the Bhagat Ji recordings. Once the akhar clips are added, this game will play a letter and you pop the bubble you heard.';
      card.append(icon, h, p);
      body.appendChild(card);
    }

    // ── Fetch the manifest once, mirroring the baal-updesh player ─────────
    fetch(BASE + 'manifest.json', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((manifest) => {
        if (cancelled) return;
        const letters = manifest && typeof manifest.letters === 'object' && manifest.letters
          ? (manifest.letters as Record<string, string>)
          : {};
        // Letters that actually have a clip today — only these can be the answer.
        const playable = LETTERS.filter((L) => typeof letters[L[2]] === 'string' && letters[L[2]]);
        if (playable.length === 0) { renderComingSoon(); return; }
        startGame(letters, playable);
      })
      .catch(() => { if (!cancelled) renderComingSoon(); });

    // ── The game ─────────────────────────────────────────────────────────
    function startGame(letters: Record<string, string>, playable: Letter[]): void {
      // Build the 8-round answer sequence from the playable pool (cycle+shuffle
      // so we never run short when few clips exist, but avoid back-to-back repeats).
      const seq: Letter[] = [];
      let bag: Letter[] = [];
      while (seq.length < ROUNDS) {
        if (bag.length === 0) bag = shuffle(playable.slice());
        const next = bag.pop() as Letter;
        if (seq.length && seq[seq.length - 1][0] === next[0] && (playable.length > 1 || bag.length)) {
          bag.unshift(next);
          continue;
        }
        seq.push(next);
      }

      let round = 0;
      let correct = 0;
      let answered = false;

      body.innerHTML = '';

      const instr = el('p', 'text-sm text-muted');
      instr.textContent = kid
        ? 'Listen, then tap the letter you heard.'
        : 'Listen to the clip, then pop the bubble of the akhar you heard. Tap the speaker to hear it again.';

      const bar = el('div', 'mt-3 mb-4 flex items-center justify-between gap-3 font-sans text-sm text-muted');
      const roundEl = el('span');
      const scoreEl = el('span');
      bar.append(roundEl, scoreEl);

      // Prominent replay / listen control (also the fallback if autoplay is blocked).
      const listenWrap = el('div', 'mb-5 flex justify-center');
      const listenBtn = el('button', 'inline-flex min-h-11 items-center gap-2 rounded-xl2 border-2 border-saffron bg-saffron-soft px-5 py-3 font-sans text-base font-semibold text-saffron-deep hover:bg-saffron/20') as HTMLButtonElement;
      listenBtn.type = 'button';
      listenBtn.innerHTML = `${iconSvg('volume', 'h-6 w-6')}<span>Play sound</span>`;
      listenWrap.appendChild(listenBtn);

      const grid = el('div', 'grid grid-cols-2 gap-4');
      body.append(instr, bar, listenWrap, grid);

      function playCurrent(): void {
        const slug = seq[round][2];
        const rel = letters[slug];
        if (!rel) return;
        player.src = BASE + rel;
        player.play().catch(() => { /* autoplay may be blocked — the Play button covers it */ });
      }

      function renderRound(): void {
        answered = false;
        roundEl.textContent = `Round ${round + 1} / ${ROUNDS}`;
        scoreEl.textContent = `Correct: ${correct}`;

        const answer = seq[round];
        // Three distractor glyphs, distinct from the answer and each other.
        const distractors: Letter[] = [];
        const usedGlyphs = new Set<string>([answer[0]]);
        for (const L of shuffle(AKHAR.map((p, i) => LETTERS[i]))) {
          if (usedGlyphs.has(L[0])) continue;
          usedGlyphs.add(L[0]);
          distractors.push(L);
          if (distractors.length === 3) break;
        }
        const options = shuffle([answer, ...distractors]);

        grid.innerHTML = '';
        options.forEach((opt, i) => {
          const btn = el('button', 'su-ap-bubble glass-lite relative flex items-center justify-center rounded-full border-2 border-line transition hover:border-saffron') as HTMLButtonElement;
          btn.type = 'button';
          btn.style.aspectRatio = '1';
          btn.style.minHeight = kid ? '120px' : '96px'; // >= 44px; larger in kid mode.
          btn.setAttribute('aria-label', `Letter ${opt[1]}`);

          const glyph = el('span', 'gur font-bold text-navy ' + (kid ? 'text-6xl' : 'text-5xl'));
          glyph.lang = 'pa';
          glyph.textContent = opt[0]; // verbatim Gurmukhi glyph from AKHAR
          btn.appendChild(glyph);

          // Slow float — transform only, staggered, frozen under reduced motion.
          if (!reduced) {
            btn.style.animation = `su-ap-float ${(3 + i * 0.3).toFixed(1)}s ease-in-out ${(i * 0.4).toFixed(1)}s infinite alternate`;
          }

          btn.addEventListener('click', () => choose(btn, opt, answer));
          grid.appendChild(btn);
        });

        playCurrent();
      }

      function choose(btn: HTMLButtonElement, opt: Letter, answer: Letter): void {
        if (answered) return;
        answered = true;
        const isRight = opt[0] === answer[0];
        if (isRight) correct++;
        scoreEl.textContent = `Correct: ${correct}`;

        // Lock the grid and reveal the outcome with a saffron/green/red ring.
        const btns = Array.from(grid.querySelectorAll('button'));
        btns.forEach((b) => {
          (b as HTMLButtonElement).disabled = true;
          b.style.animationPlayState = 'paused';
          const g = (b.querySelector('.gur') as HTMLElement | null);
          const glyph = g ? g.textContent : '';
          if (glyph === answer[0]) {
            b.style.boxShadow = '0 0 0 3px rgba(34,153,84,.8)'; // green ring on the correct letter
            b.style.borderColor = 'transparent';
          } else if (b === btn) {
            b.style.boxShadow = '0 0 0 3px rgba(200,40,40,.75)'; // red ring on a wrong pick
            b.style.borderColor = 'transparent';
          }
        });

        after(reduced ? 500 : 1100, () => {
          round++;
          if (round >= ROUNDS) finish();
          else renderRound();
        });
      }

      function finish(): void {
        const stars = starsFor(correct);
        celebrate(body); // visual only (no sealId); no-ops under reduced motion.
        after(reduced ? 0 : 1100, () => { ctx.onScore(stars); ctx.done(); });
      }

      listenBtn.addEventListener('click', () => { if (!cancelled) playCurrent(); });
      renderRound();
    }

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      controller.abort();
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      try { player.pause(); player.src = ''; } catch { /* ignore */ }
      body.innerHTML = '';
    };
  },
};

// Custom keyframe for the slow bubble float. The integrator hoists this into a
// <style> once (alongside the kit's KEYFRAMES) on any page that mounts this game.
// It is only referenced when prefers-reduced-motion is NOT set (see mount()).
export const GAME_KEYFRAMES = `
@keyframes su-ap-float { from { transform: translateY(0); } to { transform: translateY(-8px); } }
`;

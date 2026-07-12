// ਜੋੜੀ — Jodi Match: a memory-pair flip game for the santhiya games arcade.
//
// SITE LAWS honored here:
//  • NO emoji (check-no-emoji gate). The only glyphs drawn are via icons.ts iconSvg().
//  • NO new data-i18n attributes — every UI string stays plain; runtime MT translates it.
//  • ALL Gurmukhi is COPIED VERBATIM from repo sources, never typed from memory. Each
//    Gurmukhi-bearing constant below carries a source comment naming its origin file.
//  • localStorage: this module writes NONE (progress/stars/streak are the integrator's
//    job via ctx + kit). It reads none either.
//  • No inline <script>/handlers — this is a plain .ts module bundled by Astro.
//  • prefers-reduced-motion gates the flip animation (instant when reduced).
//  • Touch targets >= 44px (tiles are >= 80px tall).
//
// NOTE on the word deck ("word <-> meaning"): the gurbani-words.json / #fc-words-data
// source pairs each Gurmukhi word only with its romanized reading (`tr`); its `var`
// field is free-form multi-line prose, not a clean gloss, so distilling an English
// "meaning" from it would require editing/interpretation — a violation of the verbatim
// + accuracy-sacred rules. We therefore pair each Gurbani word with its verbatim `tr`
// reading (matching how baal-updesh.astro itself renders these words). This is the
// faithful, santhya-appropriate reading: "match the shabad to how it is read."

import { iconSvg } from '../icons';
import { celebrate } from './kit';

// ── Kid deck: Gurmukhi letters <-> their names ─────────────────────────────
// COPIED VERBATIM from web/src/pages/baal-updesh.astro: `const akhar` (the 35
// Painti, lines 6–14) followed by `const navin` (the 6 Navin Toli, line 15).
// [glyph, name]. Do not retype — accuracy is sacred.
const LETTERS: [string, string][] = [
  ['ੳ', 'Ura'], ['ਅ', 'Aira'], ['ੲ', 'Iri'], ['ਸ', 'Sassa'], ['ਹ', 'Haha'],
  ['ਕ', 'Kakka'], ['ਖ', 'Khakha'], ['ਗ', 'Gagga'], ['ਘ', 'Ghagha'], ['ਙ', 'Nganga'],
  ['ਚ', 'Chacha'], ['ਛ', 'Chhachha'], ['ਜ', 'Jajja'], ['ਝ', 'Jhajha'], ['ਞ', 'Njanja'],
  ['ਟ', 'Tainka'], ['ਠ', 'Tthattha'], ['ਡ', 'Dadda'], ['ਢ', 'Dhadha'], ['ਣ', 'Nanha'],
  ['ਤ', 'Tatta'], ['ਥ', 'Thatha'], ['ਦ', 'Dadda'], ['ਧ', 'Dhadha'], ['ਨ', 'Nanna'],
  ['ਪ', 'Pappa'], ['ਫ', 'Phapha'], ['ਬ', 'Babba'], ['ਭ', 'Bhabha'], ['ਮ', 'Mamma'],
  ['ਯ', 'Yaiya'], ['ਰ', 'Rara'], ['ਲ', 'Lalla'], ['ਵ', 'Vava'], ['ੜ', 'Rrarra'],
  ['ਸ਼', 'Shasha'], ['ਖ਼', 'Khhakha'], ['ਗ਼', 'Ghhagha'], ['ਜ਼', 'Zazza'], ['ਫ਼', 'Faffa'], ['ਲ਼', 'Llalla'],
];

// ── Adult deck: Gurbani words <-> their reading ────────────────────────────
// 16 entries COPIED VERBATIM from web/src/data/gurbani-words.json (the same array
// baal-updesh.astro embeds as <script id="fc-words-data">). [gur, tr]. Each pair's
// `tr` reading is distinct so no two tiles look alike. Do not retype.
const WORDS: [string, string][] = [
  ['ਆਦਿ', 'Aad'], ['ਧਰਮ', 'Dharam'], ['ਨਿਰਭਉ', 'Nirbhau'], ['ਸੰਗਤਿ', 'Sangat'],
  ['ਸੇਵਕ', 'Sevak'], ['ਪ੍ਰੇਮ', 'Prem'], ['ਪਿਤਾ', 'Pitaa'], ['ਮੀਤ', 'Meet'],
  ['ਰੂਪ', 'Roop'], ['ਪਾਣੀ', 'Paaṇee'], ['ਸਾਗਰੁ', 'Saagar'], ['ਸੰਸਾਰੁ', 'Sansaar'],
  ['ਪ੍ਰੀਤਮ', 'Preetam'], ['ਗਿਆਨੀ', 'Giaanee'], ['ਕਾਮ', 'Kaam'], ['ਭਰਮੁ', 'Bharam'],
];

type Ctx = { kid: boolean; onScore(stars: number): void; done(): void };
type Game = {
  id: string; title: string; gur: string; blurb: string; needsAudio?: boolean;
  mount(body: HTMLElement, ctx: Ctx): () => void;
};

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

// Pick n pairs whose reading (item[1]) is unique, so matches are never ambiguous.
function pickDistinct(pool: [string, string][], n: number): [string, string][] {
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (const item of shuffle(pool.slice())) {
    if (seen.has(item[1])) continue;
    seen.add(item[1]);
    out.push(item);
    if (out.length === n) break;
  }
  return out;
}

// 3 stars for tidy play, 2 for solid, 1 for finishing at all. Min possible = `pairs`.
function starsFor(moves: number, pairs: number): number {
  if (moves <= Math.ceil(pairs * 1.5)) return 3;
  if (moves <= pairs * 2) return 2;
  return 1;
}

export const game: Game = {
  id: 'jodi-match',
  title: 'Jodi Match',
  gur: 'ਜੋੜੀ', // COPIED VERBATIM from site/assets/data/courses.json (line 39664: "ਜੋੜੀ").
  blurb: 'Flip the tiles two at a time and find every matching pair.',
  mount(body, ctx) {
    const reduced =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const kid = ctx.kid;
    const pairs = kid ? 6 : 8; // kid: 4x3 = 12 tiles; adult: 4x4 = 16 tiles.
    const revealMs = reduced ? 400 : kid ? 1000 : 750; // time to read a mismatch before it flips back.

    const timers = new Set<number>();
    const after = (ms: number, fn: () => void): void => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };

    // Build the deck: each chosen pair yields a Gurmukhi tile + a reading tile.
    type Card = { pairId: number; text: string; gur: boolean };
    const chosen = pickDistinct(kid ? LETTERS : WORDS, pairs);
    const cards: Card[] = [];
    chosen.forEach(([g, r], i) => {
      cards.push({ pairId: i, text: g, gur: true });
      cards.push({ pairId: i, text: r, gur: false });
    });
    shuffle(cards);

    // ── Layout ───────────────────────────────────────────────────────────
    body.innerHTML = '';
    const instr = el('p', 'text-sm text-muted');
    instr.textContent = kid
      ? 'Flip two tiles to find a matching pair.'
      : 'Flip two tiles to match each Gurbani word with its reading. Fewer moves earns more stars.';

    const bar = el('div', 'mt-3 mb-3 flex items-center justify-between gap-3 font-sans text-sm text-muted');
    const foundEl = el('span');
    foundEl.textContent = `Pairs found: 0 / ${pairs}`;
    bar.appendChild(foundEl);
    let movesEl: HTMLElement | null = null;
    if (!kid) {
      movesEl = el('span');
      movesEl.textContent = 'Moves: 0';
      bar.appendChild(movesEl);
    }

    const grid = el('div', 'grid grid-cols-4 gap-3');

    // ── Tiles ────────────────────────────────────────────────────────────
    type Tile = { btn: HTMLButtonElement; inner: HTMLElement; front: HTMLElement; card: Card; flipped: boolean; matched: boolean };
    const tiles: Tile[] = [];

    let firstIdx: number | null = null;
    let lock = false;
    let matched = 0;
    let moves = 0;

    function flipTo(t: Tile, on: boolean): void {
      t.flipped = on;
      t.inner.style.transform = on ? 'rotateY(180deg)' : '';
      t.btn.setAttribute('aria-label', on ? t.card.text : 'Hidden tile');
    }

    function markMatched(t: Tile): void {
      t.matched = true;
      t.front.style.boxShadow = '0 0 0 3px rgba(244,178,26,.7)'; // soft saffron ring (#f4b21a)
      t.front.style.borderColor = 'transparent';
      t.btn.setAttribute('aria-disabled', 'true');
      t.btn.tabIndex = -1;
    }

    function win(): void {
      const stars = starsFor(moves, pairs);
      celebrate(grid); // visual only (no sealId) — no data side effects; no-ops under reduced motion.
      after(reduced ? 0 : 1100, () => { ctx.onScore(stars); ctx.done(); });
    }

    function onClick(idx: number): void {
      const t = tiles[idx];
      if (lock || t.matched || t.flipped) return;
      flipTo(t, true);

      if (firstIdx === null) { firstIdx = idx; return; }

      moves++;
      if (movesEl) movesEl.textContent = `Moves: ${moves}`;
      const a = tiles[firstIdx];
      const b = t;
      firstIdx = null;

      if (a.card.pairId === b.card.pairId) {
        markMatched(a);
        markMatched(b);
        matched++;
        foundEl.textContent = `Pairs found: ${matched} / ${pairs}`;
        if (matched === pairs) win();
      } else {
        lock = true;
        after(revealMs, () => { flipTo(a, false); flipTo(b, false); lock = false; });
      }
    }

    cards.forEach((card, idx) => {
      const btn = el('button', 'relative block w-full rounded-xl2') as HTMLButtonElement;
      btn.type = 'button';
      btn.style.perspective = '800px';
      btn.style.minHeight = kid ? '96px' : '80px'; // >= 44px touch target; bigger in kid mode.
      btn.setAttribute('aria-label', 'Hidden tile');

      const inner = el('span', 'absolute inset-0 block rounded-xl2');
      inner.style.transformStyle = 'preserve-3d';
      inner.style.transition = reduced ? 'none' : 'transform 340ms cubic-bezier(.34,1.1,.64,1)';

      const back = el('span', 'absolute inset-0 flex items-center justify-center rounded-xl2 glass-lite');
      back.style.backfaceVisibility = 'hidden';
      (back.style as unknown as Record<string, string>).webkitBackfaceVisibility = 'hidden';
      back.innerHTML = iconSvg('lotus', 'h-7 w-7 text-saffron-deep');

      const front = el('span', 'absolute inset-0 flex items-center justify-center rounded-xl2 border-2 border-line bg-surface px-2 text-center');
      front.style.backfaceVisibility = 'hidden';
      (front.style as unknown as Record<string, string>).webkitBackfaceVisibility = 'hidden';
      front.style.transform = 'rotateY(180deg)';

      const label = el(
        'span',
        card.gur
          ? 'gur font-bold text-navy ' + (kid ? 'text-4xl' : 'text-2xl')
          : 'font-sans font-semibold text-navy ' + (kid ? 'text-xl' : 'text-base'),
      );
      if (card.gur) label.lang = 'pa';
      label.textContent = card.text; // verbatim Gurmukhi (gur) or verbatim reading (roman)
      front.appendChild(label);

      inner.append(back, front);
      btn.appendChild(inner);
      btn.addEventListener('click', () => onClick(idx));
      grid.appendChild(btn);

      tiles.push({ btn, inner, front, card, flipped: false, matched: false });
    });

    body.append(instr, bar, grid);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      body.innerHTML = '';
    };
  },
};

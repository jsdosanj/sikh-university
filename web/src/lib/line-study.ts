// Line-by-line study drawer: tap a Gurbani line → published English translation
// and Punjabi ਅਰਥ from BaniDB (api.banidb.com — already CSP-allowed and used by
// the course verse viewer). We surface PUBLISHED teeka material only and never
// generate arths; when BaniDB has nothing trustworthy for a line the drawer
// says so honestly and shows the Gurmukhi alone.
//
// Trust guard: BaniDB's page numbering for non-SGGS sources may not match our
// corpus (the reader's Dasam text is the Hazoor Sahib Bir). Before showing a
// translation we require the fetched verse text to actually MATCH the tapped
// line (normalized comparison); a numbering mismatch degrades to "unavailable"
// instead of ever attaching the wrong arth to a line. Accuracy is sacred.

import { iconSvg } from './icons';

type Src = 'sggs' | 'dasam' | 'sarbloh';
const BANIDB_SOURCE: Record<Src, string | null> = { sggs: 'SGGS', dasam: 'D', sarbloh: null };
const SOURCE_LABEL: Record<Src, string> = {
  sggs: 'ਸ੍ਰੀ ਗੁਰੂ ਗਰੰਥ ਸਾਹਿਬ ਜੀ',
  dasam: 'ਸ੍ਰੀ ਦਸਮ ਗ੍ਰੰਥ',
  sarbloh: 'ਸ੍ਰੀ ਸਰਬਲੋਹ ਗ੍ਰੰਥ',
};

const norm = (s: string) => s.replace(/[॥;.,੦-੯0-9\s]/g, '');
const esc = (s: string) =>
  String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

// Tolerant extraction across BaniDB translation shapes (string or {unicode}).
function text(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof (v as any).unicode === 'string') return (v as any).unicode;
  return '';
}

type Verse = { gur: string; en: string; pu: string; puSource: string };

const angCache = new Map<string, Promise<Verse[]>>();
function fetchAng(src: Src, ang: number): Promise<Verse[]> {
  const key = src + ':' + ang;
  const hit = angCache.get(key);
  if (hit) return hit;
  const source = BANIDB_SOURCE[src];
  const p: Promise<Verse[]> = !source
    ? Promise.resolve([])
    : fetch(`https://api.banidb.com/v2/angs/${ang}/${source}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) =>
          ((d && d.page) || []).map((v: any): Verse => {
            const pu = v.translation && v.translation.pu;
            const ss = text(pu && pu.ss);
            const ft = text(pu && pu.ft);
            const bdb = text(pu && pu.bdb);
            return {
              gur: text(v.verse && v.verse.unicode) || text(v.verse),
              en: text(v.translation && v.translation.en && v.translation.en.bdb),
              pu: ss || ft || bdb,
              puSource: ss ? 'Prof. Sahib Singh (Guru Granth Darpan)' : ft ? 'Faridkot Wala Teeka' : bdb ? 'BaniDB' : '',
            };
          }),
        )
        .catch(() => []);
  angCache.set(key, p);
  return p;
}

// Find the fetched verse that IS this line (normalized match, both directions
// of containment tolerated — vishram markup differs between corpora).
function matchVerse(line: string, verses: Verse[]): Verse | null {
  const n = norm(line);
  if (n.length < 4) return null;
  for (const v of verses) {
    const m = norm(v.gur);
    if (!m) continue;
    if (m === n || m.indexOf(n) !== -1 || n.indexOf(m) !== -1) return v;
  }
  return null;
}

let drawer: HTMLElement | null = null;
let lastFocus: Element | null = null;

function ensureDrawer(): HTMLElement {
  if (drawer) return drawer;
  drawer = document.createElement('div');
  drawer.id = 'line-study';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Line meaning');
  drawer.hidden = true;
  drawer.className = 'glass-strong fixed inset-x-0 bottom-0 z-[70] max-h-[70vh] overflow-y-auto overscroll-contain rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lift sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem] sm:rounded-2xl';
  document.body.appendChild(drawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && !drawer.hidden) closeDrawer();
  });
  return drawer;
}

export function closeDrawer(): void {
  if (!drawer || drawer.hidden) return;
  drawer.hidden = true;
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

export type PlayHandler = () => void;

// Open the study drawer for one Gurmukhi line.
export function openLineStudy(src: Src, ang: number, line: string, onPlay?: PlayHandler): void {
  const d = ensureDrawer();
  lastFocus = document.activeElement;
  const head =
    `<div class="flex items-start justify-between gap-3">` +
    `<div><div class="eyebrow text-saffron-deep">${esc(SOURCE_LABEL[src])} · Ang ${ang}</div>` +
    `<p class="gur mt-2 text-xl leading-relaxed text-ink" lang="pa">${esc(line)}</p></div>` +
    `<button id="ls-close" class="shrink-0 rounded-full p-2 hover:bg-ink/10" aria-label="Close">${iconSvg('close', 'h-5 w-5')}</button></div>`;
  d.innerHTML =
    head +
    (onPlay ? `<button id="ls-play" class="btn mt-3 font-sans text-sm">${iconSvg('volume', 'h-4 w-4')} Play from this line <span class="text-muted">≈</span></button>` : '') +
    `<div id="ls-body" class="mt-3 font-sans text-sm text-muted">Fetching the published translations…</div>`;
  d.hidden = false;
  const closeBtn = d.querySelector('#ls-close') as HTMLElement | null;
  if (closeBtn) { closeBtn.addEventListener('click', closeDrawer); closeBtn.focus(); }
  const playBtn = d.querySelector('#ls-play');
  if (playBtn && onPlay) playBtn.addEventListener('click', () => onPlay());

  fetchAng(src, ang).then((verses) => {
    const body = d.querySelector('#ls-body');
    if (!body || d.hidden) return;
    const v = matchVerse(line, verses);
    if (!v || (!v.en && !v.pu)) {
      body.innerHTML =
        '<p>No published translation is available for this line' +
        (src !== 'sggs' ? ' in this source' : '') +
        ' — the Gurmukhi stands on its own. Always verify meanings with your local ਸੰਗਤ and authentic teekas.</p>';
      return;
    }
    body.innerHTML =
      (v.pu
        ? `<div class="mb-3"><div class="eyebrow text-muted">ਅਰਥ${v.puSource ? ' · ' + esc(v.puSource) : ''}</div><p class="gur mt-1 text-base leading-relaxed text-ink" lang="pa">${esc(v.pu)}</p></div>`
        : '') +
      (v.en
        ? `<div><div class="eyebrow text-muted">English · BaniDB</div><p class="mt-1 leading-relaxed text-ink">${esc(v.en)}</p></div>`
        : '') +
      `<p class="mt-3 text-xs">Published translations via <a class="underline" href="https://www.banidb.com" target="_blank" rel="noopener">BaniDB</a>. Interpretations vary — verify with authentic sources.</p>`;
  });
}

// One coherent line-icon set for the whole UI — replaces every emoji glyph.
// 24×24 viewBox, drawn with currentColor so icons inherit text colour and size.
// Single source of truth: ICON_PATHS holds the inner SVG for each name.
//   • Icon.astro renders these in .astro markup.
//   • iconSvg(name, class) returns a full <svg> string for client-side JS that
//     builds HTML (dashboard badges, flashcards, kakaar popups, etc.).
// Kept deliberately minimal and geometric, in the Logo's visual language.

// Non-class attributes shared by every icon (matches Logo.astro's line style).
export const ICON_ATTRS =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const ICON_PATHS: Record<string, string> = {
  // — Topics & content —
  book: '<path d="M12 6c-1.7-1.3-4-2-8-2v13c4 0 6.3.7 8 2 1.7-1.3 4-2 8-2V4c-4 0-6.3.7-8 2Z"/><path d="M12 6v13"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5h4v5"/>',
  books: '<rect x="4" y="15" width="16" height="4.5" rx="1"/><rect x="5.5" y="10.5" width="13" height="4.5" rx="1"/><rect x="7" y="6" width="10" height="4.5" rx="1"/>',
  scroll: '<path d="M8 4h9a1 1 0 0 1 1 1v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3 1 1 0 0 1 1-1h3"/><path d="M8 4a1 1 0 0 0-1 1v11"/><path d="M11 8h4M11 11h4"/>',
  pen: '<path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19Z"/><path d="M14 7l3 3"/>',
  scales: '<path d="M12 4v16M7 20h10"/><path d="M6 7l12-1.5"/><path d="M11.5 5.6L6 7l-2.5 5a2.5 2.5 0 0 0 5 0Z"/><path d="M12.5 5.5L18 5.5l2.5 5a2.5 2.5 0 0 1-5 0Z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17"/>',
  sprout: '<path d="M12 20v-7"/><path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6Z"/><path d="M12 11.5c0-3 2.5-5 6-5 0 3.5-2.5 5.5-6 5.5"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-1 2-2 0-1.4 1-2 2-2h1.5A3 3 0 0 0 20.5 12 8.5 8.5 0 0 0 12 3.5Z"/><circle cx="8" cy="10.5" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="10.5" r="1"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  pillar: '<path d="M4 9l8-4 8 4H4Z"/><path d="M6.5 9.5v7M11 9.5v7M13 9.5v7M17.5 9.5v7"/><path d="M4 16.5h16M4.5 19.5h15"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 5.1"/>',
  child: '<circle cx="12" cy="6.5" r="2.5"/><path d="M12 9v6M8 12h8M9.5 20l1.5-5M14.5 20l-1.5-5"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.6 12 20 12 20Z"/>',
  thought: '<path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 9.5h8M8 12.5h5"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10"/><path d="M14.5 9.2A2.3 2.3 0 0 0 12 8c-1.4 0-2.5.9-2.5 2s1.1 1.8 2.5 1.8 2.5.8 2.5 1.9-1.1 2-2.5 2a2.3 2.3 0 0 1-2.5-1.2"/>',
  microscope: '<path d="M6 20h13"/><path d="M9 17h5a5 5 0 0 0-2-9.4"/><path d="M8 17l2-3"/><path d="M9.6 4.6l3.4 6-2.6 1.5-3.4-6Z"/><path d="M11 3.6l2 1"/>',
  shield: '<path d="M12 3.5l7 2.5v5c0 4.5-3 7.7-7 9.5-4-1.8-7-5-7-9.5v-5Z"/>',
  robot: '<rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 5v3"/><circle cx="12" cy="4" r="1"/><circle cx="9.5" cy="12.5" r="1.2"/><circle cx="14.5" cy="12.5" r="1.2"/><path d="M9.5 15.5h5M3 12v3M21 12v3"/>',
  meditation: '<circle cx="12" cy="5.5" r="2"/><path d="M12 8c-1.5 0-2.5 1.2-2.5 3v2M12 8c1.5 0 2.5 1.2 2.5 3v2"/><path d="M4.5 18c1.5-2 4-3 7.5-3s6 1 7.5 3c-2 1.5-4.7 2.5-7.5 2.5S6.5 19.5 4.5 18Z"/>',
  diya: '<path d="M12 4c-1.2 1.2-2 2.3-2 3.5a2 2 0 0 0 4 0C14 6.3 13.2 5.2 12 4Z"/><path d="M12 10v3"/><path d="M4 13h16l-1.6 3.6A4 4 0 0 1 14.8 19H9.2a4 4 0 0 1-3.6-2.4Z"/>',
  lotus: '<path d="M12 20c-4 0-7-2.5-7-5 2 0 3.2.7 4.2 2 0-2.6 1.2-4.7 2.8-6.2 1.6 1.5 2.8 3.6 2.8 6.2 1-1.3 2.2-2 4.2-2 0 2.5-3 5-7 5Z"/><path d="M12 20c-2.6 0-4.6-2-4.6-4.6M12 20c2.6 0 4.6-2 4.6-4.6"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8 20 20"/>',
  ruler: '<rect x="4" y="8" width="16" height="8" rx="1"/><path d="M8 8v3M12 8v4M16 8v3"/>',
  cap: '<path d="M12 5L2.5 9 12 13l9.5-4Z"/><path d="M6 11v4.2c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3V11"/><path d="M21.5 9v4.5"/>',
  waves: '<path d="M3 8c2 0 2.5 1.5 4.5 1.5S9.5 8 11.5 8s2 1.5 4 1.5S17.5 8 19.5 8"/><path d="M3 13c2 0 2.5 1.5 4.5 1.5S9.5 13 11.5 13s2 1.5 4 1.5S17.5 13 19.5 13"/><path d="M3 18c2 0 2.5 1.5 4.5 1.5S9.5 18 11.5 18s2 1.5 4 1.5S17.5 18 19.5 18"/>',
  folder: '<path d="M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>',
  note: '<path d="M7 3.5h7l4 4V19A1.5 1.5 0 0 1 16.5 20.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z"/><path d="M14 3.5V8h4"/><path d="M9 12h6M9 15.5h4"/>',

  // — Affordances, badges & controls —
  accessibility: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.6" r="1.3"/><path d="M6.5 10c1.7.8 3.5 1.2 5.5 1.2s3.8-.4 5.5-1.2"/><path d="M12 10.5V15M12 15l-2.5 4M12 15l2.5 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  square: '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  'check-square': '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><path d="M8 12l3 3 5-6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  'star-filled': '<path fill="currentColor" stroke="none" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  fire: '<path d="M12 3.5c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 12 12a2 2 0 0 0 2-2c1.5 1 2.5 3 2.5 5a4.5 4.5 0 1 1-9 0c0-3 2-4.5 2-7 0-1.5.8-3 2.5-4.5Z"/>',
  cards: '<rect x="7.5" y="6" width="11.5" height="14" rx="2" transform="rotate(7 13 13)"/><rect x="5" y="5" width="11.5" height="14" rx="2"/>',
  edit: '<path d="M4 20l1-4 11-11 3 3-11 11Z"/><path d="M14 7l3 3"/>',
  medal: '<path d="M8.5 3.5l3 6M15.5 3.5l-3 6"/><circle cx="12" cy="15" r="4.5"/><path fill="currentColor" stroke="none" d="M12 12.7l.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2Z"/>',
  crown: '<path d="M4 8l3 8h10l3-8-5 3-3-5-3 5Z"/><path d="M4 19h16"/>',
  backpack: '<path d="M6.5 9a5.5 5.5 0 0 1 11 0v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M9 13h6v3H9z"/>',
  download: '<path d="M12 4v10M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  printer: '<path d="M7 8V4h10v4"/><path d="M6 8h12a2 2 0 0 1 2 2v6h-4v-3H8v3H4v-6a2 2 0 0 1 2-2Z"/><rect x="8" y="15" width="8" height="5" rx="0.5"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14v2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  moon: '<path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z"/>',
  volume: '<path d="M4 9v6h3.5L13 19V5L7.5 9Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10"/>',
  'volume-off': '<path d="M4 9v6h3.5L13 19V5L7.5 9Z"/><path d="M17 10l4 4M21 10l-4 4"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',

  // — Five Kakaars (used in the Baal Updesh popup) —
  kirpan: '<path d="M5 19c4-1 9-5 13-13"/><path d="M15.5 8.5l3 3M18 6l1.8-1.8"/><path d="M6.5 17.5l-2 2"/>',
  kara: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="4.8"/>',
  kangha: '<rect x="4.5" y="6" width="15" height="4" rx="1"/><path d="M6 10v7M8.5 10v7M11 10v7M13.5 10v7M16 10v7M18 10v7"/>',
  kachera: '<path d="M6 4h12v4l-2 12h-3l-1-8-1 8H8L6 8Z"/><path d="M6 8h12"/>',
  kesh: '<path d="M12 4a6 6 0 0 0-6 6c0 4 .3 7 .3 9M12 4a6 6 0 0 1 6 6c0 4-.3 7-.3 9"/><path d="M9 10c0 4-.2 6-.2 8M15 10c0 4 .2 6 .2 8M12 8v10"/>',
};

// Full <svg> element as a string, for client-side JS that builds HTML.
export function iconSvg(name: string, cls = 'h-6 w-6'): string {
  const body = ICON_PATHS[name] ?? ICON_PATHS.book;
  return `<svg class="${cls}" ${ICON_ATTRS}>${body}</svg>`;
}

// The verification seal — DESIGN.md's Iconography law: "The verification
// mark is the drawn seal, rendered pixel-identical across verse -> course
// pill -> catalog card -> certificate -> verify page." This promotes the
// medal-in-a-circle mark already shipped on the course completion badge
// (course/[id].astro) to one shared source, so the certificate and the
// verify page render the identical mark instead of two hand-tuned copies.
// Decorative only — the surrounding copy already names it ("Sealed",
// "Valid certificate"), so it stays aria-hidden like every other icon here.
// Border uses `border-saffron` (the fixed #f4b21a token, not an opacity
// modifier on a variable-driven one) deliberately: Tailwind v4 compiles an
// opacity modifier on a `rgb(var(...) / <alpha-value>)` token to
// `color-mix(in oklab, ...)`, and Chromium's getComputedStyle resolves that
// to an `oklab()` value that html2canvas cannot parse -- it throws
// "Attempting to parse an unsupported color function 'oklab'" and the whole
// certificate download silently fails. Found by actually exercising the
// download button, not by reading the CSS. A solid, non-variable border
// colour sidesteps the whole class of bug.
export function sealMark(cls = 'h-[76px] w-[76px]'): string {
  return `<div class="seal-mark grid ${cls} shrink-0 place-items-center rounded-full border-2 border-saffron bg-saffron-soft text-saffron-deep" aria-hidden="true">${iconSvg('medal', 'h-8 w-8')}</div>`;
}

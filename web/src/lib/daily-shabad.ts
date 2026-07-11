// Daily Shabad — the homepage centerpiece. Picks a full tuk from a deterministic
// ang-of-the-day and renders it verbatim into the pre-rendered #daily-shabad shell.
//
// Reverence rules (DESIGN.md): the display text comes only from the verified local
// corpus (/assets/gurbani/sggs/{ang}.json), is never truncated or altered, always
// carries its ਅੰਗ citation, and links into the reader. Any fetch/parse failure leaves
// the card hidden — we never show a partial or fabricated verse.

interface AngData { ang: number; lines: string[] }

// Strip danda, vishram marks, digits (Latin + Gurmukhi) and whitespace so that a
// "full line" is judged on its actual letter content, not punctuation length.
const stripped = (s: string): string =>
  s.replace(/[॥।.;०-९੦-੯0-9\s]/g, '');

export async function initDailyShabad(): Promise<void> {
  const shell = document.getElementById('daily-shabad');
  if (!shell) return;
  try {
    const now = new Date();
    const day = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
    const ang = (day % 1430) + 1;
    const res = await fetch(`/assets/gurbani/sggs/${ang}.json`);
    if (!res.ok) return;
    const data = (await res.json()) as AngData;
    const lines = data.lines;
    if (!Array.isArray(lines) || !lines.length) return;

    const candidates = lines.filter((l) => stripped(l).length >= 12);
    const line = candidates.length ? candidates[day % candidates.length] : lines[0];
    if (!line) return;

    const lineEl = document.getElementById('ds-line');
    const citeEl = document.getElementById('ds-cite');
    const linkEl = document.getElementById('ds-link') as HTMLAnchorElement | null;
    if (!lineEl || !citeEl || !linkEl) return;

    lineEl.textContent = line;
    citeEl.textContent = `ਅੰਗ ${ang} · ਸ੍ਰੀ ਗੁਰੂ ਗਰੰਥ ਸਾਹਿਬ ਜੀ`;
    linkEl.href = `/santhiya?src=sggs&ang=${ang}`;
    shell.hidden = false;
  } catch {
    // Stay hidden on any failure — never render a partial verse.
  }
}

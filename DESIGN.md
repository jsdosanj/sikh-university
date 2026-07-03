# Sikh University — Design System

The contract for every visual change. It exists so that many editing passes (human or
agent) stay coherent instead of drifting back to emoji, stock blues, and template layouts.
Precedence: the user's explicit direction → this file → individual taste.

## Principles (ranked — cite these when a call is close)

1. **Reverence over flourish.** The product's feeling is reverence, trust, and generosity.
   Nothing begs, sells, or is sloppy. When in doubt, quieter.
2. **Gurmukhi is first-class, never a fallback.** Sacred script is self-hosted and set with
   care, never left to whatever font a device happens to have.
3. **Trust is earned, not claimed.** Verification and review-status copy must never overclaim.
4. **As little design as possible.** Every element earns its pixels; subtract before adding.

## Type — locked

Fonts are self-hosted in `web/public/fonts/` (`fonts.css`, linked in `Base.astro`). No CDN
font links (the CSP forbids external font hosts, and reverence forbids leaving Gurbani to chance).

| Role | Family | Notes |
|------|--------|-------|
| Shabad / verse | **Noto Serif Gurmukhi** | `.shabad` and `.lesson-prose blockquote.gurbani`; generous leading |
| Gurmukhi UI / labels | **Noto Sans Gurmukhi** | `font-gur` / `.gur` |
| Latin body + headings | **Source Serif 4** (Georgia fallback) | `font-serif` |
| Micro-labels, data, buttons | system sans | `font-sans` |

Rules: `.gur` bumps size to `1.12em` and leading to `1.9` (Gurmukhi reads optically smaller).
`.shabad` uses a fluid `clamp()` scale with `line-height: 2.05`. Every Gurmukhi run in markup
carries `lang="pa"`. **No raw `text-[0.9xrem]` literals** — use the scale.

## Color — locked tokens + banned list

Tokens live in `web/src/styles/global.css` (`--c-*`, light + dark). Navy + gold on a warm
paper ground. Gold (`--c-saffron-deep`, AA-contrast) is the sole accent; semantic
good/warn/critical are separate from the accent.

**Do not use:** the generic product-blue (`#1f6feb`) in heroes or as an accent; pure `#fff`
paper (use the warm surface tokens); any color not derived from the tokens.

## Iconography — law

- **One line-icon set**, `currentColor`, consistent stroke, in the Logo's visual language.
- **Emoji are banned as UI glyphs** on core surfaces (topic icons, mission cards, badges, FAB,
  affordances). They render differently per OS and read as templated. A CI grep guard enforces
  this once the icon set lands.
- The verification mark is a distinct drawn **seal** (not a checkmark, not emoji, not the Logo),
  rendered pixel-identical across verse → course pill → catalog card → certificate → verify page.

## Component canon

Card, pill/badge, `ReviewStatus` (three states: AI-drafted → quotes-verified →
scholar-reviewed, with honest copy that never lets "verified" imply "scholar-approved"),
`VerifiedMark` (the five-surface seal), a Modal/Toast primitive (replaces `prompt()`/`alert()`),
a state kit (skeleton / empty / error / 404), and the certificate. Each with a "use when".

## Motion

Whisper-quiet: hover lifts, a gentle staggered reveal at most. No gradient-blob heroes, no
parallax. Everything behind `prefers-reduced-motion`.

## Reverence rules for sacred content

Gurbani is never smaller than surrounding Latin; never rendered in a Latin-only fallback;
always `lang="pa"`. A verified mark points to how verification works and never overstates it.

## Per-change acceptance checklist

- [ ] `/design-review` returns zero high-severity findings
- [ ] WCAG 2.2 AA on the changed flow (contrast, focus, keyboard, touch targets)
- [ ] No emoji as UI glyphs on core surfaces (grep guard once icons land)
- [ ] No `prompt(`/`alert(` in shipped flows
- [ ] Fonts self-hosted; CSP has no external font host
- [ ] Any Gurmukhi run carries `lang="pa"` and a real Gurmukhi face
- [ ] No raw `text-[…rem]` literal outside the type scale

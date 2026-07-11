# Sikhi University — Design System 2.0 (glass · cinematic)

The contract for every visual change. It exists so that many editing passes (human or
agent) stay coherent instead of drifting back to emoji, stock blues, and template layouts.
Precedence: the user's explicit direction → this file → individual taste.

## Principles (ranked — cite these when a call is close)

1. **Reverence over flourish.** The product's feeling is reverence, trust, and generosity.
   Motion and glass exist to make learning feel precious — never to show off. When a
   flourish competes with content, the flourish loses.
2. **Gurmukhi is first-class, never a fallback.** Sacred script is self-hosted and set with
   care, never left to whatever font a device happens to have.
3. **Content is never gated on JavaScript or motion.** A production incident hid entire
   course pages because content sections were reveal-gated and the observer never fired.
   Law: lesson prose, quiz, santhiya text, and any primary content must be fully readable
   in raw HTML with JS disabled. Reveal/stagger is for decorative grids only.
4. **Trust is earned, not claimed.** Verification and review-status copy must never overclaim.

## Type — locked

Fonts are self-hosted in `web/public/fonts/` (`fonts.css`, inlined into `Base.astro`'s
head). No CDN font links (the CSP forbids external font hosts).

| Role | Family | Notes |
|------|--------|-------|
| Shabad / verse | **Noto Serif Gurmukhi** | `.shabad` and `blockquote.gurbani`; generous leading |
| Gurmukhi UI / labels | **Noto Sans Gurmukhi** | `font-gur` / `.gur` |
| Urdu UI | **Noto Nastaliq Urdu** | auto via `html[lang="ur"]`; loose leading |
| Latin body + headings | **Source Serif 4** (Georgia fallback) | `font-serif` |
| Micro-labels, data, buttons | system sans | `font-sans` |

Display scale: `.text-display` / `.text-display-sm` / `.eyebrow` are the only sanctioned
sizes above `text-4xl`. `.gur` bumps to `1.12em` / 1.9 leading; every Gurmukhi run carries
`lang="pa"`. No raw `text-[Nrem]` literals outside the scale.

## Color — locked tokens + banned list

Tokens live in `web/src/styles/global.css` (`--c-*`, light + dark). Navy + gold on warm
paper. Gold (`--c-saffron-deep` for text on light) is the sole accent.

**Do not use:** the generic product-blue (`#1f6feb`) as an accent; pure `#fff` paper; any
color not derived from the tokens.

## Glass — the surface language

Tokens: `--glass-bg` (surface/.78 light, .70 dark), `--glass-bg-strong` (.90/.86),
`--glass-border`, `--glass-hairline`, `--glass-blur` 14px / `--glass-blur-strong` 20px,
themed `--glass-shadow`.

| Class | Use when |
|---|---|
| `.glass` | Section panels, feature groups — a shared pane over an ambient |
| `.glass-strong` | Nav, command palette, modals, toasts, floating controls |
| `.glass-lite` | Cards inside grids (no backdrop-filter — alpha bg + hairline + shadow) |
| `.glass-card` | A standalone interactive card that earns real blur + hover lift |

**Hard laws:**
- **Blur budget: at most 6 elements with live `backdrop-filter` visible per viewport**
  (the nav counts as one). Card *groups* put glass on the group panel or use `.glass-lite`
  per card — never a grid of eight blurred cards.
- Below 640px, `.glass-card` automatically demotes to the lite form (CSS handles it).
- `@supports not (backdrop-filter)` falls back to near-solid surfaces (CSS handles it).
- `body.hc` (high-contrast) forces every glass surface solid black — already wired in
  `Base.astro`; never bypass it.
- Never animate `filter`/`backdrop-filter`. Hover states move `transform`/`box-shadow` only.
- Text on glass: `text-ink`, `text-navy`, `text-saffron-deep` (and white/near-white on the
  navy ambients). `text-muted` only at ≥0.95rem and never for essential copy.
- **Sanctioned AA pairs (enforced by `test/contrast-glass.mjs` at build):** `text-ink`
  passes on any glass over any ambient in both themes. `text-muted`/`text-saffron-deep`
  pass on `.glass-strong` everywhere, and on regular `.glass` only over `study` (light
  theme) or any ambient (dark theme). Over `hall`/`sanctum` in the light theme, regular
  `.glass` sanctions **ink only** (muted lands ~3.6:1 there — use ink or upgrade the
  surface to `.glass-strong`).
- The certificate render surface stays **solid** (html2canvas cannot rasterize blur).

## Ambient backgrounds — one layer per page

`Base.astro` takes `ambient: 'hall' | 'study' | 'sanctum' | 'none'` and renders a single
fixed, `aria-hidden`, `z-index:-1` layer (a fixed *element*, not `background-attachment` —
iOS). Sections stop owning their own full-bleed gradients; glass panels sit over the ambient.

| Ambient | Pages | Character |
|---|---|---|
| `hall` | index, about, programs, login, 404, cert | grand navy, two slow-drifting radial glows + lattice |
| `study` | catalog, course, dashboard, search, professors | warm paper, manuscript grain, static saffron top glow |
| `sanctum` | santhiya, zen reader, baal-updesh, collections | deep navy→ink, lattice, 90s "diya" glow pulse |

Ambient animation is transform/opacity keyframes only and is frozen by the global
reduced-motion kill-switch.

## Motion vocabulary

Vars: `--ease-out` (enters), `--ease-cinema` (transitions, ring sweeps), `--ease-spring`
(celebration, palette pop); `--dur-press` 150ms, `--dur-hover` 300ms, `--dur-reveal`
600ms, `--dur-grand` 1200ms; ambients 40–90s.

| Move | Spec | Never on |
|---|---|---|
| enter | `.reveal` fade+rise 16px, IO **threshold 0** (law — see Principle 3) | lesson/quiz/santhiya content |
| stagger | `data-reveal-delay`, 90ms steps | more than 6 siblings |
| tilt-3d | `[data-tilt]`, ≤6°, `(pointer:fine)` only, rAF, will-change scoped to hover | touch devices, content blocks |
| parallax | `data-parallax="0.15/0.3"` hero layers, desktop only, translate3d | body content, mobile |
| page transitions | CSS-only MPA `@view-transition` cross-fade 250ms; Safari falls back to `su-page-enter` (auto-disabled where VT is supported) | — |
| progress ring | SVG `data-ring-pct` dashoffset sweep 900ms; the value is ALWAYS also text | rings without a text value |
| celebration | drawn seal stamp-in (`--ease-spring`) + one glow pulse + toast | confetti, emoji, sound |

All motion is behind `prefers-reduced-motion` (global kill-switch + JS `reduced()` gates);
reduced users get final states instantly.

## Layout — the grid law

Any card group with **4 or more items renders as a 2-column grid at `sm+`** (2×2, 2×3…).
Lesson text and long-form reading are always full-width (max measure `68ch`). Reading
surfaces are never inside grids.

## Iconography — law

One line-icon set (`web/src/lib/icons.ts`), `currentColor`, consistent stroke. **Emoji are
banned as UI glyphs** (CI grep guard). The verification mark is the drawn seal, rendered
pixel-identical across verse → course pill → catalog card → certificate → verify page.

## Component canon

Glass card, pill/badge, `ReviewStatus`, `VerifiedMark` seal, glass Modal/Toast (in
`Base.astro`), command palette, progress ring, state kit (skeleton / empty / error / 404),
ambient layer, certificate (solid surface).

## Reverence rules for sacred content

Gurbani is never smaller than surrounding Latin; never rendered in a Latin-only fallback;
always `lang="pa"`; never truncated, paraphrased, or machine-generated — display text comes
only from the verified local corpus (`verify-gurbani.mjs` gates the build). The daily
shabad renders a full tuk verbatim with its ਅੰਗ citation and a link into the reader.

## Per-change acceptance checklist

- [ ] Content readable with JS disabled (course pages especially)
- [ ] ≤6 live backdrop-filter elements at any scroll position (audit snippet in docs/SEO QA)
- [ ] WCAG 2.2 AA on the changed flow — including text-on-glass over the darkest ambient stop
- [ ] Reduced-motion pass: ambients static, reveals instant, rings show final value
- [ ] `body.hc` forces solid surfaces on any new glass
- [ ] No emoji as UI glyphs; no `prompt(`/`alert(`; fonts self-hosted; CSP untouched
- [ ] Any Gurmukhi run carries `lang="pa"` and a real Gurmukhi face
- [ ] No raw `text-[…rem]` literal outside the type scale
- [ ] Protected JS hooks preserved (page scripts query IDs/classes — enumerate before re-skinning)

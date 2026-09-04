# Design enhancement brief — the Sikhi family of properties

Paste this to a fresh Claude session (ideally with the `artifact-design` skill or
equivalent design judgment available) when you're ready to actually execute the
visual pass. It is written to be handed over cold — no prior conversation needed.

## The situation, stated plainly

There are (at least) two properties that should feel like one family but currently
run two unrelated design languages:

- **sikhi.io** (the archive): a cosmic/starfield identity — amber-400 as the sole
  functional accent, ancient-gold (#D4AF37) reserved for ornament only, parchment
  tones, a canvas-driven gravitational-lens hero. Built up ad hoc over many sessions;
  no single DESIGN.md governs it the way sikhiuni has one.
- **sikhiuni.com** (the university): a deliberate "glass · cinematic" system —
  navy + gold on warm paper, self-hosted Noto Serif/Sans Gurmukhi, a strict glass/
  blur budget (max 6 live `backdrop-filter` elements per viewport), AA-contrast-
  tested surface tokens, three named ambient ('hall' / 'study' / 'sanctum'). This
  one already has a real spec: `sikhiuni/DESIGN.md`. Read it in full before
  touching a single sikhiuni page — it is the contract, not a suggestion.

Both are described by their owner as "looking a bit basic" relative to what they
could be. Neither is ugly or broken — sikhiuni in particular already has real
craft in its written spec — the gap is between the *system that's written down*
and what actually ships: default-feeling component execution, weak hero moments,
insufficient hierarchy, motion that doesn't yet earn its keep.

## The one decision to make before any pixel changes

**Are these one brand or two coordinated siblings?** Don't guess — ask the user,
or if told to just proceed, default to **coordinated siblings, not one merged
system**: sikhi.io is a sacred-text archive (reverent, historical, borderless
cosmic scale) and sikhiuni is a university (structured, collegiate, glass-and-gold
"institution" feeling) — collapsing them into one skin would flatten a real
difference in what each property is *for*. What should be shared instead:
- One typographic philosophy (a serif for reading long-form/scripture text, a
  restrained sans for UI, self-hosted Gurmukhi treated with equal care on both).
- One motion philosophy (the same "does this earn its keep or is it decoration"
  bar — sikhiuni's own DESIGN.md principle #1, "reverence over flourish", applies
  equally to sikhi.io).
- A shared cross-property navigation moment (the existing `/dashboard` tile
  switcher on sikhi.io already does this — make sure whatever ships here doesn't
  make that switch feel like leaving one product and entering an alien one).
- NOT shared: the accent color, the ambient/background language, the specific
  glass vocabulary — sikhiuni's glass system is *its* answer to "how does a
  university feel trustworthy", not a universal rule.

## What "enhance" means here — read `artifact-design`'s cliché list first

Whatever comes out of this must NOT land on the generic-AI-design cluster: warm
cream + serif + terracotta, near-black + one acid accent, a purple-to-blue
gradient hero, Inter/Space Grotesk as the safe default, `rounded-lg` everywhere,
emoji as section markers, everything centered. Both properties already have a
real accent decision (amber/gold family) — the job is executing THAT more
confidently, not replacing it with a trend.

For sikhiuni specifically: the existing DESIGN.md is unusually well-specified
(locked type scale, locked color tokens, a blur budget, contrast-tested pairs).
**Do not relitigate those decisions.** The enhancement pass is about EXECUTION
inside that contract — hero moments, component polish, motion choreography,
information hierarchy — not about rewriting the tokens. If you think a token is
genuinely wrong, say so explicitly and ask, don't quietly override it.

For sikhi.io: there is no equivalent locked spec. Part of this brief's job is to
write one — a `DESIGN.md` for sikhi.io modeled on sikhiuni's own (principles,
locked type scale, locked color tokens, banned list, one ambient-layer rule) so
future sessions stop drifting. Ground it in what's ALREADY there and working
(the cosmic hero, the amber accent, the parchment reading surfaces for scripture)
rather than inventing a new identity from scratch.

## Required deliverable shape: desktop AND mobile, shown together, not described

Every proposed screen must be designed and shown as a real pair, not a single
"responsive" mockup with a hand-wave:

- **Desktop ("multi-window" composition)**: sikhiuni's glass-panel language
  already implies multiple simultaneous surfaces on screen at once (nav +
  content panel + a floating card/toast) — lean into that. sikhi.io's desktop
  layout should likewise be designed as a real multi-pane composition (the
  existing left rail + content + right-side language sidebar on scripture
  readers is the closest precedent — study it before proposing a new layout).
- **Mobile**: single-column, touch-first, matching sikhi.io's own established
  mobile-shell conventions (bottom tab bar, `lg`-breakpoint shell switch, 44px
  minimum touch targets, sheet-style modals) — do not propose a different
  mobile paradigm than what sikhi.io has already converged on through many
  iterations; extend it, don't replace it.
- Show BOTH states for every proposed screen/component, at real breakpoints
  (390px and ~1440px minimum), not just "it'll reflow."

## Process

1. Read `sikhiuni/DESIGN.md` in full, and skim sikhi.io's own `CLAUDE.md` for its
   established mobile-shell/nav/reader conventions (do not re-derive these from
   scratch — they were hard-won across many prior sessions, documented at length).
2. Pick 3-5 real, currently-live screens per property (not hypothetical ones) —
   e.g. sikhiuni's course/lesson page and its login/dashboard; sikhi.io's
   homepage, a scripture reader, and the `/dashboard` cross-property switcher.
3. For each: name specifically what reads as "basic" (be concrete — "the card
   grid has no hierarchy, every course reads the same weight" beats "needs more
   polish"), then design the enhanced version as a real desktop+mobile pair.
4. Write (or, for sikhi.io, draft) the `DESIGN.md` that would keep future
   sessions from drifting back to the basic version.
5. Flag anywhere the honest answer is "this needs real content/photography/a
   commissioned illustration, not more CSS" — don't paper over a content gap
   with a visual effect.

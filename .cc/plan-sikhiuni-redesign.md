# Plan: Sikhi University platform-wide visual redesign (Archivo registrar's-ledger system)

Branch: `claude/full-multiscreen-redesign` (already checked out — do NOT create another).
Design source: `.cc/redesign-prototype-source.html` (gitignored, 1765 lines). PRs go to
GitHub remote `upstream` (`jsdosanj/sikh-university.git`) via `gh` — there is NO Forgejo
remote for this repo.

## Goal

Apply the prototype's visual system — Archivo display/body type, IBM Plex Mono
labels/data, flat "registrar's ledger" surfaces (ruled lists, 2–3px radii, mono
eyebrows, navy band heroes, midnight `#0A1729` dark heroes) — to every designable page
of the platform, mapped onto the existing locked `--c-*` tokens, with all 9 build gates
and the root vitest suite green throughout, and the four ranked DESIGN.md principles
(reverence, Gurmukhi first-class, content-never-gated-on-JS, trust-never-overclaimed)
carried forward intact.

## Non-goals

- No new features, routes, data models, or API changes. Visual re-skin + copy-structure
  only; page JS behaviour (progress, quizzes, audio, auth, cert render) is preserved.
- No adoption of the prototype's INVENTED content: course codes ("THEO 110" — the
  prototype itself says "codes are mine… the repo identifies courses by slug"), cohort
  schedules ("nothing on this page is real"), fake stats/progress numbers, redrafted
  legal wording ("designed, not drafted"). Real repo data only, always.
- No new Gurbani strings. Display text comes only from the verified local corpus
  (`verify-gurbani.mjs` gates the build); the prototype's hardcoded tuks are layout
  placeholders, never content to copy.
- No changes to `/read.astro` and `/muharni.astro` — both are pure redirect shells with
  zero visual surface (verified by reading them).
- No 3D work: the crest swap is done (b857c02). Crest appearances in nav/footer/cert
  stay flat PNG (`/assets/su-crest.png` etc.), per Decision 8.
- No CDN font links, ever (CSP is 'self'-only). No touching `wrangler.toml`, Worker
  code, D1/R2, or the deploy pipeline.

## The prototype block map (derived fresh from the file — supersedes the stale "24 of 35" summary)

The design tool's own `SCREENS` table (prototype lines 1668–1702) is authoritative for
route ↔ flag ↔ ambient ↔ cluster. 33 screens; 39 `<sc-if>` blocks (6 flags have a
draft + a refined variant). Skip the outer preview chrome (lines 276–307: sidebar,
route switcher, 1440/390 toggle — the design TOOL's UI, not the site).

| Flag (block lines) | Real page | Ambient (per SCREENS) | Cluster |
|---|---|---|---|
| `ishome` 309–343 | index.astro | hall | A |
| `iscourse` 345–383 | course/[id].astro | study | B |
| `isdashboard` 385–427 | dashboard.astro | study | C |
| `iscatalog` 429–462 | catalog.astro | study | A |
| `isprofessors` 464–495 | professors.astro | study | A |
| `issearch` 497–527 | search.astro | study | A |
| `isreader` 529–553 | santhiya.astro (ang-reader view, `?src=&ang=`) | sanctum | B |
| `islogin` 555–575 | login.astro | hall | C |
| `isteach` 577–589 | **review.astro** ("Review queue" — flag name misleads) | none | D |
| `isteachershell` 591–632 | **teach.astro** ("Scholar desk" — flag name misleads) | none | D |
| `isstudio` 634–693 (editor) + 859–878 (drafts list) | studio.astro | none | D |
| `isadmin` 695–737 + 880–905 | admin.astro | none | D |
| `iscert` 739–761 | cert.astro | study | E |
| `isverify` 763–788 | verify.astro | study | E |
| `isnotfound` 790–803 | 404.astro | hall | F |
| `isteachers` 805–822 (roster) + 1105–1142 (recruitment) | teachers.astro + teach.astro (see task 16) | hall | A |
| `iscollection` 824–838 (draft) + 1033–1064 (refined) | collection/[name].astro | sanctum | A |
| `iscohorts` 840–857 (draft) + 1416–1463 (refined) | cohorts.astro | study | B |
| `ismfa` 907–919 (draft) + 1369–1389 (refined) | mfa.astro | hall | C |
| `isprograms` 921–953 | programs.astro | study | A |
| `isprogram` 955–1005 | program/[id].astro | study | A |
| `ispaths` 1007–1031 | paths.astro | hall | A |
| `isprofessor` 1066–1103 | professor/[slug].astro | study | A |
| `issanthya` 1144–1172 | santhiya.astro (pathway view) | sanctum | B |
| `isbaal` 1174–1367 | baal-updesh.astro | sanctum | B |
| `isresetpw` 1391–1414 | reset-password.astro | hall | C |
| `isexternal` 1465–1481 | external.astro (see task 13 caveat) | hall | B |
| `isopendata` 1483–1502 | open-data.astro | study | F |
| `isintegrity` 1504–1520 | integrity.astro | study | E |
| `isaipolicy` 1522–1535 | ai-policy.astro | none | F |
| `islegal` 1537–1554 | legal.astro | none | F |
| `isfeedback` 1556–1581 | feedback.astro | none | F |
| `isabout` 1583–1602 | about.astro | hall | A |

**Coverage:** 35 route files − 2 redirect shells (read, muharni) = 33 designable pages.
32 have direct prototype blocks. The single gap is **teacher-shell.astro** (public
teacher profile, client-rendered) — extrapolated from the `isprofessor` pattern (task 8).

**Duplicate-flag rule:** where a flag has two blocks, the LATER block is the refined,
authoritative design (mfa #2 has filled digit boxes, cohorts #2 carries the honesty
note, collection #2 the Gurmukhi h1 + bani table). Exceptions where both blocks are
different VIEWS of one page: `isstudio` (drafts list #2 = landing state, editor #1 =
editing state — keep both), `isadmin` (merge both blocks' sections into one page),
`isteachers` (#1 roster → teachers.astro, #2 recruitment → teach.astro's apply
content — map by CONTENT, not by flag name).

**Placeholder-asset rule:** any `<img src="<uuid>">` in the prototype is an
unrecoverable design-tool asset reference. Crest images map to the repo's real
`/assets/su-crest*.png`. Faculty portraits map to whatever `professors.json` /
existing avatar assets already provide; where none exists, use the prototype's own
initials-disc fallback (line 490 shows it). Never fabricate an asset or hotlink one.

## Design decisions

1. **Prototype colors ARE the existing tokens — map, never fork.** Verified
   byte-identical to `web/src/styles/global.css` light tokens: `#FBF8F1`=--c-paper,
   `#FFFEFB`=--c-surface, `#10131A`=--c-ink, `#5B6473`=--c-muted, `#E4E8F0`=--c-line,
   `#16335C`=--c-navy, `#785205`=--c-saffron-deep, `#FDEEC8`=--c-saffron-soft; and to
   tailwind.config.mjs: `#F4B21A`=saffron, `#2f7d4f`=ok, `#1d4e89`=navy.soft,
   `#0b1e3a`=navy.deep. Every prototype hex is written as its token utility
   (`bg-paper`, `text-ink`, `border-line`, `text-saffron-deep`…) so dark mode keeps
   working — the prototype has no dark design and tokens are the only dark-mode story.
   Alternatives (literal hexes; a parallel palette) rejected: they'd break the dark
   theme and the locked-token law. Three genuine additions/adjustments, all named:
   `midnight: '#0A1729'` (new fixed dark-hero color, deliberately theme-invariant like
   `brand`), `danger` adjusted `#c0392b` → `#9A3B2A` (the prototype's editorial rust,
   used consistently across review/studio/admin states), `danger-soft: '#FFF4F2'`
   (rust tint panel bg). Program-level tints `#5c3b8a`/`#8a5a14` stay page-local
   constants in programs/paths (used nowhere else — not worth tokens).
2. **Archivo becomes the Latin text face site-wide; Vintage College Dept is retired;
   Source Serif 4 stays on disk but leaves the default stacks.** The prototype sets
   Archivo for headings AND body prose (course lesson body at 17.5px/1.72 is Archivo),
   and the user said "this is the new UI replacing all old" — a serif-body hybrid would
   be a design the prototype never shows. So: tailwind `sans` → Archivo-first;
   `body` switches from `font-serif` to the new sans; `.text-display`/`.text-display-sm`
   → Archivo 700, tight tracking (per prototype h1s), replacing the Vintage College
   Dept rules. **Vintage College Dept must go regardless of taste: `fonts.css` line
   143 documents it as a DEMO-LICENSE font in production** (the prototype's own admin
   screen renders this as a failing "Font licence audit" gate). Source Serif 4 woff2s
   and @font-face blocks are KEPT (zero-cost when unused; preserves rollback and any
   content that names it), but its `font-serif` role is re-pointed per task 2.
   Gurmukhi/Urdu faces are untouched — locked, first-class, out of scope.
3. **IBM Plex Mono is the new micro-label/data role.** Eyebrows, course/status chips,
   stat numerals, table headers, breadcrumbs, credential ids — everything the
   prototype sets in mono. New tailwind `mono` family + `.eyebrow` restyled to mono
   (11px-class, .16–.2em tracking, uppercase). Weights 400/500/600, latin + latin-ext
   subsets only (pa/hi/ur/ar/zh UI text renders in its own scripts' faces; the
   prototype's cyrillic/vietnamese subsets serve no supported language).
4. **Fonts are sourced from the google/fonts GitHub repo (OFL) and self-hosted** —
   never a CDN link, matching `fonts.css` conventions exactly (unicode-range splits,
   `font-display: swap`, file-naming `family-subset-weight.woff2`). Archivo ships as
   its variable font (wght 100–900) in normal + italic, latin + latin-ext, converted
   to woff2 with fonttools. LICENSE.txt gains both families; the demo-license line
   dies with the VCD file. Details in task 1.
5. **Glass is demoted, not deleted; ambients survive with the SCREENS assignments.**
   The prototype uses zero backdrop-filter — its surface language is flat warm paper,
   1px `line` hairlines, 2px navy section rules, 3px radii. But `test/contrast-glass.mjs`
   parses the glass/ambient CSS structure from global.css and HARD-FAILS if markers
   are missing, and the nav's frosted treatment is load-bearing chrome. So: all glass
   classes, glass tokens, and the three ambient definitions stay defined in CSS; the
   nav keeps `.su-nav` frost (1 blur, under budget forever); page tasks REPLACE glass
   panels with the new flat surfaces as they land. The ambient layer itself (one fixed
   aria-hidden layer per page) is retained — the prototype's SCREENS table assigns
   hall/study/sanctum/none per page and its dark gradients are literally the existing
   `.ambient-sanctum`/`.ambient-hall` stops. Page tasks set `ambient=` per the block
   map above. `bgImage` oil paintings are dropped from redesigned pages (the prototype
   has none; the prop stays supported).
6. **The grid law is revised: ruled ledgers are the new default for list-like data.**
   DESIGN.md's "4+ items = 2-col grid" law conflicts with the prototype's signature
   full-width ruled rows (catalog, cohorts, programs, rosters). New law (task 3):
   list-like/tabular data renders as ruled rows (border-b `line`, section head with
   2px navy rule); card GRIDS (visual cards with imagery) keep the 2-col-at-sm+ rule;
   reading surfaces stay full-width ≤68ch (unchanged).
7. **CinematicHero is unmounted from the homepage, kept on disk.** The prototype's
   home is a single compact editorial hero; a 381vh scroll-scrubbed film opener ahead
   of it contradicts both the new system and principle 1 (reverence over flourish —
   "when a flourish competes with content, the flourish loses"). The component file
   stays with a dated `UNMOUNTED` banner comment (same disable-at-source pattern the
   codebase already uses for `.pattern-lattice`), its R2 assets untouched, so reversal
   is a one-line re-import. The homepage keeps the `<model-viewer>` 3D crest on the
   hero's right (the user's explicit ask, already wired at b857c02).
8. **Crest appearances elsewhere are flat PNGs.** The prototype shows a small crest in
   the header lockup, a 52px crest in the schools panel, and a 78px crest on the
   certificate — all served by the existing `/assets/su-crest.png` /
   `su-crest-ivory.png`. No additional `<model-viewer>` instances (each is a WebGL
   context; one per site is the budget).
9. **i18n house rule (applies to every page task's acceptance criteria).**
   `scripts/i18n-extract.mjs` (the `check-i18n` build gate) FAILS the build if any
   `data-i18n*` key used in markup is missing from ANY of the 8 dictionaries
   (`web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`) — so "which languages"
   is decided by the gate: **all 8, in the same commit, always.** English lives in the
   markup itself as fallback text. Rules: (a) this is a re-skin — keep existing copy
   and existing keys wherever humanly possible; (b) new keys use the direct
   `data-i18n="…"` attribute form (the extractor's regex 1 — the `key:` frontmatter
   form is prefix-allowlisted and fragile for new prefixes); (c) unavoidable new keys
   get executor-supplied translations in all 8 dictionaries, with the commit body
   noting "i18n: machine-assisted translations, pending native review" (matching the
   site's existing auto-translate posture); (d) orphaned keys are only warnings —
   swept once at the end (task 21), not per-task.
10. **Verification shape for every page task (no visual-regression tooling exists).**
    Each page task must pass, in order: (1) `cd web && npm run build` — all 9 gates
    (sync-data → build-index → verify-gurbani → check-i18n → build-dataset → astro
    build → build-csp → no-reveal-on-content → contrast-glass); (2) a no-JS content
    proof: `grep -F` each of the 2–3 content strings named in the task's spec against
    the built static HTML under `web/dist/` for that route — this proves primary
    content is server-rendered (principle 3) without a human eyeballing it; (3) a
    blur-budget proof: `grep -c 'glass\b\|glass-strong\|glass-card'` in the page
    source ≤ the count the task names (usually 0 after redesign); (4) root `npm test`
    (vitest, 29 files) green; (5) a token-purity proof: `grep -nE '#[0-9a-fA-F]{6}'`
    in the page file returns only hexes the task explicitly sanctions (normally none —
    tokens only). Protected JS hooks: before re-skinning, enumerate every
    id/class the page's `<script>` blocks query (e.g. `#daily-shabad`, `#pp-bar`,
    `#teacher-profile`) and preserve them verbatim — this is DESIGN.md's existing
    checklist item and the page scripts are not being rewritten.
11. **Task order A → B → C/E → D → F, foundations first.** Foundations (fonts →
    tokens/primitives → DESIGN.md → nav/footer) are strictly sequential and block all
    pages. Page clusters then parallelize; the recommended order front-loads the
    public surface. Every one of the 33 designable pages lands in exactly one task
    (checked against the glob of `web/src/pages/**/*.astro`).
12. **Prototype "flagged" notes are design-honesty artifacts, not content.** Blocks
    like programs' "Two data problems found", cohorts' "no data for this yet",
    program's "codes are still a proposal" are the designer annotating REAL repo
    issues. They are not shipped as page copy. Where they flag a real data problem
    (programs' credits==courseIds count; M.A.S.S./Giani both listing 558 vs "534" in
    a description), the page task notes it in its commit body as a data issue for the
    maintainer — it does NOT silently "fix" data.

## Risk register

| Risk | Likelihood | Mitigation / rollback |
|---|---|---|
| `check-i18n` fails on a new key missing from one dictionary | High (every page task) | House rule 9: keys land in all 8 dicts in the same commit; the gate makes this unmissable locally before push |
| `verify-gurbani` fails because a task hardcoded a prototype tuk | Medium | Non-goal + per-task spec: Gurbani only via existing corpus-fed hooks (`#daily-shabad`, santhiya reader, collection data); acceptance greps forbid new `lang="pa"` verse literals except those already in the page pre-redesign |
| `contrast-glass.mjs` throws because a token/glass/ambient CSS marker was deleted | Medium | Decision 5: glass + ambient + `:root`/`[data-theme="dark"]` token structure is never removed; task 2's acceptance runs the gate directly |
| Dark theme breaks on redesigned pages (prototype is light-only) | Medium | Token-purity grep (Decision 10.5); fixed-dark surfaces use `brand`/`midnight` with white/near-white text (theme-invariant by design, like `.su-nav`); contrast gate still locks the sanctioned pairs |
| Radius/`.btn`/`.eyebrow` restyle (task 2) visually shifts not-yet-redesigned pages | Certain, accepted | Single-source primitives mean the interim drift is TOWARD the new system; rollout completes within this branch/PR, so no user ever sees a half-state on production |
| Removing VCD font breaks CinematicHero/nav lockup mid-rollout | Low | Ordering: task 1 adds new fonts but keeps the VCD @font-face; task 2 re-points `.text-display`/`.su-nav-link`; only task 21 deletes the file — every intermediate commit builds and renders (worst case: Georgia fallback for a few commits) |
| Page-script hooks broken by re-skin (ids/classes queried by JS) | Medium | Decision 10 hook-enumeration rule + root `npm test`; high-JS pages (course, santhiya, baal-updesh, dashboard, studio, admin, cert) each name their hook inventory step explicitly |
| html2canvas can't rasterize the redesigned certificate | Low | Cert surface stays fully solid (permanent law); Archivo/Plex Mono are ordinary woff2s html2canvas handles; acceptance includes exercising the download path in dev |
| Service-worker serves stale CSS/fonts to returning visitors after ship | Medium | Task 21 bumps `CACHE = 'su-web-v25'` in `web/public/sw.js` (activate handler purges old caches on version bump — verified by reading sw.js) |
| Prototype's invented content leaks into real pages (codes, cohort dates, legal text) | Medium | Non-goals + Decision 12; per-task acceptance greps for "THEO 110"-shaped codes return nothing |
| RTL (ur/ar set `dir=rtl` in Base) breaks the new flex ledgers | Low | Flex/grid rows mirror natively; tasks avoid physical left/right utilities in favour of logical ones where a direction matters; ur/ar spot-check in task 22 |

## Tasks

---

- **id**: 1
- **title**: Self-host Archivo + IBM Plex Mono (OFL), additive to fonts.css
- **tier**: IMPLEMENT
- **spec**: Download from the google/fonts GitHub repo (OFL directories — never a
  fonts.googleapis.com link): `ofl/archivo/Archivo[wdth,wght].ttf` and
  `Archivo-Italic[wdth,wght].ttf`; `ofl/ibmplexmono/IBMPlexMono-{Regular,Medium,SemiBold}.ttf`.
  Using fonttools (`pip install fonttools brotli`): for Archivo, pin the wdth axis to
  100 (`fonttools varLib.instancer Archivo[wdth,wght].ttf wdth=100 wght=100:900`) —
  the prototype never uses the width axis and dropping it cuts weight; then
  `pyftsubset --flavor=woff2` twice per file using EXACTLY the latin and latin-ext
  unicode-range lists already in `web/public/fonts/fonts.css` (copy the Source Serif 4
  blocks' ranges verbatim). Output files:
  `archivo-latin-var.woff2`, `archivo-latin-ext-var.woff2`,
  `archivo-latin-var-italic.woff2`, `archivo-latin-ext-var-italic.woff2`,
  `ibmplexmono-{latin,latin-ext}-{400,500,600}.woff2` — 10 files into
  `web/public/fonts/`. Append matching `@font-face` blocks to
  `web/public/fonts/fonts.css` following its exact conventions (`font-display: swap`,
  per-subset `unicode-range`, Archivo declares `font-weight: 100 900`). Keep every
  existing block INCLUDING Vintage College Dept (deleted in task 21, not here).
  Update `web/public/fonts/LICENSE.txt`: add Archivo (© Omnibus-Type, OFL-1.1,
  github.com/Omnibus-Type/Archivo) and IBM Plex Mono (© IBM, OFL-1.1,
  github.com/IBM/plex). In `web/src/layouts/Base.astro` swap the two `<link
  rel="preload">` font entries to `archivo-latin-var.woff2` +
  `notoserifgur-gurmukhi-400.woff2` (Archivo is now the above-the-fold Latin face). In
  `web/tailwind.config.mjs` `fontFamily`: `sans` → `['Archivo', -apple-system, …existing
  stack]`, add `mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo',
  'monospace']`, add `display: ['Archivo', 'Georgia', 'serif']`; leave `serif`,
  `gur`, `gurserif` untouched (serif gets re-pointed by usage, not by stack, in
  task 2). Do not edit global.css in this task.
- **acceptance criteria**: All 10 new woff2 files exist and each is < 120KB;
  `grep -c "Archivo" web/public/fonts/fonts.css` ≥ 4 and
  `grep -c "IBM Plex Mono" web/public/fonts/fonts.css` ≥ 6;
  `grep "fonts.googleapis\|fonts.gstatic" -r web/` returns nothing;
  `cd web && npm run build` green (all 9 gates); root `npm test` green;
  built `web/dist/index.html` contains the inlined Archivo @font-face (Base inlines
  fonts.css — grep it).
- **files**: `web/public/fonts/fonts.css`, `web/public/fonts/LICENSE.txt`,
  `web/public/fonts/archivo-*.woff2` (NEW ×4), `web/public/fonts/ibmplexmono-*.woff2`
  (NEW ×6), `web/src/layouts/Base.astro`, `web/tailwind.config.mjs`
- **depends_on**: —

---

- **id**: 2
- **title**: Foundations — token reconciliation + registrar's-ledger primitives in global.css/tailwind
- **tier**: ARCHITECT
- **spec**: In `web/tailwind.config.mjs`: add `midnight: '#0A1729'` (fixed, theme-
  invariant — document beside `brand`), change `danger` to `'#9A3B2A'`, add
  `'danger-soft': '#FFF4F2'`; change `borderRadius.xl2` from `'1.1rem'` to `'3px'`
  (the new system's sharp radius — deliberate global lever; every rounded-xl2 surface
  site-wide sharpens at once). In `web/src/styles/global.css`, restyle the primitives
  to the prototype's vocabulary using ONLY token utilities:
  `.eyebrow` → `font-mono`, ~11px, `letter-spacing: .18em`, uppercase, weight 500;
  `.btn` → 2px radius, uppercase 11.5px bold `.16em` tracking, square padding
  (13px 21px), navy outline on light / white-outline `.btn-ghost` on dark;
  `.btn-primary` → `bg-saffron text-midnight border-saffron`;
  `.text-display`/`.text-display-sm` → `font-family: Archivo` (replace the whole
  Vintage College Dept block incl. its `font-weight: 400 !important` and
  `text-transform: uppercase` — new rules: weight 700, `letter-spacing: -.034em`,
  sentence case, keep the `:not(.gur)` guard and the existing clamp sizes);
  `html:lang(en) .su-nav-link` block → drop the VCD family (plain `font-mono`
  uppercase `.14em` tracking per the prototype's nav row); `body` → swap `font-serif`
  to `font-sans` (Archivo body per Decision 2; `h1–h4` likewise `font-sans`, keep
  `text-navy`). Add NEW component classes (all in `@layer components`):
  `.rule-navy` (border-b 2px navy section head), `.row-ruled` (flex ruled list row:
  py, `border-b border-line`), `.chip-status` (mono 10px `.1em` bordered 2px-radius
  status chip — color set by the caller via text/border token utilities),
  `.band-navy` (`bg-brand text-white` page-header band), `.hero-midnight`
  (`bg-midnight text-paper` relative overflow-hidden + an aria-hidden gold radial
  glow child pattern documented in a comment), `.stat-mono` (mono 27px numeral +
  10px uppercase mono label pattern). DO NOT delete: any `--c-*` token, any glass
  class/token, the ambient definitions, `.shabad`, `.gur`, `.lesson-prose` family
  (restyle `.lesson-prose blockquote.gurbani` only minimally: left border 3px
  saffron, `bg-saffron-soft`, radius 0 — matching prototype line 371). Keep the
  reveal/motion/skeleton/marquee blocks untouched.
- **acceptance criteria**: `node test/contrast-glass.mjs` passes standalone;
  `cd web && npm run build` green; root `npm test` green; `grep -c "Vintage College
  Dept" web/src/styles/global.css` returns 0; `grep "midnight" web/tailwind.config.mjs`
  matches; all six new component classes appear in global.css; no `--c-*` token line
  was removed (`grep -c "\-\-c\-" web/src/styles/global.css` ≥ pre-change count of 16).
- **files**: `web/src/styles/global.css`, `web/tailwind.config.mjs`
- **depends_on**: 1

---

- **id**: 3
- **title**: DESIGN.md 3.0 — rewrite the contract for the new system
- **tier**: ARCHITECT
- **spec**: Rewrite `DESIGN.md` preserving its role and the four ranked principles
  verbatim. Type table becomes: Shabad/verse Noto Serif Gurmukhi (unchanged) ·
  Gurmukhi UI Noto Sans Gurmukhi (unchanged) · Urdu Noto Nastaliq (unchanged) ·
  **Display + headings + Latin body: Archivo** (weight/tracking rules from task 2) ·
  **Micro-labels, eyebrows, data, chips, breadcrumbs: IBM Plex Mono** · Source Serif 4
  listed as "retained on disk, no default role" · Vintage College Dept listed as
  RETIRED (demo license — cite fonts.css's own note). Color: same locked tokens +
  the three additions from task 2, with the "map prototype hexes to tokens" rule and
  the banned list carried forward. Surface language section replaces the glass canon:
  flat paper surfaces, `.rule-navy` section heads, `.row-ruled` ledgers, `.chip-status`
  vocabulary (REVIEWED/IN REVIEW/DRAFT etc. rendered in ok/saffron-deep/muted/danger),
  navy `.band-navy` page headers, `.hero-midnight` dark heroes with a single gold
  radial glow; glass demoted to "legacy chrome: `.su-nav` only; blur budget now
  trivially ≤2; classes remain defined for the contrast gate — do not add new glass
  surfaces." Ambient section: keep the one-layer law and the three ambients; replace
  the page table with the SCREENS assignments (copy the block map's ambient column
  from this plan). Grid law revised per Decision 6. Motion, reverence-for-sacred-
  content, iconography (emoji ban), and the per-change checklist survive with edits
  only where they referenced glass/serif specifics. Add the i18n house rule
  (Decision 9) as a checklist item.
- **acceptance criteria**: DESIGN.md contains: the four principles unchanged in rank
  and substance; a type table naming Archivo and IBM Plex Mono roles; the revised
  grid law; the SCREENS-derived ambient table; the glass-demotion paragraph; the
  i18n checklist item. `grep -c "Archivo" DESIGN.md` ≥ 2;
  `grep "Vintage College" DESIGN.md` marks it retired. Build + tests still green
  (docs-only change, but run them).
- **files**: `DESIGN.md`
- **depends_on**: 2

---

- **id**: 4
- **title**: Shared chrome — Nav and Footer in the new system
- **tier**: IMPLEMENT
- **spec**: `web/src/components/Nav.astro`: keep structure, links array, i18n keys,
  search form, lang switcher, scroll-deepening script, and the `.su-nav` frost
  EXACTLY as-is (hooks: `data-scrolled`, `#nav-search-form`, `#nav-search-input`,
  `data-cmdk-open` — enumerate any others before editing). Visual pass only: link
  treatment inherits task 2's mono `.su-nav-link`; active link gets the gold
  underline per prototype (`border-saffron`) — already close, align paddings/sizes to
  the prototype's header row (lines 312–315). Brand lockup keeps
  `/assets/su-crest.png` + `su-wordmark.png` (wordmark PNG is fine — do not re-set it
  in Archivo this task; if it clashes visually, flag in commit body rather than
  redraw). `web/src/components/Footer.astro`: read it first, keep every existing
  link/i18n key, restyle to the prototype's "The schools" panel (lines 327–341):
  mono eyebrow "The schools", 52px crest (`su-crest-ivory.png`), roman-numeral
  school list with `border-t border-line` cells on the site's real
  topic/school list from `web/src/lib/data` if the footer already renders topics —
  otherwise keep the footer's real sections and apply the ruled-cell treatment. Also
  restyle `web/src/components/TabBar.astro` and `web/src/components/CommandPalette.astro`
  surfaces minimally (token utilities + new radius come free from task 2; only fix
  anything that visually breaks — no structural change).
- **acceptance criteria**: `cd web && npm run build` green; root `npm test` green;
  built `web/dist/index.html` still contains `nav-search-input`, `data-cmdk-open`,
  and every nav link href present before the change (diff the href set); footer
  renders its real links (grep 3 pre-existing footer link hrefs in built HTML);
  no new `data-i18n` key missing from any of the 8 dictionaries (build gate).
- **files**: `web/src/components/Nav.astro`, `web/src/components/Footer.astro`,
  `web/src/components/TabBar.astro`, `web/src/components/CommandPalette.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json` (only if keys change)
- **depends_on**: 2, 3

---

- **id**: 5
- **title**: Homepage — editorial hero per `ishome`, CinematicHero unmounted
- **tier**: IMPLEMENT
- **spec**: `web/src/pages/index.astro` per prototype 309–343. Remove the
  `<CinematicHero />` mount and its import; add a dated comment pointing at Decision 7
  (component file untouched apart from an `UNMOUNTED <date>` banner comment at top of
  `web/src/components/CinematicHero.astro`). Remove the now-dead parallax/negative-
  margin comments if trivially safe. New hero (on `ambient="hall"`, `bodyClass="su-home"`
  kept — check `.su-nav:not([data-scrolled])` home treatment still reads over the new
  hero; if the transparent-over-film treatment now looks wrong over `hall`, delete
  the `body.su-home` special-case block in global.css and say so in the commit):
  `.hero-midnight` band → Gurbani lead beat: REUSE the existing `#daily-shabad`
  mechanism (hooks `#ds-line`, `#ds-cite`, `#ds-link`, filled by daily-shabad.ts from
  the verified corpus; hidden shell on failure) restyled/repositioned as the
  prototype's leading verse + ang citation row — do NOT hardcode the prototype's
  ਸੋਚੈ tuk; then hairline, then the existing h1 "Dive into the depths of Sikhi." in
  `.text-display` (Archivo) with `text-saffron` span, existing sub copy + both CTAs
  (all existing `data-i18n` keys kept: home.eyebrow, home.herosub, home.cta.*,
  home.stat.*), stat row re-set in `.stat-mono` (keep `data-countup` hooks), and the
  `<model-viewer>` crest kept on the right column exactly as wired (b857c02). Below
  the hero: add the "The schools" ruled panel (prototype 327–341) fed from the real
  `topics` import — roman numerals generated by index, not hardcoded; keep every
  existing content section below the hero (Mission, stats etc.) with surface-level
  restyle only (rule-navy heads, ruled rows, token utilities).
- **acceptance criteria**: build green + tests green; built `web/dist/index.html`
  contains (no JS): "Dive into the depths of", "Browse courses", the schools panel
  with ≥ 5 real topic names, and the `model-viewer` tag with
  `src="/assets/sikh-uni-crest-v2.glb"`; contains NO `ch-stage`/`ch-canvas` (film
  gone); `#daily-shabad`, `#ds-line`, `#ds-cite`, `#ds-link`, `data-countup` all
  still present; zero `.glass`-family classes in index.astro; no hardcoded Gurbani
  verse literal added (`git diff` shows no new `lang="pa"` element with literal verse
  text beyond pre-existing ones).
- **files**: `web/src/pages/index.astro`, `web/src/components/CinematicHero.astro`,
  `web/src/styles/global.css` (only the `body.su-home` nav special-case, if removed),
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json` (if keys change)
- **depends_on**: 4

---

- **id**: 6
- **title**: Catalog + Search (study ledgers)
- **tier**: IMPLEMENT
- **spec**: `catalog.astro` per `iscatalog` (429–462): dept header (eyebrow-with-dash,
  display h1, mono stat pair), left filter rail as ruled rows with mono counts, main
  column grouped by school with `.rule-navy` heads (roman numeral + name + italic
  tagline) and `.row-ruled` course rows (REAL data: title, professor, lesson count —
  NO invented course codes; the code column becomes the topic short-label or is
  omitted, Decision 12). Keep `ambient="study"`, drop `bgImage`. Preserve all filter/
  search JS hooks (enumerate ids/classes in catalog.astro's scripts first) and the
  existing `CourseCard` usage where the page renders cards — if the ledger replaces
  CourseCard here, leave the component file untouched (other pages may use it).
  `search.astro` per `issearch` (497–527): bordered query box with mono `/` glyph,
  mono count chips, results in "In the corpus"/"Courses"/etc. columns with rule-navy
  heads — all fed by the existing client search (hooks preserved; result templates
  live in the page script — restyle the template strings' classes).
- **acceptance criteria**: build + tests green; built catalog HTML contains ≥ 3 real
  course titles and ≥ 2 school names without JS; built search HTML contains its
  static shell (query box + section heads); zero glass classes in both files; no
  string matching `[A-Z]{2,4} [0-9]{3}` (invented code shape) introduced; i18n gate
  green with keys in all 8 dicts.
- **files**: `web/src/pages/catalog.astro`, `web/src/pages/search.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 7
- **title**: Programs, Program detail, Paths
- **tier**: IMPLEMENT
- **spec**: `programs.astro` per `isprograms` (921–953): header band with mono stats
  (11 programmes / pass mark from real data), mono column-header row, one ruled row
  per programme from the REAL programs data (abbr in level-tinted mono — tints:
  certificate `text-saffron-deep`, associate `text-navy-soft`, bachelor `text-navy`,
  master `#5c3b8a` page-local const, giani `#8a5a14` page-local const; title +
  Gurmukhi sub-line `lang="pa"` from data; duration; course count labelled "Courses"
  NOT "Credits" if the data field is a count — note the credits==count data issue in
  the commit body, do not alter data). Ambient hall→study per SCREENS.
  `program/[id].astro` per `isprogram` (955–1005): navy `.band-navy` header
  (breadcrumb in mono, title + abbr, Gurmukhi line, mono meta row), body with
  required-courses ruled list (real course refs by slug/title), "Your standing" rail
  (preserve all progress/exam JS hooks — enumerate first), "Leads to" ruled block
  from real prerequisite data. `paths.astro` per `ispaths` (1007–1031):
  `.hero-midnight` header + 5-rung ruled ladder from the real ladder/program data;
  keep `ambient="hall"`.
- **acceptance criteria**: build + tests green; built programs HTML lists all real
  programmes' titles without JS (grep 3 of them, incl. "Giani"); built program page
  for one real id contains its real title + ≥ 3 real course titles; paths HTML
  contains its 5 rung names; zero glass classes; no invented codes (same grep as
  task 6); i18n gate green.
- **files**: `web/src/pages/programs.astro`, `web/src/pages/program/[id].astro`,
  `web/src/pages/paths.astro`, `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 8
- **title**: Faculty — professors, professor/[slug], teachers, teacher-shell
- **tier**: IMPLEMENT
- **spec**: `professors.astro` per `isprofessors` (464–495): eyebrow-with-dash header +
  mono scholar count, two-column ruled roster rows (52px round portrait or initials
  disc when no photo — prototype line 490's pattern; portraits from the site's real
  professors data), mono specialty line, and the portrait-credit mono footnote IF the
  real data carries credits (never invent attribution). `professor/[slug].astro` per
  `isprofessor` (1066–1103): `.band-navy` header with breadcrumb, 96px portrait, name,
  mono specialty/date row; body = real bio prose (max 70ch), Courses `.rule-navy`
  section with ruled rows + `.chip-status` review states from real data, "Source
  works" rail from real data. `teachers.astro` per `isteachers` **#1** (805–822,
  the roster block): "who teaches here" framing with contemporary-teacher ruled rows
  from the page's real teacher list; keep the real page's verified-badge semantics
  (`VerifiedMark`/ReviewStatus components if used — read the page first).
  `teacher-shell.astro` (NO prototype block — extrapolate from `isprofessor`): this
  page renders client-side into `#teacher-profile`/`#teacher-courses`; restyle the
  server shell + the template strings inside its script to the isprofessor pattern
  (band header, ruled course rows, chip badges); hooks `#teacher-profile`,
  `#teacher-courses`, `badge()` classes preserved.
- **acceptance criteria**: build + tests green; built professors HTML contains ≥ 4
  real scholar names without JS; built professor/[slug] page for one real slug
  contains name + ≥ 1 course title; teachers HTML contains ≥ 2 real teacher names
  (or its real empty-state); teacher-shell built HTML retains `teacher-profile` and
  `teacher-courses` ids; zero glass classes across all four; i18n gate green.
- **files**: `web/src/pages/professors.astro`, `web/src/pages/professor/[slug].astro`,
  `web/src/pages/teachers.astro`, `web/src/pages/teacher-shell.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 9
- **title**: About + Collection/[name]
- **tier**: IMPLEMENT
- **spec**: `about.astro` per `isabout` (1583–1602): `.hero-midnight` mission hero
  (real existing mission copy + its i18n keys — the prototype's mission text closely
  matches the site's real framing; keep the REAL copy), then the 4-pillar ruled grid
  (border-t navy cells, mono numerals). Keep `ambient="hall"`, drop `bgImage`.
  `collection/[name].astro` per `iscollection` **#2** (1033–1064, the refined block):
  dark gradient header (`ambient="sanctum"` — SCREENS assigns sanctum; current page
  has no ambient set, add it) with Gurmukhi h1 (`lang="pa"`, `.gur`-scaled) + English
  pair from the real collection data, ruled bani table (Bani / Author / Source-ang /
  When columns) fed by the real per-collection data — the ang citations come from
  data, never typed in; footer CTA pair ("Open in the reader" → real santhiya href).
  This is a dynamic route serving many collections (nitnem, sundar-gutka,
  panj-granthi, …) — the design must degrade for collections whose data lacks
  author/when fields (omit the column cell, never fabricate).
- **acceptance criteria**: build + tests green; built about HTML contains the real
  mission heading copy without JS; built collection/nitnem HTML contains ≥ 3 real
  bani names in Gurmukhi with `lang="pa"` attributes; zero glass classes; no new
  hardcoded ang citations (diff shows citations only from data bindings); i18n gate
  green.
- **files**: `web/src/pages/about.astro`, `web/src/pages/collection/[name].astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 10
- **title**: Course page (course/[id]) — the load-bearing content page
- **tier**: IMPLEMENT
- **spec**: Per `iscourse` (345–383). BEFORE editing: enumerate every id/class the
  page's scripts query (progress, quiz, mark-complete, lesson nav) and the
  `.lesson-prose` content pipeline — this page had the historic reveal-gating
  incident; principle 3 is absolute here. New skin: `.band-navy` course header
  (breadcrumb mono: Catalogue › <school> › <topic/slug label — no invented codes>,
  title, mono meta row: professor · N lessons · level · review status from real
  data), left lesson rail as ruled rows with mono indices + saffron active state +
  progress bar (existing hooks), main lesson column: mono "Lesson NN" eyebrow,
  Archivo h2, real lesson prose in `.lesson-prose` (unchanged pipeline), Gurbani
  blockquotes via the existing `blockquote.gurbani` restyle from task 2, bottom
  action row (Mark complete primary / Next lesson outline — existing handlers).
  Lesson content must remain fully server-rendered; no reveal classes on any content
  block (`no-reveal-on-content.mjs` gates this — keep it green).
- **acceptance criteria**: build + tests green INCLUDING `no-reveal-on-content.mjs`;
  built HTML for one real course id contains, without JS: course title, ≥ 2 lesson
  titles, and ≥ 1 sentence of real lesson prose; every enumerated JS hook id/class
  still present in built HTML; zero glass classes; `autoTranslate={false}` and
  `ambient="study"` preserved; i18n gate green.
- **files**: `web/src/pages/course/[id].astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 11
- **title**: Santhiya — pathway + ang-reader views
- **tier**: IMPLEMENT
- **spec**: `santhiya.astro` hosts BOTH prototype designs: `issanthya` (1144–1172) for
  the pathway landing and `isreader` (529–553) for the ang-reader view
  (`?src=…&ang=…` — `/read` redirects here). Enumerate all hooks first
  (`#su-hero`, `#pathway-progress`, `#pp-count`, `#pp-bar`, `#pp-continue`,
  `#pp-continue-name`, plus every reader-view id its scripts query — the reader is
  the most JS-dense surface in the repo). Pathway: sanctum hero (keep
  `ambient="sanctum"`, drop `bgImage`) with Gurmukhi ਸੰਥਿਆ h1 + "Santhya" pair
  (existing keys santhiya.*), the real `texts[]` pathway list re-set as the
  prototype's ruled ladder rows (mono index, bold title + Gurmukhi sub, description,
  `.chip-status` progress state driven by the existing progress JS). Reader view:
  dark gradient surface, top toolbar (source title mono + ang in Gurmukhi; the REAL
  toggle set the page already has — Larivaar/translation/audio etc. — restyled as
  mono bordered toggles, gold when active), verse column max 70ch centered with the
  existing `.shabad` classes and per-line rendering untouched (text pipeline is
  corpus-fed — zero changes to text handling), bottom bar: prev/next ang mono links +
  audio state readout (existing hooks). All Gurbani rendering keeps `lang="pa"` and
  existing font classes; sizes never below surrounding Latin.
- **acceptance criteria**: build + tests green; built santhiya HTML contains without
  JS: ਸੰਥਿਆ, "The Santhya Pathway" (or its real h1 copy), and ≥ 5 real pathway text
  names (ਨਿਤਨੇਮ, ਬਾਲ ਉਪਦੇਸ਼ …); every enumerated hook id present in built HTML; no
  change to any corpus/text-fetching script logic (diff shows class/markup changes
  only inside templates); zero glass classes; i18n gate green.
- **files**: `web/src/pages/santhiya.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 12
- **title**: Baal Updesh primer
- **tier**: IMPLEMENT
- **spec**: `baal-updesh.astro` per `isbaal` (1174–1367) — the largest single-page
  design. The real page already contains the primer's actual data (painti, navin
  toli, muharni table, words, sentences, numbers, flashcards, kakaars — plus real
  tap-to-hear audio wiring credited to Bhagat Jaswant Singh Ji Daudar). Enumerate
  every audio/flashcard/progress hook first. Re-skin each numbered section to the
  prototype's pattern: `.rule-navy` section head (mono numeral + Archivo h2 +
  Gurmukhi label + right-aligned mono note), letter tiles as bordered `surface`
  cells (37px-class Gurmukhi glyph + mono name), the muharni as the prototype's
  table treatment (navy header row, sticky first column with `bg-saffron-soft`,
  `dir="ltr"` scroll container — prototype 1236–1257), word/sentence/number card
  grids per prototype, flashcard panel + Review/Got-it buttons (existing SRS hooks),
  kakaar ruled list using the repo's EXISTING drawn kakaar icons (the prototype
  shows dashed placeholders and its own note says the real drawn components exist in
  the repo — use them). Audio degrade behaviour ("coming soon", never a dead button)
  unchanged. Sanctum hero per `isbaal` header with the santhiya-pathway backlink.
- **acceptance criteria**: build + tests green; built HTML contains without JS: all
  35 painti letters (spot-grep ੳ, ਸ, ੜ), the muharni table with ≥ 10 matra header
  cells, ≥ 3 real word cards, and the five kakaar names; every enumerated audio/
  flashcard hook preserved; all Gurmukhi runs carry `lang="pa"`; zero glass classes;
  i18n gate green.
- **files**: `web/src/pages/baal-updesh.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 13
- **title**: Cohorts + External
- **tier**: IMPLEMENT
- **spec**: `cohorts.astro` per `iscohorts` **#2** (1416–1463): header with mono
  "open now" stat, ruled cohort rows with `.chip-status` (JOIN/IN PROGRESS/WAITLIST)
  — ALL rows from the page's real cohort/invite-code functionality; the prototype's
  schedules are explicitly invented ("no data for this yet") — render the page's real
  join-by-code and teacher-create flows in the new skin, using the ledger only for
  whatever real cohort records exist (real empty state otherwise). Preserve every
  form/JS hook. Ambient hall→study per SCREENS. `external.astro`: CONTENT MISMATCH
  FLAG — the prototype's `isexternal` (1465–1481) designs a leaving-site
  interstitial, but the real page is a "Recommended external courses" list (verified
  from its Base title). Apply the visual vocabulary (midnight/hall header per
  SCREENS, ruled course rows with destination in mono, outbound-link framing copy
  the page already has) to the REAL recommended-courses content; do not build an
  interstitial.
- **acceptance criteria**: build + tests green; built cohorts HTML contains its real
  join/create UI shell (grep its form ids) without invented schedule rows (no "14 wk"
  literals unless from real data); built external HTML contains ≥ 2 of its real
  external course names (e.g. the Harvard course) without JS; zero glass classes;
  i18n gate green.
- **files**: `web/src/pages/cohorts.astro`, `web/src/pages/external.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 14
- **title**: Auth trio — login, mfa, reset-password
- **tier**: IMPLEMENT
- **spec**: One visual pattern, three pages, per `islogin` (555–575), `ismfa` **#2**
  (1369–1389), `isresetpw` (1391–1414): centered `.hero-midnight` full-page surface
  (ambient hall, drop `bgImage`), 64px flat crest (`su-crest-ivory.png`), mono
  eyebrow, Archivo h1, real form fields restyled (mono uppercase labels,
  1px `white/.34` bordered inputs on `white/.05`, 2px radius), gold primary button,
  mono footer links. MFA: six digit boxes per prototype #2 (52×62, gold border when
  filled — presentation only; the real input/validation JS is untouched). Reset:
  strength meter restyled as the 4-segment bar IF the page already has a strength
  indicator; otherwise do not add one. All three keep `noindex`, real form
  actions/ids/names, and every auth script untouched — enumerate hooks first;
  these are credential surfaces, so the diff must show zero JS-logic changes.
- **acceptance criteria**: build + tests green; `git diff` on the three files shows
  no changes inside `<script>` blocks beyond class strings in template literals (if
  any); built HTML for each contains its real form element with original
  action/method/ids; crest img present; zero glass classes; i18n gate green.
- **files**: `web/src/pages/login.astro`, `web/src/pages/mfa.astro`,
  `web/src/pages/reset-password.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 15
- **title**: Dashboard
- **tier**: IMPLEMENT
- **spec**: `dashboard.astro` per `isdashboard` (385–427): greeting header (mono "Sat
  Sri Akal" eyebrow — reuse existing key if present, else new key in all 8 dicts;
  Archivo name h1 filled by the page's real account JS) + `.stat-mono` row
  (in-progress/certificates/streak — existing hooks), navy "Continue where you
  stopped" resume band (existing resume logic/hrefs), "Enrolled" ledger (ruled rows:
  title + slim progress bar + mono % — existing progress rendering re-templated),
  "Today's ang" rail reusing the existing daily-shabad/ang hook if this page has
  one (if it doesn't, link into the reader — do not add a new corpus fetch).
  Enumerate all progress/streak/cert hooks first; `noindex` + study ambient kept.
- **acceptance criteria**: build + tests green; built HTML contains the static shell
  (section heads, resume band skeleton) without JS and every enumerated hook id;
  zero glass classes; no invented stats in static HTML (numbers come from JS or real
  data only); i18n gate green.
- **files**: `web/src/pages/dashboard.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 16
- **title**: Teach (scholar desk + apply) + Review (queue)
- **tier**: IMPLEMENT
- **spec**: Flag names mislead — map by content. `teach.astro`: read the real page
  first; it carries the apply-to-teach flow and (if present) a signed-in teacher
  desk. Apply-to-teach content takes `isteachers` **#2** (1105–1142): midnight
  "Teach with us" hero, 4-step ruled process grid, "What we ask" list, "Not a paid
  position — seva" honesty card (align wording to the page's REAL copy; the seva
  framing only if the real page already claims it — trust principle: never
  overclaim/invent policy). Any real desk/queue view takes `isteachershell`
  (591–632): stats header, "Your courses" ledger with `.chip-status`, "Needs you
  first" rail. `review.astro` takes `isteach` (577–589): review-queue header with
  mono awaiting/changes/cleared stats, mono column-header row, ruled queue rows with
  DOCTRINE/SOURCES/GURBANI chips — all driven by the page's real queue rendering
  (likely client-side: restyle template strings, preserve fetch/render hooks).
  SCREENS sets both to `ambient="none"` (workbench pages) — change from hall.
- **acceptance criteria**: build + tests green; built teach HTML contains its real
  apply copy/CTA without JS; built review HTML contains its real static shell +
  hook ids; no invented queue rows in static HTML; zero glass classes; i18n gate
  green.
- **files**: `web/src/pages/teach.astro`, `web/src/pages/review.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 17
- **title**: Studio + Admin (workbench pages)
- **tier**: IMPLEMENT
- **spec**: `studio.astro`: BOTH `isstudio` blocks are views of one tool — #2
  (859–878) drafts-list landing (filter chips MY DRAFTS/ALL/RETURNED, ruled draft
  rows with BLOCKED/VALIDATING/DRAFTING/READY chips, blocked-detail card with navy
  mono console block), #1 (634–693) the lesson editor (top bar with UNSAVED chip +
  Preview/Submit, lesson rail, title/body fields, the verified-green /
  citation-mismatch-rust Gurbani callout pattern, right gate-status rail). Map onto
  the page's REAL editor structure and hooks (read first; restyle only — the
  citation-check UI wiring is real functionality). `admin.astro`: merge both
  `isadmin` blocks into the real page's sections: stats header, gurbani-gate
  blocking card (danger-bordered) IF the real page surfaces build failures, gates/
  corpus/roles ledgers with PASS/WARN/FAIL/ACTIVE chips — every row from real data/
  API, none from the prototype's examples. Both pages `ambient="none"` per SCREENS,
  keep `noindex`.
- **acceptance criteria**: build + tests green; built HTML for both contains real
  static shells + all enumerated hook ids; no prototype example rows ("THEO 500",
  "18,204 citations") in static HTML; zero glass classes; i18n gate green (these
  pages are auth-gated tools — if their copy is currently untranslated/`data-i18n`-
  free, do not add keys gratuitously; match the page's existing i18n posture).
- **files**: `web/src/pages/studio.astro`, `web/src/pages/admin.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json` (only if keys change)
- **depends_on**: 4

---

- **id**: 18
- **title**: Certificate + Verify (credential surfaces)
- **tier**: IMPLEMENT
- **spec**: `cert.astro` per `iscert` (739–761): double-bordered certificate (1px
  navy outer, gold inner), 78px flat crest, mono small-caps institutional lines,
  Archivo name at 42px-class, the EXISTING drawn seal component (prototype's dashed
  circle is a placeholder pointing at it), conferred date + credential id in mono,
  and the exact existing non-accreditation disclaimer copy (trust law — do not
  reword). THE SURFACE STAYS FULLY SOLID — no glass, no alpha backgrounds, no
  ambient bleed-through on the render node (html2canvas law; permanent exception).
  Preserve the html2canvas/jspdf render + download hooks exactly; after restyling,
  exercise the download path once in `astro dev` and confirm a non-blank PDF/PNG
  output (note result in commit body). `verify.astro` per `isverify` (763–788):
  mono code input + Check button (real form/JS), green-bordered valid card with seal
  + mono field grid, and the "What this does and does not attest" note using the
  page's REAL existing wording (never the prototype's paraphrase if they differ).
  `autoTranslate={false}` stays on both.
- **acceptance criteria**: build + tests green; built cert HTML render-surface
  subtree contains no `glass`/alpha-bg classes and no `backdrop-filter`; built
  verify HTML contains the real attestation copy without JS; seal component
  reference present on both; download-path exercise noted in commit body; i18n gate
  green.
- **files**: `web/src/pages/cert.astro`, `web/src/pages/verify.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json` (only if keys change)
- **depends_on**: 4

---

- **id**: 19
- **title**: Integrity + Open data (trust pages)
- **tier**: IMPLEMENT
- **spec**: `integrity.astro` per `isintegrity` (1504–1520): gates 3-up ruled grid,
  status-chip legend (REVIEWED/IN REVIEW/DRAFT), "what Reviewed means" prose, "What
  this is not" bordered note — ALL using the page's real existing copy and its real
  verification numbers (the page describes the actual verify-gurbani system; keep
  every factual claim as-is). `open-data.astro` per `isopendata` (1483–1502): files
  ledger (real `/data/*.json` paths the page already documents), the "pointer, not a
  mirror" saffron note (real copy), sources ruled list, citation block in navy mono
  panel, corrections note. Both `ambient="study"`.
- **acceptance criteria**: build + tests green; built HTML for both contains their
  real headline copy + (open-data) all four real file paths without JS; no factual
  claim text changed (diff shows structure/class changes around existing strings);
  zero glass classes; i18n gate green.
- **files**: `web/src/pages/integrity.astro`, `web/src/pages/open-data.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 20
- **title**: Legal, AI policy, Feedback, 404
- **tier**: IMPLEMENT
- **spec**: `legal.astro` per `islegal` (1537–1554): numbered `.rule-navy` sections,
  the what-we-store definition rows — REAL existing legal wording only (the
  prototype's own note: "needs a lawyer, not a designer" — zero wording changes).
  `ai-policy.astro` per `isaipolicy` (1522–1535): Never / Sometimes-and-labelled
  sections + AI-ASSISTED/HUMAN-AUTHORED chip pair, real copy preserved.
  `feedback.astro` per `isfeedback` (1556–1581): category chips (real form values),
  where/what fields, "What happens next" ruled rail — the real form's
  action/ids/validation untouched. `404.astro` per `isnotfound` (790–803):
  `.hero-midnight` with mono "Error 404" eyebrow, Archivo headline, catalogue/search
  CTAs (real copy/keys). Ambients per SCREENS: legal/aipolicy/feedback `none`,
  404 `hall`.
- **acceptance criteria**: build + tests green; built HTML for all four contains
  real copy without JS (grep one headline each); legal/ai-policy diffs show no
  wording changes to policy sentences; feedback form posts unchanged
  (action/method/ids identical); zero glass classes; i18n gate green.
- **files**: `web/src/pages/legal.astro`, `web/src/pages/ai-policy.astro`,
  `web/src/pages/feedback.astro`, `web/src/pages/404.astro`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`
- **depends_on**: 4

---

- **id**: 21
- **title**: Retirement sweep — delete VCD font, purge stale refs, orphan keys, SW bump
- **tier**: MECHANIC
- **spec**: Exact operations: (1) `git rm web/public/fonts/VintageCollegeDept.ttf`;
  remove its `@font-face` block (lines ~143–153) from `web/public/fonts/fonts.css`
  and the demo-license sentence referencing it; (2) run
  `grep -rn "Vintage College Dept\|VintageCollegeDept\|'Bevan'" web/src web/public DESIGN.md`
  — every remaining hit must be either deleted (dead reference) or already a
  historical note in DESIGN.md's retired-font line; zero live CSS/markup references
  may remain; (3) run `node scripts/i18n-extract.mjs` and delete every ORPHAN key it
  warns about from all 8 dictionaries (orphans only — never touch a used key);
  (4) bump `web/public/sw.js` line 3 `su-web-v25` → `su-web-v26` (do not touch
  `PACKS_CACHE`); (5) `grep -rn "bgImage=" web/src/pages` — confirm only pages a
  prior task deliberately kept (expected: none; if hits remain on redesigned pages,
  remove the prop per their task specs); (6) `grep -rn "glass\b\|glass-card\|glass-strong\|glass-lite" web/src/pages web/src/components`
  — expected hits: zero in pages; components only where a task's spec kept them
  (Nav's `.su-nav` is a class of its own and does not count). Record the final hit
  list in the commit body.
- **acceptance criteria**: `cd web && npm run build` green; root `npm test` green;
  the VCD ttf is gone from git; grep (2) returns only the DESIGN.md historical
  line; `node scripts/i18n-extract.mjs` reports 0 missing AND 0 orphans; sw.js
  shows `su-web-v26`.
- **files**: `web/public/fonts/VintageCollegeDept.ttf` (DELETED),
  `web/public/fonts/fonts.css`, `web/public/sw.js`,
  `web/public/assets/i18n/{ar,de,es,fr,hi,pa,ur,zh}.json`, `DESIGN.md` (only if a
  stale ref needs the historical note)
- **depends_on**: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20

---

- **id**: 22
- **title**: End-to-end verification pass (whole-platform gates + no-JS matrix)
- **tier**: IMPLEMENT
- **spec**: From a clean tree: `cd web && npm run build` (capture full gate output);
  root `npm test`. Then the no-JS matrix: for each of the 33 designable routes, grep
  the built HTML under `web/dist/` for that page's task-named content strings —
  script this as a throwaway shell loop and paste the pass table into the task
  report (do NOT commit a report file). Token purity: `grep -rnE '#[0-9a-fA-F]{6}'
  web/src/pages | grep -v` the sanctioned page-local constants (programs/paths
  tints) — anything else is a defect to fix here. Blur budget:
  `grep -rn "backdrop-filter" web/src web/public/fonts` must show only the
  `.su-nav`/glass-class definitions in global.css. Spot-check RTL: `astro dev`,
  switch lang to `ur`, load home + catalog, confirm no layout explosion (note
  result). Fix any defect found (small diffs allowed in any file this plan touches);
  anything non-trivial goes back to the owning task's executor via the orchestrator.
- **acceptance criteria**: all 9 build gates + vitest green from clean; the 33-route
  grep matrix all-pass; token-purity and blur-budget greps clean; RTL spot-check
  noted; working tree committed (fix-up commit) or clean.
- **files**: any file previously touched by tasks 1–21 (fix-ups only)
- **depends_on**: 21

---

- **id**: 23
- **title**: Open the PR on GitHub upstream
- **tier**: MECHANIC
- **spec**: `git push upstream claude/full-multiscreen-redesign` then
  `gh pr create --repo jsdosanj/sikh-university --base <default branch — check with
  gh repo view> --head claude/full-multiscreen-redesign --title "Platform-wide
  redesign: Archivo registrar's-ledger system" --body <summary>`. Body must include:
  the design-source note (prototype export, gitignored), the three token
  changes (midnight, danger, danger-soft), the VCD demo-license retirement, the
  CinematicHero unmount (reversible, Decision 7), the radius change, the i18n
  "machine-assisted translations pending native review" note, the two data issues
  flagged-not-fixed (programs credits==count; M.A.S.S./Giani 558-vs-"534"
  description), and the gate/test results from task 22. No merge — PR only.
- **acceptance criteria**: PR exists on jsdosanj/sikh-university from
  `claude/full-multiscreen-redesign`; CI (if any) triggered; PR body contains every
  listed disclosure.
- **files**: — (no repo file changes)
- **depends_on**: 22

# Session notes — cinematic homepage hero + collegiate branding (2026-08-06/07)

Branch: `claude/cinematic-homepage` → PR [#215](https://github.com/jsdosanj/sikh-university/pull/215) (open, not merged).

## What shipped

- **Cinematic scroll-scrubbed hero** (`web/src/components/CinematicHero.astro`): a
  canvas-based, frame-sequence film that scrubs with scroll (213 frames @ 24fps),
  with a crest + wordmark reveal beat, before handing off into the existing
  homepage content (Daily Shabad, stat counters, CTAs — all unchanged, just
  demoted from the very top).
- **Collegiate crest branding**: nav/footer logo swapped from the old text
  wordmark to real crest + wordmark images; a "Vintage College Dept" display
  font applied to hero/section headings and English nav links (scoped, not
  site-wide — see fixes below).
- **3D crest model** in the hero's right column via `<model-viewer>`, replacing
  the old static SVG logo.
- **Homepage section backgrounds**: Mission / "First of its kind" / "Built for
  the future" each got a scoped oil-painting treatment.
- Site-wide diamond-lattice pattern overlay removed per request.
- i18n: `home.hero.scroll` key added to all 8 non-English dictionaries.
- `sw.js` cache version bumped.

## Audit + fixes (before opening the PR)

An Opus-driven review of the full diff — verified by actually running the
build, not just reading code — found **2 blockers, 5 majors, 2 minors**. All
fixed in commit `7dd8305`:

1. Nav glass treatment was leaking site-wide (nav nearly invisible on every
   light-theme page) → scoped to the homepage only (`body.su-home`).
2. Hero had no fallback if frames fail to load → fails closed (stage
   collapses, content shows immediately) instead of a permanent black screen.
3. `sw.js`'s per-version cache purge was deleting every learner's offline
   course pack on each deploy → packs now live in their own never-bumped
   cache (`PACKS_CACHE`).
4. CSP had no `worker-src` directive → added `'self' blob:` for
   model-viewer's Draco/KTX2 decoder workers.
5. Hero retained all 213 decoded frame bitmaps for the page's lifetime →
   now evicts frames outside the preload window.
6. New crest/wordmark PNGs were 2.58MB combined, uncompressed → resized to
   display resolution + pngquant'd → 347KB combined (87% smaller).
7. Nav-link collegiate font (Latin-only) was breaking non-Latin i18n labels →
   scoped with `:lang(en)`.
8. Dead `Logo` import removed from `index.astro`.

**Kept, flagged for reviewers rather than reverted**: `catalog.astro`'s
guided-journeys/explore-by-subject accordion is now expanded by default —
the audit called this scope creep (unrelated to the branding/hero work), but
it was a separate, explicit request in this same session.

## 3D model compression (commit `51a05fd`)

The source GLB export was 35.34MB (2048px JPEG textures, 684K uncompressed
triangles) — too big to ship without a CDN. Ran it through `gltf-transform
optimize` (Draco geometry compression, 1024px WebP textures, near-lossless
simplify at 0.0001 error tolerance): **35.34MB → 2.79MB (92% smaller)**,
684K → 412K triangles (~40% reduction, visually negligible at the size this
renders on a webpage).

Small enough to commit directly rather than wait on R2: moved to
`web/public/assets/sikh-uni-3d-model.glb` (normal static asset, ships with
every build) instead of the R2-only `/media/media/hero/...` route. The 3D
model now renders on deploy with **no R2 dependency**.

## What's still left

- **Hero frame sequence (61MB, 213 JPEGs) is NOT uploaded to R2 yet**, and
  unlike the 3D model, it's too large to commit to git or ship as a normal
  static build asset. Until it's uploaded to the `sikh-university-media` R2
  bucket under `media/hero/`, the film's frame-1 `onerror` fallback fires
  and the page just skips straight to the normal homepage content — site
  stays fully functional, just without the film.
- Staged, gitignored, ready to upload: `r2-upload-staging/hero/` (75MB
  total — `frames/` at 61MB is the bulk of it). Also present but **not
  currently referenced by any code**: `crest-3d-animated.webm` (10.5MB) and
  its `.webp` still — worth confirming these are genuinely dead before the
  next pass, or removing them from staging.
- PR #215 is open against `master`, not merged. Recommended before merge:
  a manual click-through in a real browser on a deployed preview (this
  repo's standing practice — green build/tests haven't caught every real
  bug this session, e.g. the CSP gap and the nav-contrast regression were
  both invisible to the build).
- Once R2 upload happens: re-verify the hero renders (not just that the
  fallback works), and re-check the `worker-src blob:` CSP addition against
  the real deployed model-viewer/Draco worker in a real browser — the audit
  flagged this as a *potential* runtime issue, not something verified live.

# Baal Updesh audio extraction — owner runbook

Cuts individual Gurmukhi letter/matra/muharni/number recitation clips out of the source
playlist and produces the files the Baal Updesh page's audio player reads:
`web/public/assets/audio/akhar/{letters,navin,matras,muharni,numbers}/<slug>.mp3` plus
`web/public/assets/audio/akhar/manifest.json`.

**This runs on your own machine, not in CI or the cloud dev environment** — this repo's
cloud sessions have no network access to YouTube. The whole pipeline is local: download once,
listen and fill in timestamps, cut, regenerate the manifest, commit the results.

## Prerequisites

- **Python 3** (3.9+, stdlib only — no pip installs needed for this script itself)
- **yt-dlp** ≥ 2023.11
  - macOS: `brew install yt-dlp`
  - Linux: `pipx install yt-dlp` (or `python3 -m pip install --user yt-dlp`)
  - Windows: `winget install yt-dlp.yt-dlp`
- **ffmpeg** ≥ 5.0 (yt-dlp uses it for extraction; the `cut` step uses it directly)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg` (or your distro's package manager)
  - Windows: `winget install Gyan.FFmpeg`

Run `yt-dlp --version` and `ffmpeg -version` to confirm both are on your `PATH` before starting.

## Source

Playlist: <https://youtube.com/playlist?list=PLtSa45TBwsnXpmcvmfpwcLkZtsZeV-uVM>
Recitations by **Bhagat Jaswant Singh Ji Daudar (Gursevak)**, used with his permission for
Sikhi University. Do not use this pipeline against any other creator's videos without the
same kind of written permission — see `docs/CONTENT-AND-LICENSING.md`.

## The 5-step flow

### 1. Download the playlist audio

```
python3 scripts/extract_akhar_audio.py download
```

Pulls every video in the playlist as mp3 (64k) into `./akhar-work/`, named `<video-id>.mp3`
(`--restrict-filenames`). This is a scratch directory — don't commit it (add `akhar-work/` to
your local/global gitignore if it isn't already covered).

### 2. Listen and fill in `scripts/akhar-timestamps.csv`

The CSV is a committed template with one row per expected clip (103 rows: 35 painti letters,
6 navin letters, 10 matras, 32 muharni rows, 20 numbers). `category`, `slug`, and
`label_gurmukhi` are already filled in — leave those alone. For each clip you have located in
the source video(s), fill in:

- `source_video` — the YouTube video ID (the `<video-id>` from the downloaded `<video-id>.mp3`
  filename, e.g. `dQw4w9WgXcQ`)
- `start` / `end` — the clip boundaries within that video, as `mm:ss.s` or `hh:mm:ss.s`
  (e.g. `4:12.3` or `1:04:12.3`)

You don't have to fill every row in one sitting. Leave `source_video`/`start`/`end` blank on
rows you haven't reached yet — the pipeline is designed for partial coverage (see "Partial
coverage is fine" below). Fill all three columns for a row, or leave all three blank; a row
with only one or two of them filled will fail validation.

### 3. Validate the CSV (offline, no network)

```
python3 scripts/extract_akhar_audio.py check
```

Checks the CSV schema, slug uniqueness per category, and that any filled-in timestamps are
well-formed and ordered (`end` after `start`) — entirely offline, no yt-dlp/ffmpeg required.
Prints a coverage report (e.g. `letters  12/35  filled`) and exits 0 as long as the rows that
*are* filled in are well-formed; it only exits non-zero on malformed rows (bad category, bad
slug, bad/partial timestamps). Run this after every editing session on the CSV.

### 4. Cut the clips

```
python3 scripts/extract_akhar_audio.py cut
```

For every CSV row with `source_video`/`start`/`end` filled in, cuts that segment from
`akhar-work/<source_video>.mp3` with ffmpeg — mono, 48kbps mp3, one-pass loudness
normalization (`loudnorm=I=-18:TP=-2`) so clips recorded at different times/volumes sound
consistent — and writes it to `web/public/assets/audio/akhar/<category>/<slug>.mp3`.

Idempotent: existing output files are skipped so re-running `cut` after adding more rows only
cuts the new ones. Pass `--force` to re-cut everything (e.g. after changing timestamps for a
row you already cut).

### 5. Regenerate the manifest

```
python3 scripts/extract_akhar_audio.py manifest
```

Scans `web/public/assets/audio/akhar/{letters,navin,matras,muharni,numbers}/` for whatever
`.mp3` files actually exist on disk (not the CSV — the manifest reflects reality) and writes
`web/public/assets/audio/akhar/manifest.json`:

```json
{
  "letters": { "ura": "letters/ura.mp3", "aira": "letters/aira.mp3", ... },
  "navin": { ... },
  "matras": { ... },
  "muharni": { ... },
  "numbers": { ... },
  "attribution": "Audio: Bhagat Jaswant Singh Ji Daudar (Gursevak) — used with permission"
}
```

Prints a per-category coverage summary against the CSV's expected slugs.

**Keep the `attribution` string intact.** It's how the site credits the reciter; the site's
audio player (built separately) is expected to surface it. Don't overwrite it with something
else if you hand-edit the manifest.

### Commit

Commit the new/changed files under `web/public/assets/audio/akhar/` (the `.mp3` clips and
`manifest.json`) and your updated `scripts/akhar-timestamps.csv`. Don't commit `akhar-work/`.

## How slugs map to the Baal Updesh UI

Slugs are derived from the letter/matra/number names used in
`web/src/pages/baal-updesh.astro`:

- **letters** — the 35 painti, e.g. `ura` (ੳ), `aira` (ਅ), `kakka` (ਕ) ... `rrarra` (ੜ).
  Two name collisions in the source data (ਡ/ਦ are both named "Dadda"; ਢ/ਧ are both named
  "Dhadha") are disambiguated as `dadda`/`dadda-2` and `dhadha`/`dhadha-2` — check the
  `label_gurmukhi` column to see which Gurmukhi letter each row is.
- **navin** — the 6 extra letters, e.g. `shasha` (ਸ਼), `khhakha` (ਖ਼) ... `llalla` (ਲ਼).
- **matras** — the 10 vowel signs, e.g. `mukta` (ਮੁਕਤਾ), `kanna` (ਕੰਨਾ) ... `kanaura` (ਕਨੌੜਾ).
- **muharni** — one row per consonant (32 rows), keyed by the *same* slug as its `letters`
  entry (e.g. `sassa` is both the ਸ letter clip and the full ਸ/ਸਾ/ਸਿ/ਸੀ/.../ਸੌ row clip).
  A muharni clip is the consonant recited through all ten matras in sequence.
- **numbers** — `n0`..`n10` for 0–10 individually, then `n20`, `n30`, ... `n100` for the
  decades. (Numbers 11–99 outside the decades aren't split into individual clips — segmenting
  every one of 0–100 individually wasn't practical from the source recordings.)

The manifest's keys are exactly these slugs; the UI task consuming `manifest.json` looks up
`manifest[category][slug]` to find a clip's path, or has none if it's missing.

## Attribution & licensing

These recordings are **used with permission** from Bhagat Jaswant Singh Ji Daudar (Gursevak) —
they are not our own recordings and not openly licensed; do not redistribute the cut clips
outside this platform or strip the attribution. See `docs/CONTENT-AND-LICENSING.md` for the
platform's general content-rights rules.

## Partial coverage is fine — the site degrades gracefully

You do not need to finish all 103 clips before shipping. The Baal Updesh page is built to
show "audio coming soon" (or similar) for any letter/matra/muharni-row/number whose slug isn't
in `manifest.json`. Run `cut` + `manifest` after each session of filling in timestamps and
commit whatever's ready — partial coverage is shippable, and the manifest only ever lists
clips that actually exist on disk.

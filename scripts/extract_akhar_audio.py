#!/usr/bin/env python3
"""Local extraction pipeline for Baal Updesh per-letter audio clips.

Cuts individual akhar/navin/matra/muharni/number recitation clips out of the
YouTube playlist recorded by Bhagat Jaswant Singh Ji Daudar (Gursevak, used
with permission — see scripts/extract-akhar-audio.md) and writes them to
web/public/assets/audio/akhar/<category>/<slug>.mp3, plus a manifest.json the
site reads at runtime. This machine has no network access to YouTube, so this
script is meant to be run on the site owner's own machine; see
scripts/extract-akhar-audio.md for the full runbook.

Requires (on PATH, not vendored): yt-dlp >= 2023.11, ffmpeg >= 5.0.
Everything else is Python 3 stdlib.

Subcommands:
  check     - validate scripts/akhar-timestamps.csv offline (no network, no ffmpeg/yt-dlp needed)
  download  - yt-dlp the playlist audio into ./akhar-work/
  cut       - ffmpeg-cut each filled CSV row into web/public/assets/audio/akhar/<category>/<slug>.mp3
  manifest  - rebuild web/public/assets/audio/akhar/manifest.json from files present on disk

Usage:
  python3 scripts/extract_akhar_audio.py check
  python3 scripts/extract_akhar_audio.py download
  python3 scripts/extract_akhar_audio.py cut [--force]
  python3 scripts/extract_akhar_audio.py manifest
"""
import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "scripts/akhar-timestamps.csv")
WORK_DIR = os.path.join(ROOT, "akhar-work")
OUT_DIR = os.path.join(ROOT, "web/public/assets/audio/akhar")
MANIFEST_PATH = os.path.join(OUT_DIR, "manifest.json")

PLAYLIST_URL = "https://youtube.com/playlist?list=PLtSa45TBwsnXpmcvmfpwcLkZtsZeV-uVM"
ATTRIBUTION = "Audio: Bhagat Jaswant Singh Ji Daudar (Gursevak) — used with permission"

CATEGORIES = ("letters", "navin", "matras", "muharni", "numbers")
CSV_FIELDS = ["category", "slug", "label_gurmukhi", "source_video", "start", "end"]
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
# mm:ss.s or hh:mm:ss.s
TS_RE = re.compile(r"^(?:(\d{1,2}):)?([0-5]?\d):([0-5]?\d(?:\.\d+)?)$")

YT_DLP_HINT = (
    "yt-dlp not found on PATH.\n"
    "  macOS:   brew install yt-dlp\n"
    "  Linux:   pipx install yt-dlp   (or: python3 -m pip install --user yt-dlp)\n"
    "  Windows: winget install yt-dlp.yt-dlp\n"
    "See scripts/extract-akhar-audio.md for details."
)
FFMPEG_HINT = (
    "ffmpeg not found on PATH.\n"
    "  macOS:   brew install ffmpeg\n"
    "  Linux:   sudo apt install ffmpeg   (or your distro's package manager)\n"
    "  Windows: winget install Gyan.FFmpeg\n"
    "See scripts/extract-akhar-audio.md for details."
)


def ts_to_seconds(ts):
    m = TS_RE.match(ts)
    if not m:
        return None
    h = int(m.group(1)) if m.group(1) else 0
    mm = int(m.group(2))
    ss = float(m.group(3))
    return h * 3600 + mm * 60 + ss


def load_rows(csv_path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in CSV_FIELDS if c not in (reader.fieldnames or [])]
        if missing:
            print(f"FAILED: {csv_path} is missing column(s): {', '.join(missing)}", file=sys.stderr)
            sys.exit(1)
        return list(reader)


def validate_rows(rows):
    """Returns (errors, filled_count, per_category_totals, per_category_filled)."""
    errors = []
    seen_slugs = {c: set() for c in CATEGORIES}
    totals = {c: 0 for c in CATEGORIES}
    filled = {c: 0 for c in CATEGORIES}

    for i, row in enumerate(rows, start=2):  # +1 header, +1 to be 1-indexed
        cat = (row.get("category") or "").strip()
        slug = (row.get("slug") or "").strip()
        label = (row.get("label_gurmukhi") or "").strip()
        src = (row.get("source_video") or "").strip()
        start = (row.get("start") or "").strip()
        end = (row.get("end") or "").strip()

        if cat not in CATEGORIES:
            errors.append(f"row {i}: invalid category '{cat}' (expected one of {CATEGORIES})")
            continue
        totals[cat] += 1

        if not SLUG_RE.match(slug):
            errors.append(f"row {i}: invalid slug '{slug}' (lowercase alnum + hyphens only)")
        elif slug in seen_slugs[cat]:
            errors.append(f"row {i}: duplicate slug '{slug}' in category '{cat}'")
        else:
            seen_slugs[cat].add(slug)

        if not label:
            errors.append(f"row {i}: missing label_gurmukhi")

        network_fields = [src, start, end]
        n_filled = sum(1 for v in network_fields if v)
        if n_filled == 0:
            continue
        if n_filled != 3:
            errors.append(f"row {i}: partially filled (need all of source_video/start/end, or none)")
            continue

        s_sec = ts_to_seconds(start)
        e_sec = ts_to_seconds(end)
        if s_sec is None:
            errors.append(f"row {i}: malformed start '{start}' (expected mm:ss.s or hh:mm:ss.s)")
        if e_sec is None:
            errors.append(f"row {i}: malformed end '{end}' (expected mm:ss.s or hh:mm:ss.s)")
        if s_sec is not None and e_sec is not None and e_sec <= s_sec:
            errors.append(f"row {i}: end ({end}) is not after start ({start})")
        if s_sec is not None and e_sec is not None:
            filled[cat] += 1

    return errors, totals, filled


def cmd_check(args):
    rows = load_rows(args.csv)
    errors, totals, filled = validate_rows(rows)

    total_all = sum(totals.values())
    filled_all = sum(filled.values())
    print(f"{args.csv}: {total_all} rows")
    for cat in CATEGORIES:
        print(f"  {cat:8} {filled[cat]:3}/{totals[cat]:<3} filled")
    print(f"  {'TOTAL':8} {filled_all:3}/{total_all:<3} filled")

    if errors:
        print(f"\nFAILED — {len(errors)} malformed row(s):", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)

    print("\nCSV OK (schema and timestamps valid; coverage reported above).")


def cmd_download(args):
    if shutil.which("yt-dlp") is None:
        print(YT_DLP_HINT, file=sys.stderr)
        sys.exit(1)
    if shutil.which("ffmpeg") is None:
        print(FFMPEG_HINT, file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.work_dir, exist_ok=True)
    cmd = [
        "yt-dlp",
        "--restrict-filenames",
        "-f", "bestaudio/best",
        "-x", "--audio-format", "mp3", "--audio-quality", "64K",
        "-o", os.path.join(args.work_dir, "%(id)s.%(ext)s"),
        PLAYLIST_URL,
    ]
    print(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"FAILED: yt-dlp exited {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)
    print(f"Downloaded audio into {args.work_dir}/")


def cmd_cut(args):
    if shutil.which("ffmpeg") is None:
        print(FFMPEG_HINT, file=sys.stderr)
        sys.exit(1)

    rows = load_rows(args.csv)
    errors, _totals, _filled = validate_rows(rows)
    if errors:
        print("FAILED: CSV has malformed rows — run 'check' first.", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)

    n_cut, n_skip, n_fail = 0, 0, 0
    for row in rows:
        cat, slug = row["category"].strip(), row["slug"].strip()
        src_id, start, end = row["source_video"].strip(), row["start"].strip(), row["end"].strip()
        if not (src_id and start and end):
            continue  # not yet timestamped — expected, not an error

        src_path = os.path.join(args.work_dir, f"{src_id}.mp3")
        if not os.path.isfile(src_path):
            print(f"SKIP {cat}/{slug}: source '{src_id}.mp3' not found in {args.work_dir}/ "
                  f"(run 'download' first, or check the source_video id)", file=sys.stderr)
            n_fail += 1
            continue

        out_dir = os.path.join(args.out_dir, cat)
        out_path = os.path.join(out_dir, f"{slug}.mp3")
        if os.path.exists(out_path) and not args.force:
            n_skip += 1
            continue

        os.makedirs(out_dir, exist_ok=True)
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", start, "-to", end, "-i", src_path,
            "-ac", "1", "-b:a", "48k", "-af", "loudnorm=I=-18:TP=-2",
            out_path,
        ]
        result = subprocess.run(cmd)
        if result.returncode != 0:
            print(f"FAILED {cat}/{slug}: ffmpeg exited {result.returncode}", file=sys.stderr)
            n_fail += 1
            continue
        print(f"cut {cat}/{slug}.mp3  [{start} - {end}]")
        n_cut += 1

    print(f"\n{n_cut} cut, {n_skip} skipped (already exist), {n_fail} failed")
    if n_fail:
        sys.exit(1)


def cmd_manifest(args):
    rows = load_rows(args.csv)
    expected = {c: set() for c in CATEGORIES}
    for row in rows:
        cat = row["category"].strip()
        if cat in CATEGORIES:
            expected[cat].add(row["slug"].strip())

    manifest = {}
    for cat in CATEGORIES:
        cat_dir = os.path.join(args.out_dir, cat)
        clips = {}
        if os.path.isdir(cat_dir):
            for name in sorted(os.listdir(cat_dir)):
                if name.endswith(".mp3"):
                    slug = name[:-4]
                    clips[slug] = f"{cat}/{name}"
        manifest[cat] = clips
    manifest["attribution"] = ATTRIBUTION

    os.makedirs(args.out_dir, exist_ok=True)
    with open(args.manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    print(f"wrote {args.manifest}")
    total_present = sum(len(manifest[c]) for c in CATEGORIES)
    total_expected = sum(len(expected[c]) for c in CATEGORIES)
    for cat in CATEGORIES:
        print(f"  {cat:8} {len(manifest[cat]):3}/{len(expected[cat]):<3} clips present")
    print(f"  {'TOTAL':8} {total_present:3}/{total_expected:<3} clips present")


def main():
    parser = argparse.ArgumentParser(
        description="Extract Baal Updesh per-letter audio clips from the Gursevak playlist. "
                    "See scripts/extract-akhar-audio.md for the full runbook.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check", help="validate the CSV offline (no network required)")
    p_check.set_defaults(func=cmd_check, csv=CSV_PATH)

    p_dl = sub.add_parser("download", help="yt-dlp the playlist audio into ./akhar-work/")
    p_dl.set_defaults(func=cmd_download, work_dir=WORK_DIR)

    p_cut = sub.add_parser("cut", help="ffmpeg-cut clips per the CSV into web/public/assets/audio/akhar/")
    p_cut.add_argument("--force", action="store_true", help="re-cut clips that already exist")
    p_cut.set_defaults(func=cmd_cut, csv=CSV_PATH, work_dir=WORK_DIR, out_dir=OUT_DIR)

    p_man = sub.add_parser("manifest", help="rebuild manifest.json from clips present on disk")
    p_man.set_defaults(func=cmd_manifest, csv=CSV_PATH, out_dir=OUT_DIR, manifest=MANIFEST_PATH)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

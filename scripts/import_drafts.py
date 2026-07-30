#!/usr/bin/env python3
"""Import admin-approved course drafts from the studio into the catalogue.

Called by .github/workflows/import-drafts.yml (workflow_dispatch). Fetches
approved drafts via /api/admin/drafts-export (Bearer EXPORT_TOKEN), merges
them into site/assets/data/courses.json, and prints a PR-summary table.
Publishing is a git PR, never a runtime mutation — this script only ever
touches the git-tracked catalogue file; the existing CI gates (validate.py,
build_quiz_keys.py parity, build_public_data.py answer-strip) re-check the
merged output exactly like any other catalogue change.
"""
import json, os, sys, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "site/assets/data/courses.json"
API_BASE = os.environ.get("SIKHIUNI_API_BASE", "https://sikhiuni.com")
EXPORT_TOKEN = os.environ.get("EXPORT_TOKEN")


def fetch_approved():
    if not EXPORT_TOKEN:
        print("::error::EXPORT_TOKEN is not set", file=sys.stderr)
        sys.exit(1)
    drafts = []
    offset, limit = 0, 50
    while True:
        url = f"{API_BASE}/api/admin/drafts-export?status=approved&limit={limit}&offset={offset}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {EXPORT_TOKEN}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        drafts.extend(data["courses"])
        if len(data["courses"]) < limit:
            break
        offset += limit
    return drafts


def main():
    approved = fetch_approved()
    if not approved:
        print("No approved drafts to import.")
        return

    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    existing_ids = {c["id"] for c in catalogue["courses"]}
    summary_rows = []
    imported = 0

    for draft in approved:
        course_id = draft["id"]
        base_course_id = draft.pop("_baseCourseId", None)
        draft_id = draft.pop("_draftId", None)
        author_id = draft.pop("_authorId", None)
        author_email = draft.pop("_authorEmail", None)
        reviewed_by = draft.pop("_reviewedBy", None)

        if base_course_id and base_course_id in existing_ids:
            # Editing an existing catalogue course: replace it in place.
            catalogue["courses"] = [draft if c["id"] == base_course_id else c for c in catalogue["courses"]]
        elif course_id in existing_ids:
            print(f"::warning::skipping draft {draft_id} — id '{course_id}' already exists in the "
                  f"catalogue and is not the course this draft is editing (id collision)")
            continue
        else:
            catalogue["courses"].append(draft)
            existing_ids.add(course_id)

        imported += 1
        summary_rows.append({
            "draft_id": draft_id, "course_id": course_id, "author": author_email or author_id,
            "reviewer": reviewed_by or "-", "topic": draft["topic"],
            "ai": "yes" if draft.get("aiCreated") else "no",
        })

    if not imported:
        print("No drafts were actually imported (all skipped as id collisions).")
        return

    CATALOGUE.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    table = ["| draft id | course id | author | reviewer | topic | AI |", "|---|---|---|---|---|---|"]
    for r in summary_rows:
        table.append(f"| {r['draft_id']} | {r['course_id']} | {r['author']} | {r['reviewer']} | {r['topic']} | {r['ai']} |")
    print(f"Imported {imported} draft(s):")
    print("\n".join(table))

    gh_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if gh_summary:
        with open(gh_summary, "a", encoding="utf-8") as f:
            f.write("## Imported drafts\n\n" + "\n".join(table) + "\n")


if __name__ == "__main__":
    main()

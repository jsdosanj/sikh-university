#!/usr/bin/env python3
"""Python mirror of functions/api/_draft-validate.js's validateDraft().

This exists solely for scripts/check_draft_validator_parity.py, which runs the
same fixtures (test/fixtures/draft-validation/*.json) through both this and
the JS validator and fails CI if their verdicts ever diverge. It is not used
by the live Worker — the JS version is the one authoring studio actually
runs. There is no code generation between the two, so a rule change in
_draft-validate.js must be mirrored here by hand or the parity check will
(correctly) start failing.
"""
import json


def validate_draft(draft, lessons, quiz, topic_ids=None):
    errors = []

    if not draft.get("course_id"):
        errors.append("missing course id")
    if not draft.get("title") or not draft["title"].strip():
        errors.append("missing title")
    topic = draft.get("topic")
    if not topic:
        errors.append("missing topic")
    elif topic_ids is not None and topic not in topic_ids:
        errors.append(f"unknown topic '{topic}'")

    level = draft.get("level")
    is_integer = isinstance(level, int) and not isinstance(level, bool)
    if not is_integer or level < 100 or level % 100 != 0:
        errors.append("level must be a hundred-level integer (100, 200, 300, ...)")

    meta = {}
    raw_meta = draft.get("meta")
    try:
        meta = json.loads(raw_meta) if raw_meta else {}
    except (json.JSONDecodeError, TypeError):
        errors.append("meta is not valid JSON")
    summary = meta.get("summary") if isinstance(meta, dict) else None
    if not summary or not summary.strip():
        errors.append("missing summary")
    elif len(summary.strip()) < 40:
        errors.append("summary is too short (studio minimum: 40 characters)")

    if not lessons or len(lessons) < 3:
        errors.append("a course needs at least 3 lessons (studio minimum)")
    for i, ls in enumerate(lessons or []):
        if not ls.get("title") or not ls["title"].strip():
            errors.append(f"lesson {i + 1}: missing title")
        html = ls.get("html")
        if not html or not html.strip():
            errors.append(f"lesson {i + 1}: missing content")
        elif "<script" in html.lower():
            errors.append(
                f"lesson {i + 1}: content still contains a <script> tag — "
                "this should be impossible after sanitization"
            )

    for i, q in enumerate(quiz or []):
        raw_options = q.get("options")
        if isinstance(raw_options, list):
            options, options_is_array = raw_options, True
        else:
            try:
                parsed = json.loads(raw_options) if raw_options else []
            except (json.JSONDecodeError, TypeError):
                parsed = None
            options, options_is_array = (parsed, True) if isinstance(parsed, list) else (None, False)

        if not options_is_array or len(options) < 2:
            errors.append(f"quiz {i + 1}: needs at least 2 options")

        answer = q.get("answer")
        answer_is_integer = isinstance(answer, int) and not isinstance(answer, bool)
        below_zero = answer_is_integer and answer < 0
        out_of_range = options_is_array and answer_is_integer and answer >= len(options)
        if not answer_is_integer or below_zero or out_of_range:
            errors.append(f"quiz {i + 1}: answer index out of range")

        if not q.get("q") or not q["q"].strip():
            errors.append(f"quiz {i + 1}: missing question text")

    return errors

# Open data license (E3)

Sikh University publishes two things as an openly-licensed, machine-readable dataset:
the **course catalogue metadata** and the **Gurbani-verification report**. This document
is the license and terms for that dataset. It does not change the license of the site's
lesson prose, quizzes, or any other content — see `docs/CONTENT-AND-LICENSING.md` for that.

Human-readable page: `/open-data`. Files: `/data/index.json`, `/data/search.json`,
`/data/verification.json`, `/data/dataset.json` (the manifest).

## What is covered

- **Catalogue metadata** — course titles, topics, levels, professors, summaries, learning
  outcomes, and lesson titles (`/data/index.json`, `/data/search.json`).
- **The verification report** — per-course counts of quoted Gurbani checked against the
  canonical snapshot (verified / mismatch / uncovered), plus totals (`/data/verification.json`).
- **The dataset manifest** — license, sources, and stats (`/data/dataset.json`).

## What is NOT covered — canonical scripture is never rehosted

**No Gurbani text is redistributed in this dataset.** The canonical text of Sri Guru Granth
Sahib Ji lives at [BaniDB](https://www.banidb.com); the verification report cites it by ang
and counts matches — it does not copy the text out. Anyone who needs the scripture text
itself should go to BaniDB directly. This dataset is a **pointer**, not a mirror.

Lesson prose, quiz content, and any full course text are also excluded — only the
structural metadata and the verification counts described above are published here.

## License

The catalogue metadata and verification report are licensed under
**[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**.

You are free to:
- **Share** — copy and redistribute the material in any medium or format.
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially.

Under the following term:
- **Attribution** — give appropriate credit, link to the license, and indicate if changes
  were made. See the suggested citation below.

## How to attribute

Suggested citation:

> Sikh University. "Open dataset: course catalogue metadata and Gurbani verification
> report." https://sikh-university.dosanjhlabs.com/open-data. Licensed CC BY 4.0.

## Sources

| Source | Role |
|---|---|
| [BaniDB](https://www.banidb.com) | Canonical Sri Guru Granth Sahib Ji text — referenced by ang, not redistributed |
| [SikhLibrary (HuggingFace: `jsdosanj/SikhLibrary`)](https://huggingface.co/datasets/jsdosanj/SikhLibrary) | Source texts, commentaries, and theses behind the author-as-professor courses; owned and gated |
| [Sikh Archive](https://sikharchive.net) | Primary library and media partner |

## Corrections

Anything look wrong? Use the [feedback page](https://sikh-university.dosanjhlabs.com/feedback).

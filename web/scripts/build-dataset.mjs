// Emit a machine-readable manifest for the open-data offering (E3): course
// catalogue STRUCTURE/metadata + the Gurbani-quote verification REPORT, published
// under an open license. The canonical Sri Guru Granth Sahib Ji text itself is
// never rehosted here — BaniDB stays the pointer, not redistributed.
// Node-only (no python in the build path). Runs in `npm run build`, after
// verify-gurbani (so public/data/verification.json already exists).
import { readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://sikhiuni.com';

const src = JSON.parse(readFileSync('../site/assets/data/courses.json', 'utf-8'));
const courses = src.courses || [];
const verification = JSON.parse(readFileSync('public/data/verification.json', 'utf-8'));

const dataset = {
  name: 'Sikhi University open dataset',
  description: "Course catalogue metadata (titles, topics, levels, professors, summaries, outcomes, lesson titles) and the Gurbani-quote verification report from Sikhi University, a free and open Sikhi + modern-skills LMS. Canonical Sri Guru Granth Sahib Ji text is NOT included — it is referenced via BaniDB, never redistributed.",
  license: 'CC-BY-4.0',
  attribution: ['Sikhi University (sikhiuni.com), CC BY 4.0'],
  homepage: `${SITE}/open-data`,
  // No Date.now() — the build must stay deterministic. Only stamped when a CI commit
  // SHA is available; omitted entirely on local builds.
  ...(process.env.GITHUB_SHA ? { generated: process.env.GITHUB_SHA } : {}),
  distributions: [
    { name: 'Course catalogue index', path: '/data/index.json', format: 'application/json', description: 'Topics + per-course metadata for all courses (title, topic, level, professor, status, summary, lesson/quiz counts).' },
    { name: 'Search index', path: '/data/search.json', format: 'application/json', description: 'Published courses with search fields (terms, outcomes, lesson titles), plus topics and learning paths.' },
    { name: 'Gurbani verification report', path: '/data/verification.json', format: 'application/json', description: 'Per-course counts of quoted Gurbani checked against the canonical BaniDB snapshot (verified / mismatch / uncovered), plus totals.' },
  ],
  stats: {
    courses: courses.length,
    publishedCourses: courses.filter((c) => c.status === 'published').length,
    quotesVerified: verification.totals?.verified || 0,
    coursesSealed: verification.coursesFullyVerified || 0,
  },
  sources: [
    { name: 'BaniDB', role: 'canonical SGGS text (referenced, not redistributed)', url: 'https://www.banidb.com' },
    { name: 'SikhLibrary (HuggingFace)', role: 'source texts for author-as-professor courses (owned, gated dataset)', url: 'https://huggingface.co/datasets/jsdosanj/SikhLibrary' },
    { name: 'Sikh Archive', role: 'primary library and media partner', url: 'https://sikharchive.net' },
  ],
};

writeFileSync('public/data/dataset.json', JSON.stringify(dataset));
console.log(`build-dataset: dataset.json — ${dataset.stats.courses} courses (${dataset.stats.publishedCourses} published), ` +
  `${dataset.stats.quotesVerified} quotes verified, ${dataset.stats.coursesSealed} courses sealed.`);

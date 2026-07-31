// Emit slim client data artifacts from the 45 MB catalogue so pages don't fetch
// the monolith. Node-only (no python in the build path). Runs in `npm run build`.
//   /data/index.json  — topics + per-course metadata (all courses, no lessons/quiz).
//                        Used by dashboard, verify, cert, admin.
//   /data/search.json — published courses with search fields (terms/outcomes/lesson
//                        titles) + topics + paths. Used by search and the flashcard deck.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync('../site/assets/data/courses.json', 'utf-8'));
const all = src.courses || [];
mkdirSync('public/data', { recursive: true });

// index.json: metadata only, all courses
const index = {
  topics: src.topics || [],
  courses: all.map((c) => ({
    id: c.id, title: c.title, topic: c.topic, level: c.level,
    professor: c.professor, status: c.status, summary: c.summary,
    nLessons: (c.lessons || []).length, nQuiz: (c.quiz || []).length,
    ...(c.gated ? { gated: true } : {}),
  })),
};
const indexOut = JSON.stringify(index);
writeFileSync('public/data/index.json', indexOut);

// search.json: published courses with search fields
const search = {
  topics: src.topics || [],
  paths: src.paths || [],
  courses: all.filter((c) => c.status === 'published').map((c) => ({
    id: c.id, title: c.title, professor: c.professor, topic: c.topic,
    summary: c.summary, terms: c.terms || [], outcomes: c.outcomes || [],
    lessonTitles: (c.lessons || []).map((l) => l.title),
  })),
};
const searchOut = JSON.stringify(search);
writeFileSync('public/data/search.json', searchOut);

console.log(`build-index: index.json ${(indexOut.length / 1024) | 0} KB (${index.courses.length} courses), ` +
  `search.json ${(searchOut.length / 1024) | 0} KB (${search.courses.length} published)`);

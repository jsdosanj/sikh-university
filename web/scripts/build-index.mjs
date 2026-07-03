// Emit web/public/data/index.json — a slim catalogue index (topics + per-course
// metadata only, no lesson HTML or quiz) so pages that need only metadata don't
// fetch the 45 MB monolith. Runs in the build (node-only, no python dependency).
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync('../site/assets/data/courses.json', 'utf-8'));
const courses = (src.courses || []).map((c) => ({
  id: c.id, title: c.title, topic: c.topic, level: c.level,
  professor: c.professor, status: c.status, summary: c.summary,
  nLessons: (c.lessons || []).length, nQuiz: (c.quiz || []).length,
}));
mkdirSync('public/data', { recursive: true });
const out = JSON.stringify({ topics: src.topics || [], courses });
writeFileSync('public/data/index.json', out);
console.log(`build-index: ${courses.length} courses, ${(out.length / 1024) | 0} KB -> public/data/index.json`);

import type { APIRoute } from 'astro';
import { published, professorList, profSlug } from '../lib/data';
import { COLLECTIONS } from '../lib/santhya';
import programsData from '../../public/assets/data/programs.json';

// Generated sitemap — stays in sync with the catalogue so new courses,
// programs, collections and professors are always discoverable. Replaces the
// old hand-written file. Priority reflects how central a page is to the
// site; admin/auth/utility routes (login, dashboard, admin, verify, etc.) are
// intentionally excluded — they're not indexable content.
const LASTMOD = '2026-07-07';
const STATIC_PATHS: [string, string][] = [
  ['/', '1.0'],
  ['/catalog', '0.9'],
  ['/programs', '0.8'],
  ['/professors', '0.7'],
  ['/about', '0.7'],
  ['/integrity', '0.6'],
  ['/search', '0.5'],
  ['/santhiya', '0.7'],
  ['/muharni', '0.6'],
  ['/baal-updesh', '0.6'],
  ['/teach', '0.5'],
  ['/ai-policy', '0.3'],
  ['/legal', '0.3'],
];

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() || 'https://sikh-university.dosanjhlabs.com').replace(/\/$/, '');
  const urls: [string, string][] = [
    ...STATIC_PATHS,
    ...published.map((c) => [`/course/${c.id}`, '0.7'] as [string, string]),
    ...programsData.programs.map((p) => [`/program/${p.id}`, '0.6'] as [string, string]),
    ...Object.keys(COLLECTIONS).map((name) => [`/collection/${name}`, '0.5'] as [string, string]),
    ...professorList().map(({ name }) => [`/professor/${profSlug(name)}`, '0.5'] as [string, string]),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(([u, priority]) => `  <url><loc>${base}${u}</loc><lastmod>${LASTMOD}</lastmod><priority>${priority}</priority></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};

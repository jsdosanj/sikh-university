import type { APIRoute } from 'astro';
import { published, professorList, profSlug } from '../lib/data';

// Generated sitemap — stays in sync with the catalogue so new courses and
// professors are always discoverable. Replaces the old hand-written file.
const STATIC_PATHS = [
  '/', '/catalog', '/paths', '/professors', '/about',
  '/search', '/read', '/santhiya', '/muharni', '/baal-updesh',
  '/teach', '/legal',
];

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() || 'https://sikh-university.jasvant-dosanjh.workers.dev').replace(/\/$/, '');
  const urls = [
    ...STATIC_PATHS,
    ...published.map((c) => `/course/${c.id}`),
    ...professorList().map(({ name }) => `/professor/${profSlug(name)}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};

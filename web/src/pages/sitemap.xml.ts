import type { APIRoute } from 'astro';
import { BUILD_DATE, siteBase } from '../lib/sitemap';

// Sitemap INDEX — the single URL submitted to search engines
// (robots.txt points here). The actual URLs live in segmented child
// sitemaps under /sitemaps/, generated from the catalogue at build time so
// new courses, programs, collections and professors are always discoverable.
const CHILDREN = ['pages', 'courses', 'programs', 'professors', 'collections'];

export const GET: APIRoute = ({ site }) => {
  const base = siteBase(site);
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    CHILDREN.map(
      (name) =>
        `  <sitemap><loc>${base}/sitemaps/${name}.xml</loc><lastmod>${BUILD_DATE}</lastmod></sitemap>`,
    ).join('\n') +
    `\n</sitemapindex>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};

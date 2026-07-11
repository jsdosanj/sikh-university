// Shared helpers for the sitemap index + child sitemaps under /sitemaps/.
// The site is fully prerendered, so "last modified" is the build date — real,
// not hand-maintained (the old sitemap hardcoded a date that went stale).
export const BUILD_DATE = new Date().toISOString().slice(0, 10);

export type UrlEntry = { path: string; priority: string; lastmod?: string };

export function siteBase(site: URL | undefined): string {
  return (site?.toString() || 'https://sikhiuni.com').replace(/\/$/, '');
}

export function urlsetXml(base: string, entries: UrlEntry[]): Response {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url><loc>${base}${e.path}</loc><lastmod>${e.lastmod || BUILD_DATE}</lastmod><priority>${e.priority}</priority></url>`,
      )
      .join('\n') +
    `\n</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}

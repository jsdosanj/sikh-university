import type { APIRoute } from 'astro';
import { published } from '../../lib/data';
import { siteBase, urlsetXml } from '../../lib/sitemap';

// Every published course page, straight from the catalogue.
export const GET: APIRoute = ({ site }) =>
  urlsetXml(
    siteBase(site),
    published.map((c) => ({ path: `/course/${c.id}`, priority: '0.7' })),
  );

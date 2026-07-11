import type { APIRoute } from 'astro';
import { COLLECTIONS } from '../../lib/santhya';
import { siteBase, urlsetXml } from '../../lib/sitemap';

export const GET: APIRoute = ({ site }) =>
  urlsetXml(
    siteBase(site),
    Object.keys(COLLECTIONS).map((name) => ({ path: `/collection/${name}`, priority: '0.5' })),
  );

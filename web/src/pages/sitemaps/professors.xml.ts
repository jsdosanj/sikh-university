import type { APIRoute } from 'astro';
import { professorList, profSlug } from '../../lib/data';
import { siteBase, urlsetXml } from '../../lib/sitemap';

export const GET: APIRoute = ({ site }) =>
  urlsetXml(
    siteBase(site),
    professorList().map(({ name }) => ({ path: `/professor/${profSlug(name)}`, priority: '0.5' })),
  );

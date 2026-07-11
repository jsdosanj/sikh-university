import type { APIRoute } from 'astro';
import programsData from '../../../public/assets/data/programs.json';
import { siteBase, urlsetXml } from '../../lib/sitemap';

export const GET: APIRoute = ({ site }) =>
  urlsetXml(
    siteBase(site),
    programsData.programs.map((p: { id: string }) => ({ path: `/program/${p.id}`, priority: '0.6' })),
  );

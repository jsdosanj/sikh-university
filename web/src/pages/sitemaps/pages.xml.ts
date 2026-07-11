import type { APIRoute } from 'astro';
import { siteBase, urlsetXml } from '../../lib/sitemap';

// Static content pages. Priority reflects how central a page is to the site;
// admin/auth/utility routes (login, dashboard, admin, verify, etc.) are
// intentionally excluded — they're not indexable content.
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

export const GET: APIRoute = ({ site }) =>
  urlsetXml(siteBase(site), STATIC_PATHS.map(([path, priority]) => ({ path, priority })));

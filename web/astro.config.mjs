import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static build; the existing Cloudflare Worker serves the output and handles /api/*.
export default defineConfig({
  site: 'https://sikhiuni.com',
  outDir: './dist',
  build: { format: 'file' },
  // assetsInlineLimit 0: never inline bundled scripts into HTML. Every hoisted
  // script ships as an external file (covered by CSP script-src 'self'), so
  // build-csp only hashes the few deliberate is:inline pre-paint scripts —
  // Cloudflare rejects any _headers line over 2000 chars, and 31 inlined-script
  // hashes blew past that at deploy time.
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
});

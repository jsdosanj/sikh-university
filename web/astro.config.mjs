import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Static build; the existing Cloudflare Worker serves the output and handles /api/*.
export default defineConfig({
  site: 'https://sikh-university.jasvant-dosanjh.workers.dev',
  outDir: './dist',
  integrations: [tailwind({ applyBaseStyles: false })],
  build: { format: 'file' },
});

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static build; the existing Cloudflare Worker serves the output and handles /api/*.
export default defineConfig({
  site: 'https://sikh-university.dosanjhlabs.com',
  outDir: './dist',
  build: { format: 'file' },
  vite: { plugins: [tailwindcss()] },
});

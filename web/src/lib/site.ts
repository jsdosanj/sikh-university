// The canonical production origin — the single source of truth for absolute
// URLs baked into canonicals, JSON-LD, OG tags and sitemaps. Must match
// astro.config.mjs `site` and the wrangler.toml canonical route.
export const SITE = 'https://sikhiuni.com';

// Serialize an object for a <script type="application/ld+json"> block.
// `<` is escaped so free-text fields (lesson titles, professor bios) can never
// close the script element early (`</script>` injection) — JSON parsers treat
// < identically to a literal `<`.
export function ldJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

import { json } from "./_lib.js";

// Map our language codes to the full names Cloudflare's m2m100 model expects.
const LANG_NAMES = {
  pa: "punjabi", hi: "hindi", es: "spanish", ar: "arabic",
  fr: "french", de: "german", zh: "chinese",
};

async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// POST /api/translate { lang, texts: [..] } -> { translations: [..] }
// Machine-translates UI strings (English -> lang) via Workers AI, cached in KV so
// each unique string is only ever translated once. Used for the site chrome/pages;
// course content is intentionally NOT translated (handled English-only on the client).
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const lang = b && b.lang;
  const target = LANG_NAMES[lang];
  const texts = Array.isArray(b.texts) ? b.texts.slice(0, 40) : [];
  if (!target) return json({ error: "unsupported language" }, 400);
  // No AI binding (e.g. local dev) -> echo originals so the page still renders.
  if (!env.AI) return json({ translations: texts });

  const translations = await Promise.all(texts.map(async (raw) => {
    const text = String(raw == null ? "" : raw);
    if (!text.trim()) return text;
    const key = lang + ":" + (await sha(text));
    if (env.TRANSLATIONS) {
      try { const hit = await env.TRANSLATIONS.get(key); if (hit != null) return hit; } catch (e) {}
    }
    let out = text;
    try {
      const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text, source_lang: "english", target_lang: target });
      if (r && r.translated_text) out = r.translated_text;
    } catch (e) { /* fall back to the original on any model error */ }
    if (env.TRANSLATIONS) {
      try { await env.TRANSLATIONS.put(key, out, { expirationTtl: 60 * 60 * 24 * 180 }); } catch (e) {}
    }
    return out;
  }));

  return json({ translations });
}

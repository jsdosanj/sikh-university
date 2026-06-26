import { json } from "./_lib.js";

// Default engine: Meta m2m100 (covers all our languages).
const M2M_NAMES = {
  pa: "punjabi", hi: "hindi", es: "spanish", ar: "arabic",
  fr: "french", de: "german", zh: "chinese",
};
// Punjabi & Hindi go through AI4Bharat IndicTrans2 (much stronger for Indic
// languages). It uses FLORES-200 script codes. m2m100 is the fallback.
const INDIC = { pa: "pan_Guru", hi: "hin_Deva" };

async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Different models return the text under different fields — normalise here.
function pick(r) {
  if (!r) return null;
  if (typeof r.translated_text === "string") return r.translated_text;
  if (Array.isArray(r.translations) && r.translations.length) {
    const t = r.translations[0];
    return typeof t === "string" ? t : (t && (t.translated_text || t.text)) || null;
  }
  if (typeof r.result === "string") return r.result;
  return null;
}

async function translateOne(env, lang, text) {
  if (INDIC[lang]) {
    try {
      const r = await env.AI.run("@cf/ai4bharat/indictrans2-en-indic-1B", { text, source_lang: "eng_Latn", target_lang: INDIC[lang] });
      const out = pick(r);
      if (out) return out;
    } catch (e) { /* fall back to m2m100 below */ }
  }
  try {
    const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text, source_lang: "english", target_lang: M2M_NAMES[lang] });
    return pick(r) || text;
  } catch (e) { return text; }
}

// POST /api/translate { lang, texts: [..] } -> { translations: [..] }
// Machine-translates UI strings (English -> lang), cached in KV so each unique
// string is only translated once. Course content is NOT translated (English-only).
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: "bad request" }, 400); }
  const lang = b && b.lang;
  const texts = Array.isArray(b.texts) ? b.texts.slice(0, 40) : [];
  if (!M2M_NAMES[lang]) return json({ error: "unsupported language" }, 400);
  if (!env.AI) return json({ translations: texts }); // local dev / AI unavailable

  // IndicTrans2 results live under a distinct cache key so they don't collide
  // with any earlier m2m100 entries for the same Punjabi/Hindi string.
  const tag = INDIC[lang] ? ":i2" : "";

  const translations = await Promise.all(texts.map(async (raw) => {
    const text = String(raw == null ? "" : raw);
    if (!text.trim()) return text;
    const key = lang + tag + ":" + (await sha(text));
    if (env.TRANSLATIONS) {
      try { const hit = await env.TRANSLATIONS.get(key); if (hit != null) return hit; } catch (e) {}
    }
    const out = await translateOne(env, lang, text);
    if (env.TRANSLATIONS) {
      try { await env.TRANSLATIONS.put(key, out, { expirationTtl: 60 * 60 * 24 * 180 }); } catch (e) {}
    }
    return out;
  }));

  return json({ translations });
}

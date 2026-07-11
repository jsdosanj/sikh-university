// Shared Web Speech engine — replaces the raw SpeechSynthesisUtterance calls
// that made narration sound robotic and pitchy. No cloud TTS: this picks the
// best voice the device actually has, tunes rate/pitch per language, and
// chunks text into sentences with natural pauses.
//
// Consumers: the course "Listen to lesson" buttons (course/[id].astro) and the
// accessibility "Read this page" FAB (Base.astro).

export type SpeakOptions = {
  lang?: string;              // BCP-47-ish ('en', 'pa', 'hi', 'ur', …)
  onend?: () => void;
  onstart?: () => void;
};

const RATE_KEY = 'su_v1_tts';

// Per-language tuning. Browser defaults tend to read English too fast and
// Indic languages far too fast; a slightly sub-1 rate with neutral pitch reads
// as calm rather than synthetic.
const PRESETS: Record<string, { rate: number; pitch: number }> = {
  en: { rate: 0.95, pitch: 1.0 },
  pa: { rate: 0.88, pitch: 1.0 },
  hi: { rate: 0.9, pitch: 1.0 },
  ur: { rate: 0.9, pitch: 1.0 },
  ar: { rate: 0.92, pitch: 1.0 },
  es: { rate: 0.95, pitch: 1.0 },
  fr: { rate: 0.95, pitch: 1.0 },
  de: { rate: 0.95, pitch: 1.0 },
  zh: { rate: 0.9, pitch: 1.0 },
};

// If a language has no voice at all, fall through to a related one rather than
// letting the browser mangle it with the default (usually English) voice.
const FALLBACK_LANG: Record<string, string[]> = {
  pa: ['pa-IN', 'pa', 'hi-IN', 'hi'],
  ur: ['ur-PK', 'ur-IN', 'ur', 'hi-IN', 'ar'],
  hi: ['hi-IN', 'hi'],
  zh: ['zh-CN', 'zh-TW', 'zh'],
  en: ['en-US', 'en-GB', 'en'],
};

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

export function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Voices load asynchronously (Chrome fires `voiceschanged` late, sometimes
// never on first paint) — race the event against a timeout and cache.
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!supported()) return Promise.resolve([]);
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const have = speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 1500);
  });
  return voicesReady;
}

// Score a voice for a language: premium/neural local voices first, then vendor
// cloud voices, then exact-region matches. "Novelty" voices (Chrome exposes
// things like 'Bahh' and 'Zarvox' on macOS) rank below everything real.
function score(v: SpeechSynthesisVoice, wanted: string): number {
  let s = 0;
  const lang = v.lang.toLowerCase().replace('_', '-');
  const base = wanted.toLowerCase().split('-')[0];
  if (!lang.startsWith(base)) return -1;
  if (lang === wanted.toLowerCase()) s += 20;
  const name = v.name.toLowerCase();
  if (/(natural|neural|enhanced|premium|wavenet|online)/.test(name)) s += 40;
  if (/(google|microsoft|apple|siri)/.test(name)) s += 30;
  if (v.localService) s += 8;
  if (v.default) s += 5;
  if (/(bahh|zarvox|trinoids|albert|jester|organ|cellos|bells|boing|bubbles|whisper|wobble|bad news|good news)/.test(name)) s -= 60;
  return s;
}

export async function pickVoice(lang: string): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  const base = (lang || 'en').split('-')[0];
  const chain = FALLBACK_LANG[base] || [lang, base];
  for (const want of chain) {
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    for (const v of voices) {
      const s = score(v, want);
      if (s > bestScore) { best = v; bestScore = s; }
    }
    if (best) return best;
  }
  return null;
}

export async function listVoices(lang: string): Promise<SpeechSynthesisVoice[]> {
  const voices = await loadVoices();
  const base = (lang || 'en').split('-')[0];
  return voices
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base))
    .sort((a, b) => score(b, lang) - score(a, lang));
}

type Prefs = { rate?: number; voiceURI?: Record<string, string> };
function prefs(): Prefs {
  try { return JSON.parse(localStorage.getItem(RATE_KEY) || '{}'); } catch { return {}; }
}
function savePrefs(p: Prefs): void {
  try { localStorage.setItem(RATE_KEY, JSON.stringify(p)); } catch { /* private mode */ }
}
export function getRate(): number {
  const r = prefs().rate;
  return typeof r === 'number' && r >= 0.6 && r <= 1.4 ? r : 1;
}
export function setRate(r: number): void {
  savePrefs({ ...prefs(), rate: Math.min(1.4, Math.max(0.6, r)) });
}
export function setPreferredVoice(lang: string, voiceURI: string): void {
  const p = prefs();
  p.voiceURI = { ...(p.voiceURI || {}), [lang.split('-')[0]]: voiceURI };
  savePrefs(p);
}

// Sentence-split on Latin and Indic terminators (।/॥ included so Punjabi or
// quoted translations pause correctly), then re-merge tiny fragments so the
// queue doesn't stutter.
export function sentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?।॥;:])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    // Only interjection-length fragments ("Yes.", "ਜੀ।") merge into the
    // previous chunk — normal short sentences keep their own pause.
    if (merged.length && p.length < 15 && (merged[merged.length - 1].length + p.length) < 90) {
      merged[merged.length - 1] += ' ' + p;
    } else merged.push(p);
  }
  return merged;
}

let queue: string[] = [];
let speaking = false;
let keepAlive: ReturnType<typeof setInterval> | null = null;

function stopKeepAlive(): void {
  if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
}

export function stop(): void {
  queue = [];
  speaking = false;
  stopKeepAlive();
  if (supported()) speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return speaking;
}

export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!supported() || !text.trim()) { opts.onend?.(); return; }
  stop();
  const lang = opts.lang || document.documentElement.lang || 'en';
  const base = lang.split('-')[0];
  const preset = PRESETS[base] || PRESETS.en;
  const voice = await resolveVoice(lang);
  queue = sentences(text);
  speaking = true;
  opts.onstart?.();

  // Chrome bug: long utterances go silent after ~15s unless nudged.
  stopKeepAlive();
  keepAlive = setInterval(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      speechSynthesis.resume();
    }
  }, 10000);

  const next = () => {
    if (!speaking || !queue.length) {
      const wasSpeaking = speaking;
      stop();
      if (wasSpeaking) opts.onend?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(queue.shift());
    u.lang = voice?.lang || lang;
    if (voice) u.voice = voice;
    u.rate = preset.rate * getRate();
    u.pitch = preset.pitch;
    // A breath between sentences reads as human; a hard onend-chain reads as a
    // teleprompter. 220ms ≈ a natural comma-length pause.
    u.onend = () => { if (speaking) setTimeout(next, 220); };
    u.onerror = () => { if (speaking) setTimeout(next, 60); };
    speechSynthesis.speak(u);
  };
  next();
}

async function resolveVoice(lang: string): Promise<SpeechSynthesisVoice | null> {
  const base = lang.split('-')[0];
  const preferred = prefs().voiceURI?.[base];
  if (preferred) {
    const all = await loadVoices();
    const v = all.find((x) => x.voiceURI === preferred);
    if (v) return v;
  }
  return pickVoice(lang);
}

// Cancel synthesis when the page unloads — otherwise some browsers keep
// speaking over the next page.
if (supported()) {
  addEventListener('pagehide', stop);
}

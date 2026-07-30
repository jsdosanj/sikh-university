// Allowlists for self-service profile fields (country + languages).
// Constraining these to fixed lists keeps stored data clean and avoids users
// pasting sensitive personal information into free-text fields (ToS/Privacy).
// NOTE: the same two arrays are duplicated in web/src/pages/dashboard.astro's
// inline <script> (Astro client scripts can't import server modules). If you
// edit a list here, update it there too.

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belgium", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Brazil", "Brunei", "Bulgaria",
  "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia", "Croatia",
  "Cyprus", "Czechia", "Denmark", "Ecuador", "Egypt", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France", "Georgia", "Germany", "Ghana", "Greece",
  "Guatemala", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Libya", "Lithuania", "Luxembourg", "Malaysia", "Maldives", "Malta",
  "Mauritius", "Mexico", "Moldova", "Mongolia", "Morocco", "Myanmar", "Nepal",
  "Netherlands", "New Zealand", "Nigeria", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", "Serbia", "Singapore",
  "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia",
  "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe", "Other",
];

export const LANGUAGES = [
  "Punjabi", "English", "Hindi", "Urdu", "Gurmukhi", "Shahmukhi", "Bengali",
  "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Sindhi",
  "Pashto", "Farsi", "Arabic", "Spanish", "French", "German", "Portuguese",
  "Italian", "Dutch", "Russian", "Mandarin", "Cantonese", "Japanese", "Korean",
  "Thai", "Vietnamese", "Indonesian", "Malay", "Swahili", "Turkish", "Other",
];

// Teaching-area tags for a teacher's public profile (Workstream A). Kept fixed
// (not free text) for the same reason COUNTRIES/LANGUAGES are: clean, comparable
// data, no free-text injection surface.
export const AREAS = [
  "Gurbani", "Gurmat", "Itihas (History)", "Kirtan & Raag", "Gurmukhi & Punjabi",
  "Rehat & Practice", "Philosophy", "Comparative", "Santhya", "Modern Skills",
];

const COUNTRY_SET = new Set(COUNTRIES);
const LANGUAGE_SET = new Set(LANGUAGES);
const AREA_SET = new Set(AREAS);

// Strip angle brackets + control chars, collapse whitespace, cap length.
export function cleanName(raw) {
  const s = String(raw == null ? "" : raw)
    .replace(/[<>]/g, "")
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return s || null;
}

// Country must be on the allowlist, else null.
export function cleanCountry(raw) {
  const s = String(raw == null ? "" : raw).trim();
  return COUNTRY_SET.has(s) ? s : null;
}

// Keep only allowlisted languages, de-duplicated, max 10, comma-joined.
export function cleanLanguages(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") list = raw.split(",");
  const seen = new Set();
  for (const item of list) {
    const s = String(item).trim();
    if (LANGUAGE_SET.has(s) && !seen.has(s)) seen.add(s);
    if (seen.size >= 10) break;
  }
  return seen.size ? Array.from(seen).join(",") : null;
}

// Keep only allowlisted teaching areas, de-duplicated, max 6, comma-joined.
export function cleanAreas(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") list = raw.split(",");
  const seen = new Set();
  for (const item of list) {
    const s = String(item).trim();
    if (AREA_SET.has(s) && !seen.has(s)) seen.add(s);
    if (seen.size >= 6) break;
  }
  return seen.size ? Array.from(seen).join(",") : null;
}

// Plain-text teacher bio: no markdown/HTML (matches the esc()-everywhere
// rendering convention). \n\n marks paragraph breaks on render. 2000-char cap.
export function cleanBio(raw) {
  const s = String(raw == null ? "" : raw)
    .replace(/[<>]/g, "")
    .replace(/\p{Cc}/gu, (c) => (c === "\n" ? "\n" : ""))
    .trim()
    .slice(0, 2000);
  return s || null;
}

export function cleanCredentials(raw) {
  const s = String(raw == null ? "" : raw)
    .replace(/[<>]/g, "")
    .replace(/\p{Cc}/gu, (c) => (c === "\n" ? "\n" : ""))
    .trim()
    .slice(0, 1000);
  return s || null;
}

// Up to 4 https-only links, stored as a JSON string [{kind,url}].
export function cleanLinks(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const kind = String(item.kind || "").trim().slice(0, 40);
    const url = String(item.url || "").trim().slice(0, 300);
    if (!kind || !/^https:\/\//i.test(url)) continue;
    out.push({ kind, url });
    if (out.length >= 4) break;
  }
  return out.length ? JSON.stringify(out) : null;
}

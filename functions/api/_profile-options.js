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

const COUNTRY_SET = new Set(COUNTRIES);
const LANGUAGE_SET = new Set(LANGUAGES);

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

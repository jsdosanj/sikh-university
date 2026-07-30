// Shared helpers for the teacher-profile/claim routes. (_-prefixed → not a route.)

// Matches web/src/lib/data.ts's profSlug() normalization, so a teacher's slug
// reads the same way a professor's does.
export function slugify(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// A short defense-in-depth blocklist — real top-level static routes a teacher
// slug shouldn't be confused with (the actual URL is /teacher/<slug>, so there's
// no literal path collision, but these would be a confusing choice regardless).
const RESERVED_SLUGS = new Set([
  "", "admin", "api", "dashboard", "login", "logout", "teacher", "teachers",
  "professor", "professors", "studio", "review", "mfa", "index", "search",
  "catalog", "programs", "cohorts", "about", "cert", "feedback",
]);

// Generate a unique, frozen-once-approved slug for a display name. `exists`
// is called with a candidate slug and must return whether it's already taken
// (by another user_id) — the caller supplies the DB check.
export async function uniqueSlug(baseName, exists) {
  const base = slugify(baseName) || "teacher";
  let candidate = RESERVED_SLUGS.has(base) ? base + "-1" : base;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

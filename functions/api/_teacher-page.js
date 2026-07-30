// Shared "public teacher profile" projection — used by both functions/api/teachers.js
// (client-side fetch) and worker.js's worker-rendered /teacher/:slug shell (server-side
// data island), so the two never drift. (_-prefixed → not a route.)

export const TEACHER_PUBLIC_COLS =
  "user_id, slug, display_name, bio, credentials, areas, languages_taught, links, photo_key, " +
  "claimed_professor, verification_level, updated_at";

export function presentTeacherProfile(row) {
  if (!row) return null;
  let links = [];
  try { links = row.links ? JSON.parse(row.links) : []; } catch (e) {}
  return {
    slug: row.slug,
    displayName: row.display_name,
    bio: row.bio,
    credentials: row.credentials,
    areas: row.areas ? row.areas.split(",") : [],
    languagesTaught: row.languages_taught ? row.languages_taught.split(",") : [],
    links,
    photoUrl: row.photo_key ? `/media/${row.photo_key}` : null,
    claimedProfessor: row.claimed_professor,
    verificationLevel: row.verification_level,
    updatedAt: row.updated_at,
  };
}

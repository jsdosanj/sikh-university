import { json, getUser } from "./_lib.js";

// GET /api/me -> current user { id, email, name, role } or { user: null }
export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  return json({ user: user || null });
}

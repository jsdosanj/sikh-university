// Cross-domain SSO consumer -- the sikhiuni.com side of the handoff minted
// by sikhi.io's lib/auth/sso.ts (built same session, 2026-09-03). Same
// HMAC-SHA256 token shape as punjabiuni's lib/auth/sso.ts -- duplicated,
// not imported, across all three repos (no shared package between them).
//
// EMAIL IS THE JOIN KEY, not any site's internal user id -- see the long
// comment in sikhi.io's lib/auth/sso.ts for why. sikhiuni's own `users.id`
// is a crypto.randomUUID()-derived string (see functions/api/_lib.js
// newId()), completely independent of sikhi.io's Clerk/Better-Auth ids and
// punjabiuni's randomId() -- none of these three id spaces line up.

function b64urlDecode(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secretHex) {
  const keyBytes = new Uint8Array(secretHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  return crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
}

/** Verifies signature AND expiry. Returns the payload, or null on any failure -- never throws. */
export async function verifySsoToken(token, secretHex) {
  try {
    const [bodyB64, sigB64] = token.split(".");
    if (!bodyB64 || !sigB64) return null;
    const key = await hmacKey(secretHex);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sigB64), new TextEncoder().encode(bodyB64));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(bodyB64)));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.email !== "string" || !payload.email.includes("@")) return null;
    return payload;
  } catch {
    return null;
  }
}

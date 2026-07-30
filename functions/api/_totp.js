// RFC 6238 TOTP + AES-GCM secret-at-rest helpers, Web Crypto only.
// Runs in the Cloudflare Workers runtime: no Node `crypto`, no npm packages.
// (_-prefixed → not a route.)

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648 base32

// --- base32 (RFC 4648, no padding) ---------------------------------------

export function base32Encode(bytes) {
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(base32) {
  const clean = String(base32).toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0, value = 0;
  const out = new Uint8Array(Math.floor((clean.length * 5) / 8));
  let i = 0;
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out[i++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return out;
}

// --- secret generation ----------------------------------------------------

export function generateSecret(len = 20) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// --- TOTP (RFC 6238) / HOTP (RFC 4226) -----------------------------------

// 8-byte big-endian counter, per RFC 4226 §5.1.
function counterBytes(counter) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, BigInt(counter), false);
  return new Uint8Array(buf);
}

async function hmacSha1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, msgBytes));
}

export async function totp(secretBase32, timeMs = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(Math.floor(timeMs / 1000) / step);
  const mac = await hmacSha1(base32Decode(secretBase32), counterBytes(counter));
  // Dynamic truncation, RFC 4226 §5.3.
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

// Compare two strings without leaking where they differ.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyTotp(secretBase32, code, opts = {}) {
  const { window = 1, step = 30, digits = 6, timeMs = Date.now() } = opts;
  const candidate = String(code == null ? "" : code).trim();
  let ok = false;
  for (let i = -window; i <= window; i++) {
    const expected = await totp(secretBase32, timeMs + i * step * 1000, step, digits);
    // No early return: every step in the window costs the same.
    if (timingSafeEqual(expected, candidate)) ok = true;
  }
  return ok;
}

// --- backup codes ---------------------------------------------------------

// Unambiguous charset: no 0/O/1/I/L.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 chars

export function generateBackupCodes(count = 10, len = 8) {
  const limit = 256 - (256 % CODE_CHARS.length); // reject above this → no modulo bias
  const codes = [];
  for (let c = 0; c < count; c++) {
    let code = "";
    while (code.length < len) {
      const buf = new Uint8Array(len);
      crypto.getRandomValues(buf);
      for (const b of buf) {
        if (b >= limit) continue;
        code += CODE_CHARS[b % CODE_CHARS.length];
        if (code.length === len) break;
      }
    }
    codes.push(code);
  }
  return codes;
}

export async function sha256Hex(str) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- AES-GCM secret at rest ----------------------------------------------

function b64encode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importAesKey(rawKeyB64) {
  return crypto.subtle.importKey(
    "raw", b64decode(rawKeyB64), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
}

// Returns base64(iv) + "." + base64(ciphertext) — stored in user_mfa.secret_enc.
export async function encryptSecret(rawKeyB64, plaintextSecret) {
  const key = await importAesKey(rawKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintextSecret)
  );
  return `${b64encode(iv)}.${b64encode(new Uint8Array(ct))}`;
}

export async function decryptSecret(rawKeyB64, ivCtB64) {
  const [ivB64, ctB64] = String(ivCtB64).split(".");
  if (!ivB64 || !ctB64) throw new Error("malformed encrypted secret");
  const key = await importAesKey(rawKeyB64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) }, key, b64decode(ctB64)
  );
  return new TextDecoder().decode(pt);
}

// --- provisioning URI (Google Authenticator Key URI Format) --------------

export function otpauthUri(secretBase32, email, issuer = "Sikhi University") {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secretBase32)}&issuer=${encodeURIComponent(issuer)}`;
}

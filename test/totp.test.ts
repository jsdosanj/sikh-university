import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateSecret,
  totp,
  verifyTotp,
  generateBackupCodes,
  sha256Hex,
  encryptSecret,
  decryptSecret,
  otpauthUri,
} from "../functions/api/_totp.js";

// RFC 6238 Appendix B specifies the SHA-1 vectors against the raw 20-byte ASCII
// secret "12345678901234567890". Our API takes base32, so we encode those exact
// bytes — base32Decode(SECRET) is byte-for-byte the RFC's seed.
const RFC_SECRET_BYTES = new TextEncoder().encode("12345678901234567890");
const SECRET = base32Encode(RFC_SECRET_BYTES);

describe("base32", () => {
  it("encodes the RFC 6238 seed to the canonical base32 string", () => {
    expect(SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(new TextDecoder().decode(base32Decode(SECRET))).toBe("12345678901234567890");
  });

  it("round-trips random byte strings of every length 0..40", () => {
    for (let len = 0; len <= 40; len++) {
      const bytes = crypto.getRandomValues(new Uint8Array(len));
      const decoded = base32Decode(base32Encode(bytes));
      expect(Array.from(decoded)).toEqual(Array.from(bytes));
    }
  });

  it("emits no padding and only alphabet characters", () => {
    const enc = base32Encode(crypto.getRandomValues(new Uint8Array(11)));
    expect(enc).toMatch(/^[A-Z2-7]+$/);
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => base32Decode("ABC1")).toThrow();
  });

  it("generateSecret returns 32 base32 chars for the default 20 bytes", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(s).length).toBe(20);
    expect(generateSecret()).not.toBe(s); // random
    expect(base32Decode(generateSecret(10)).length).toBe(10);
  });
});

// RFC 6238 Appendix B, SHA-1 rows. Times are Unix seconds → ms for our API.
const RFC_VECTORS: Array<[number, string]> = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("totp — RFC 6238 Appendix B (HMAC-SHA1)", () => {
  for (const [t, expected] of RFC_VECTORS) {
    it(`T=${t} → ${expected} (8 digits)`, async () => {
      expect(await totp(SECRET, t * 1000, 30, 8)).toBe(expected);
    });
  }

  // Dynamic truncation takes `binary % 10^digits`, so the 6-digit code is
  // mathematically the low-order 6 digits of the published 8-digit vector.
  for (const [t, expected] of RFC_VECTORS) {
    it(`T=${t} → ${expected.slice(2)} (6 digits, same truncation)`, async () => {
      expect(await totp(SECRET, t * 1000, 30, 6)).toBe(expected.slice(2));
    });
  }

  it("is constant across a whole 30s step and changes at the boundary", async () => {
    const stepStart = 1111111080 * 1000; // 37037036 * 30
    expect(await totp(SECRET, stepStart)).toBe(await totp(SECRET, stepStart + 29_999));
    expect(await totp(SECRET, stepStart)).not.toBe(await totp(SECRET, stepStart + 30_000));
  });

  it("zero-pads short codes to the requested width", async () => {
    const code = await totp(SECRET, 1111111109 * 1000, 30, 8);
    expect(code).toBe("07081804");
    expect(code.length).toBe(8);
  });
});

describe("verifyTotp — window edges", () => {
  const NOW = 1234567890 * 1000;
  const STEP_MS = 30_000;

  it("accepts the current code", async () => {
    const code = await totp(SECRET, NOW);
    expect(await verifyTotp(SECRET, code, { timeMs: NOW })).toBe(true);
  });

  it("accepts a code from step-1 and step+1 with window=1", async () => {
    const prev = await totp(SECRET, NOW - STEP_MS);
    const next = await totp(SECRET, NOW + STEP_MS);
    expect(await verifyTotp(SECRET, prev, { timeMs: NOW, window: 1 })).toBe(true);
    expect(await verifyTotp(SECRET, next, { timeMs: NOW, window: 1 })).toBe(true);
  });

  it("rejects a code 2 steps away with window=1", async () => {
    const before = await totp(SECRET, NOW - 2 * STEP_MS);
    const after = await totp(SECRET, NOW + 2 * STEP_MS);
    expect(await verifyTotp(SECRET, before, { timeMs: NOW, window: 1 })).toBe(false);
    expect(await verifyTotp(SECRET, after, { timeMs: NOW, window: 1 })).toBe(false);
  });

  it("accepts a code 2 steps away once window=2", async () => {
    const before = await totp(SECRET, NOW - 2 * STEP_MS);
    expect(await verifyTotp(SECRET, before, { timeMs: NOW, window: 2 })).toBe(true);
  });

  it("window=0 accepts only the current step", async () => {
    const prev = await totp(SECRET, NOW - STEP_MS);
    expect(await verifyTotp(SECRET, await totp(SECRET, NOW), { timeMs: NOW, window: 0 })).toBe(true);
    expect(await verifyTotp(SECRET, prev, { timeMs: NOW, window: 0 })).toBe(false);
  });

  it("rejects wrong, empty, null and malformed codes", async () => {
    expect(await verifyTotp(SECRET, "000000", { timeMs: NOW })).toBe(false);
    expect(await verifyTotp(SECRET, "", { timeMs: NOW })).toBe(false);
    expect(await verifyTotp(SECRET, null, { timeMs: NOW })).toBe(false);
    expect(await verifyTotp(SECRET, "not-a-code", { timeMs: NOW })).toBe(false);
  });

  it("rejects a code generated from a different secret", async () => {
    const other = generateSecret();
    expect(await verifyTotp(SECRET, await totp(other, NOW), { timeMs: NOW })).toBe(false);
  });

  it("tolerates surrounding whitespace in user-entered codes", async () => {
    const code = await totp(SECRET, NOW);
    expect(await verifyTotp(SECRET, `  ${code} `, { timeMs: NOW })).toBe(true);
  });
});

describe("sha256Hex", () => {
  it("matches known vectors", async () => {
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("is deterministic and 64 lowercase hex chars", async () => {
    const h = await sha256Hex("BACKUPCODE");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex("BACKUPCODE")).toBe(h);
  });
});

describe("generateBackupCodes", () => {
  it("returns the requested count and length, in the unambiguous charset", () => {
    const codes = generateBackupCodes(10, 8);
    expect(codes.length).toBe(10);
    for (const c of codes) {
      expect(c.length).toBe(8);
      expect(c).toMatch(/^[A-HJ-KM-NP-Z2-9]+$/);
      expect(c).not.toMatch(/[0O1IL]/); // no ambiguous characters
    }
  });

  it("honours custom count and length", () => {
    const codes = generateBackupCodes(3, 12);
    expect(codes.length).toBe(3);
    for (const c of codes) expect(c.length).toBe(12);
  });

  it("produces distinct codes", () => {
    const codes = generateBackupCodes(50, 8);
    expect(new Set(codes).size).toBe(50);
  });

  it("never emits an ambiguous character across a large sample", () => {
    const all = generateBackupCodes(500, 8).join("");
    expect(all).not.toMatch(/[0O1IL]/);
    expect(all.length).toBe(4000);
  });
});

describe("AES-GCM secret at rest", () => {
  const KEY_B64 = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  );

  it("round-trips a TOTP secret", async () => {
    const secret = generateSecret();
    const enc = await encryptSecret(KEY_B64, secret);
    expect(await decryptSecret(KEY_B64, enc)).toBe(secret);
  });

  it("stores as base64(iv).base64(ciphertext) with a 12-byte IV", async () => {
    const enc = await encryptSecret(KEY_B64, SECRET);
    const parts = enc.split(".");
    expect(parts.length).toBe(2);
    expect(atob(parts[0]).length).toBe(12);
    expect(enc).not.toContain(SECRET); // secret is not stored in the clear
  });

  it("two encryptions of the same secret differ (random IV)", async () => {
    const a = await encryptSecret(KEY_B64, SECRET);
    const b = await encryptSecret(KEY_B64, SECRET);
    expect(a).not.toBe(b);
    expect(a.split(".")[0]).not.toBe(b.split(".")[0]); // different IVs
    expect(a.split(".")[1]).not.toBe(b.split(".")[1]); // different ciphertext
    expect(await decryptSecret(KEY_B64, a)).toBe(SECRET);
    expect(await decryptSecret(KEY_B64, b)).toBe(SECRET);
  });

  it("fails to decrypt with the wrong key", async () => {
    const other = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const enc = await encryptSecret(KEY_B64, SECRET);
    await expect(decryptSecret(other, enc)).rejects.toThrow();
  });

  it("fails to decrypt tampered ciphertext (GCM auth tag)", async () => {
    const enc = await encryptSecret(KEY_B64, SECRET);
    const [iv, ct] = enc.split(".");
    const bytes = Uint8Array.from(atob(ct), c => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    const tampered = `${iv}.${btoa(String.fromCharCode(...bytes))}`;
    await expect(decryptSecret(KEY_B64, tampered)).rejects.toThrow();
  });

  it("rejects a malformed stored value", async () => {
    await expect(decryptSecret(KEY_B64, "nodot")).rejects.toThrow("malformed encrypted secret");
  });

  it("a decrypted secret still verifies codes", async () => {
    const enc = await encryptSecret(KEY_B64, SECRET);
    const back = await decryptSecret(KEY_B64, enc);
    const NOW = 1234567890 * 1000;
    expect(await verifyTotp(back, await totp(SECRET, NOW), { timeMs: NOW })).toBe(true);
  });
});

describe("otpauthUri", () => {
  it("builds the Key URI Format string with encoded label and issuer", () => {
    const uri = otpauthUri(SECRET, "gurmukh@example.com");
    expect(uri).toBe(
      "otpauth://totp/Sikhi%20University:gurmukh%40example.com" +
        `?secret=${SECRET}&issuer=Sikhi%20University`
    );
  });

  it("encodes a custom issuer in both the label and the query", () => {
    const uri = otpauthUri(SECRET, "a+b@example.com", "E13 / University");
    expect(uri).toContain("otpauth://totp/E13%20%2F%20University:a%2Bb%40example.com");
    expect(uri).toContain("&issuer=E13%20%2F%20University");
  });

  it("round-trips the secret through URL parsing", () => {
    const url = new URL(otpauthUri(SECRET, "gurmukh@example.com"));
    expect(url.searchParams.get("secret")).toBe(SECRET);
    expect(url.searchParams.get("issuer")).toBe("Sikhi University");
  });
});

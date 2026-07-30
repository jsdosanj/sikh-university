import { describe, it, expect } from "vitest";
import {
  encodeQR,
  qrToSvg,
  gfMul,
  rsGeneratorPoly,
  rsRemainder,
  numDataCodewords,
  chooseVersion,
} from "../web/src/lib/qr";

// The MFA enrollment QR is generated in the browser so the TOTP secret never
// leaves the device. That means no external encoder can be blamed for a bad
// symbol — these tests pin the encoder against an independent GF(256)
// implementation and against hand-derived vectors.

// ---------------------------------------------------------------------------
// Independent GF(256): exp/log tables built from the QR primitive polynomial
// x^8 + x^4 + x^3 + x^2 + 1 (0x11D). The library multiplies bit-by-bit
// (carry-less multiply + reduce) instead, so agreement is a real cross-check.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// Reference generator polynomial: product of (x - a^i), coefficients high-order
// first, leading 1 dropped (same convention as rsGeneratorPoly).
function refGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly.slice(1);
}

// Reference polynomial long division of data(x)*x^degree by the generator.
function refRemainder(data: readonly number[], gen: readonly number[]): number[] {
  const work = data.concat(new Array(gen.length).fill(0));
  for (let i = 0; i < data.length; i++) {
    const lead = work[i];
    if (lead === 0) continue;
    for (let j = 0; j < gen.length; j++) work[i + 1 + j] ^= mul(gen[j], lead);
  }
  return work.slice(data.length);
}

describe("GF(256) arithmetic", () => {
  it("gfMul agrees with exp/log tables for every pair of bytes", () => {
    for (let a = 0; a < 256; a++) {
      for (let b = 0; b < 256; b++) {
        if (gfMul(a, b) !== mul(a, b)) {
          throw new Error(`gfMul(${a},${b}) = ${gfMul(a, b)}, expected ${mul(a, b)}`);
        }
      }
    }
    expect(gfMul(2, 209)).toBe(191); // 0xD1 << 1 = 0x1A2, 0x1A2 ^ 0x11D = 0xBF
  });
});

describe("Reed-Solomon generator polynomials (hand-derived)", () => {
  // Degree 2, by hand:
  //   g(x) = (x + a^0)(x + a^1) = x^2 + (a^0 + a^1)x + (a^0 * a^1)
  //   a^0 = 1, a^1 = 2  ->  coefficient of x is 1 XOR 2 = 3, constant is 1*2 = 2
  //   g(x) = x^2 + 3x + 2  ->  [3, 2] with the leading 1 dropped.
  it("degree 2 is x^2 + 3x + 2", () => {
    expect(rsGeneratorPoly(2)).toEqual([3, 2]);
  });

  // Degree 3, by hand, multiplying the degree-2 result by (x + a^2 = x + 4):
  //   (x^2 + 3x + 2)(x + 4)
  //     = x^3 + (3 XOR 4)x^2 + (2 XOR 3*4)x + 2*4
  //   3*4 = (x+1)*x^2 = x^3 + x^2 = 8 XOR 4 = 12   (degree < 8, no reduction)
  //   2*4 = x^3 = 8
  //   -> x^3 + 7x^2 + (2 XOR 12 = 14)x + 8  ->  [7, 14, 8]
  it("degree 3 is x^3 + 7x^2 + 14x + 8", () => {
    expect(rsGeneratorPoly(3)).toEqual([7, 14, 8]);
  });

  it("matches the reference construction for every degree used by QR", () => {
    for (const degree of [7, 10, 13, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30]) {
      expect(rsGeneratorPoly(degree)).toEqual(refGenerator(degree));
    }
  });
});

describe("Reed-Solomon remainder (hand-traced worked example)", () => {
  // Worked example derived by hand, two data codewords [0x40, 0x11] with two EC
  // codewords, generator g(x) = x^2 + 3x + 2 from above.
  //
  // Dividend: 0x40 x^3 + 0x11 x^2 + 0 x + 0  ->  [64, 17, 0, 0]
  //
  // Step 1. Leading term 64. Multiply g by 64:
  //   3*64  = (x+1)*x^6 = x^7 + x^6 = 128 XOR 64 = 192
  //   2*64  = x^7 = 128
  //   XOR [64, 192, 128] into [64, 17, 0]:
  //     64 XOR 64 = 0
  //     17 XOR 192 = 0b00010001 XOR 0b11000000 = 0b11010001 = 209
  //     0  XOR 128 = 128
  //   working remainder -> [209, 128, 0]
  //
  // Step 2. Leading term 209. Multiply g by 209:
  //   2*209 = 0xD1 << 1 = 0x1A2 -> 0x1A2 XOR 0x11D = 0xBF = 191
  //   3*209 = (2*209) XOR 209 = 191 XOR 209 = 0b10111111 XOR 0b11010001
  //         = 0b01101110 = 110
  //   XOR [209, 110, 191] into [209, 128, 0]:
  //     209 XOR 209 = 0
  //     128 XOR 110 = 0b10000000 XOR 0b01101110 = 0b11101110 = 238
  //     0   XOR 191 = 191
  //
  // Remainder = [238, 191] = [0xEE, 0xBF].
  it("computes [0xEE, 0xBF] for data [0x40, 0x11] with 2 EC codewords", () => {
    expect(rsRemainder([0x40, 0x11], rsGeneratorPoly(2))).toEqual([0xee, 0xbf]);
    // The independent long-division reference must agree with the hand trace.
    expect(refRemainder([0x40, 0x11], refGenerator(2))).toEqual([0xee, 0xbf]);
  });

  it("agrees with the reference division on longer messages", () => {
    const gen = rsGeneratorPoly(10);
    const ref = refGenerator(10);
    let seed = 12345;
    for (let trial = 0; trial < 20; trial++) {
      const data: number[] = [];
      for (let i = 0; i < 16; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        data.push((seed >>> 16) & 0xff);
      }
      expect(rsRemainder(data, gen)).toEqual(refRemainder(data, ref));
    }
  });

  it("remainder length always equals the generator degree", () => {
    expect(rsRemainder([1, 2, 3], rsGeneratorPoly(17)).length).toBe(17);
  });
});

describe("capacity tables", () => {
  it("matches published data-codeword counts", () => {
    expect(numDataCodewords(1, "L")).toBe(19);
    expect(numDataCodewords(1, "M")).toBe(16);
    expect(numDataCodewords(1, "Q")).toBe(13);
    expect(numDataCodewords(1, "H")).toBe(9);
    expect(numDataCodewords(2, "M")).toBe(28);
    // Version 7 row of the published capacity table: 156 / 124 / 88 / 66.
    expect(numDataCodewords(7, "L")).toBe(156);
    expect(numDataCodewords(7, "M")).toBe(124);
    expect(numDataCodewords(7, "Q")).toBe(88);
    expect(numDataCodewords(7, "H")).toBe(66);
    expect(numDataCodewords(10, "M")).toBe(216);
    expect(numDataCodewords(10, "Q")).toBe(154);
    expect(numDataCodewords(40, "L")).toBe(2956);
    expect(numDataCodewords(40, "M")).toBe(2334);
    expect(numDataCodewords(40, "Q")).toBe(1666);
    expect(numDataCodewords(40, "H")).toBe(1276);
  });

  it("picks the smallest version that fits, accounting for the header", () => {
    // v1-M holds 16 data codewords = 128 bits; 4 mode bits + 8 count bits leaves
    // 116 bits = 14 whole bytes.
    expect(chooseVersion(14, "M")).toBe(1);
    expect(chooseVersion(15, "M")).toBe(2);
    expect(chooseVersion(1, "H")).toBe(1);
  });

  it("throws when the payload cannot fit in version 40", () => {
    expect(() => chooseVersion(3000, "M")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Structural checks on rendered symbols.
const FINDER = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

function expectFinder(m: boolean[][], ox: number, oy: number): void {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      expect(m[oy + y][ox + x]).toBe(FINDER[y][x] === 1);
    }
  }
  // One-module light separator around the inner edges of the finder.
  const size = m.length;
  for (let d = -1; d <= 7; d++) {
    for (const [x, y] of [
      [ox + d, oy - 1],
      [ox + d, oy + 7],
      [ox - 1, oy + d],
      [ox + 7, oy + d],
    ]) {
      if (x >= 0 && y >= 0 && x < size && y < size) expect(m[y][x]).toBe(false);
    }
  }
}

const OTPAUTH = "otpauth://totp/Sikhi%20University:sangat@example.org?secret=JBSWY3DPEHPK3PXP&issuer=Sikhi%20University&algorithm=SHA1&digits=6&period=30";

describe("encodeQR structure", () => {
  it("produces a 21x21 matrix for a short version-1 payload", () => {
    const m = encodeQR("HELLO", "M");
    expect(m.length).toBe(21);
    for (const row of m) expect(row.length).toBe(21);
  });

  it("sizes the matrix as 4*version+17 for the auto-selected version", () => {
    for (const text of ["HI", "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP", OTPAUTH]) {
      const bytes = new TextEncoder().encode(text);
      const version = chooseVersion(bytes.length, "M");
      const m = encodeQR(text, "M");
      expect(m.length).toBe(4 * version + 17);
    }
  });

  it("places the three finder patterns with separators", () => {
    for (const text of ["HELLO", OTPAUTH]) {
      const m = encodeQR(text, "M");
      const size = m.length;
      expectFinder(m, 0, 0);
      expectFinder(m, size - 7, 0);
      expectFinder(m, 0, size - 7);
      // The bottom-right corner carries data, not a fourth finder.
      const corner = m.slice(size - 7).map((row) => row.slice(size - 7));
      expect(corner.every((row, y) => row.every((v, x) => v === (FINDER[y][x] === 1)))).toBe(false);
    }
  });

  it("alternates the timing patterns along row 6 and column 6", () => {
    const m = encodeQR(OTPAUTH, "M");
    const size = m.length;
    for (let i = 8; i < size - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
  });

  it("sets the dark module at (8, size-8)", () => {
    for (const ec of ["L", "M", "Q", "H"] as const) {
      const m = encodeQR("HELLO", ec);
      expect(m[m.length - 8][8]).toBe(true);
    }
  });

  it("encodes an otpauth URI at every EC level without throwing", () => {
    for (const ec of ["L", "M", "Q", "H"] as const) {
      const m = encodeQR(OTPAUTH, ec);
      expect(m.length).toBe(4 * chooseVersion(OTPAUTH.length, ec) + 17);
    }
  });

  it("fills every version 1-40 exactly, keeping the layout valid", () => {
    for (let version = 1; version <= 40; version++) {
      const ccBits = version <= 9 ? 8 : 16;
      const maxBytes = Math.floor((numDataCodewords(version, "M") * 8 - 4 - ccBits) / 8);
      const text = "a".repeat(maxBytes);
      expect(chooseVersion(maxBytes, "M")).toBe(version);
      const m = encodeQR(text, "M");
      expect(m.length).toBe(4 * version + 17);
      expectFinder(m, 0, 0);
      expectFinder(m, m.length - 7, 0);
      expectFinder(m, 0, m.length - 7);
      for (let i = 8; i < m.length - 8; i++) {
        expect(m[6][i]).toBe(i % 2 === 0);
        expect(m[i][6]).toBe(i % 2 === 0);
      }
      expect(m[m.length - 8][8]).toBe(true);
    }
  });

  it("handles multi-byte UTF-8 payloads by byte length", () => {
    const text = "ਸਿੱਖੀ";
    const m = encodeQR(text, "M");
    expect(m.length).toBe(4 * chooseVersion(new TextEncoder().encode(text).length, "M") + 17);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: read the symbol back out with an independently written reader.
// Limited to version 1 (single block, 26 codewords, no alignment patterns), so
// the reader needs no shared knowledge of the library's layout code.
function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
  }
}

function decodeVersion1(m: boolean[][]): { text: string; mask: number; codewords: number[] } {
  const size = m.length;
  const reserved = (x: number, y: number): boolean =>
    (x <= 8 && y <= 8) ||
    (x >= size - 8 && y <= 8) ||
    (x <= 8 && y >= size - 8) ||
    x === 6 ||
    y === 6;

  // Format information, first copy: bits 0-5 at (8,0..5), bit 6 at (8,7),
  // bit 7 at (8,8), bit 8 at (7,8), bits 9-14 at (5..0, 8).
  const raw: number[] = [];
  for (let i = 0; i <= 5; i++) raw.push(m[i][8] ? 1 : 0);
  raw.push(m[7][8] ? 1 : 0);
  raw.push(m[8][8] ? 1 : 0);
  raw.push(m[8][7] ? 1 : 0);
  for (let i = 9; i < 15; i++) raw.push(m[8][14 - i] ? 1 : 0);
  let fmt = 0;
  raw.forEach((b, i) => (fmt |= b << i));
  const data = (fmt ^ 0x5412) >>> 10;
  const mask = data & 7;

  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!reserved(x, y)) bits.push((m[y][x] !== maskBit(mask, x, y)) ? 1 : 0);
      }
    }
  }

  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let cw = 0;
    for (let j = 0; j < 8; j++) cw = (cw << 1) | bits[i + j];
    codewords.push(cw);
  }

  // Byte mode: 4-bit mode indicator, 8-bit length, then the payload bytes.
  const mode = (codewords[0] >>> 4) & 0xf;
  if (mode !== 0b0100) throw new Error(`expected byte mode, got ${mode}`);
  const len = ((codewords[0] & 0xf) << 4) | ((codewords[1] >>> 4) & 0xf);
  const payload: number[] = [];
  for (let i = 0; i < len; i++) {
    payload.push(((codewords[1 + i] & 0xf) << 4) | ((codewords[2 + i] >>> 4) & 0xf));
  }
  return { text: new TextDecoder().decode(new Uint8Array(payload)), mask, codewords };
}

describe("round trip through an independent reader (version 1)", () => {
  it("reads back the payload, and the EC codewords check out", () => {
    // 14 bytes is the version-1-M byte-mode maximum, so all of these stay in v1.
    for (const text of ["HELLO", "sikhi", "otp://a?s=ABCD"]) {
      const m = encodeQR(text, "M");
      expect(m.length).toBe(21);
      const { text: out, mask, codewords } = decodeVersion1(m);
      expect(out).toBe(text);
      expect(mask).toBeGreaterThanOrEqual(0);
      expect(mask).toBeLessThan(8);
      expect(codewords.length).toBe(26);
      // v1-M: 16 data codewords + 10 EC codewords, single block.
      const ecc = codewords.slice(16, 26);
      expect(ecc).toEqual(refRemainder(codewords.slice(0, 16), refGenerator(10)));
      // Padding after the terminator alternates 0xEC / 0x11.
      const tail = codewords.slice(2 + text.length, 16);
      tail.forEach((cw, i) => expect(cw).toBe(i % 2 === 0 ? 0xec : 0x11));
    }
  });
});

// Version 8-M exercises what version 1 cannot: alignment patterns, version
// information, and four interleaved EC blocks. Layout constants below come from
// the ISO/IEC 18004 tables for version 8 (alignment centres 6/24/42) and the
// version 8-M block structure: 2 blocks of (60, 38) and 2 of (61, 39).
const V8_ALIGN = [6, 24, 42];
const V8_DATA_LENS = [38, 38, 39, 39];
const V8_ECC_LEN = 22;

function decodeVersion8(m: boolean[][]): { text: string; blocksOk: boolean } {
  const size = m.length;
  const alignCentres: [number, number][] = [];
  for (const px of V8_ALIGN) {
    for (const py of V8_ALIGN) {
      const corner =
        (px === 6 && py === 6) ||
        (px === 6 && py === V8_ALIGN[2]) ||
        (px === V8_ALIGN[2] && py === 6);
      if (!corner) alignCentres.push([px, py]);
    }
  }
  const reserved = (x: number, y: number): boolean => {
    if ((x <= 8 && y <= 8) || (x >= size - 8 && y <= 8) || (x <= 8 && y >= size - 8)) return true;
    if (x === 6 || y === 6) return true;
    if (x >= size - 11 && x <= size - 9 && y <= 5) return true; // version info
    if (y >= size - 11 && y <= size - 9 && x <= 5) return true;
    return alignCentres.some(([cx, cy]) => Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2);
  };

  const raw: number[] = [];
  for (let i = 0; i <= 5; i++) raw.push(m[i][8] ? 1 : 0);
  raw.push(m[7][8] ? 1 : 0);
  raw.push(m[8][8] ? 1 : 0);
  raw.push(m[8][7] ? 1 : 0);
  for (let i = 9; i < 15; i++) raw.push(m[8][14 - i] ? 1 : 0);
  let fmt = 0;
  raw.forEach((b, i) => (fmt |= b << i));
  const mask = ((fmt ^ 0x5412) >>> 10) & 7;

  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!reserved(x, y)) bits.push(m[y][x] !== maskBit(mask, x, y) ? 1 : 0);
      }
    }
  }
  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let cw = 0;
    for (let j = 0; j < 8; j++) cw = (cw << 1) | bits[i + j];
    codewords.push(cw);
  }

  // De-interleave: data codewords column by column, then EC codewords.
  const blockData: number[][] = V8_DATA_LENS.map(() => []);
  const blockEcc: number[][] = V8_DATA_LENS.map(() => []);
  let k = 0;
  for (let i = 0; i < Math.max(...V8_DATA_LENS); i++) {
    for (let j = 0; j < V8_DATA_LENS.length; j++) if (i < V8_DATA_LENS[j]) blockData[j].push(codewords[k++]);
  }
  for (let i = 0; i < V8_ECC_LEN; i++) {
    for (let j = 0; j < V8_DATA_LENS.length; j++) blockEcc[j].push(codewords[k++]);
  }
  const gen = refGenerator(V8_ECC_LEN);
  const blocksOk = blockData.every((d, j) => {
    const want = refRemainder(d, gen);
    return want.length === blockEcc[j].length && want.every((v, i) => v === blockEcc[j][i]);
  });

  const data = blockData.flat();
  let pos = 0;
  const take = (n: number): number => {
    let v = 0;
    for (let i = 0; i < n; i++, pos++) v = (v << 1) | ((data[pos >>> 3] >>> (7 - (pos & 7))) & 1);
    return v;
  };
  if (take(4) !== 0b0100) throw new Error("expected byte mode");
  const len = take(8); // version 8 uses an 8-bit character count indicator
  const payload: number[] = [];
  for (let i = 0; i < len; i++) payload.push(take(8));
  return { text: new TextDecoder().decode(new Uint8Array(payload)), blocksOk };
}

describe("round trip through an independent reader (version 8, 4 EC blocks)", () => {
  it("reads back a full otpauth URI and every interleaved block checks out", () => {
    expect(chooseVersion(new TextEncoder().encode(OTPAUTH).length, "M")).toBe(8);
    const m = encodeQR(OTPAUTH, "M");
    expect(m.length).toBe(49);
    const { text, blocksOk } = decodeVersion8(m);
    expect(text).toBe(OTPAUTH);
    expect(blocksOk).toBe(true);
  });
});

describe("qrToSvg", () => {
  const m = encodeQR("HELLO", "M");

  it("renders a standalone, self-sized SVG", () => {
    const svg = qrToSvg(m, { moduleSize: 4, margin: 4 });
    expect(svg.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('viewBox="0 0 29 29"'); // 21 modules + 4 quiet zone each side
    expect(svg).toContain('width="116"'); // 29 * 4
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("http://x"); // no external references beyond the SVG namespace
  });

  it("emits one path rect per dark module", () => {
    const svg = qrToSvg(m);
    const dark = m.flat().filter(Boolean).length;
    expect((svg.match(/h1v1h-1z/g) || []).length).toBe(dark);
  });

  it("escapes the accessible title", () => {
    const svg = qrToSvg(m, { title: 'MFA <secret> & "code"' });
    expect(svg).toContain("<title>");
    expect(svg).not.toContain("<secret>");
  });

  it("honours custom colours and margin", () => {
    const svg = qrToSvg(m, { dark: "#1b1b1b", light: "#fafafa", margin: 2, moduleSize: 8 });
    expect(svg).toContain('fill="#1b1b1b"');
    expect(svg).toContain('fill="#fafafa"');
    expect(svg).toContain('viewBox="0 0 25 25"');
    expect(svg).toContain('width="200"');
  });
});

// QR Code encoder written from scratch per ISO/IEC 18004 (Byte mode, versions
// 1-40, EC levels L/M/Q/H). Dependency-free so an MFA enrollment QR can be
// rendered in the browser: the TOTP secret must never reach a third-party
// image service.

export type EcLevel = 'L' | 'M' | 'Q' | 'H';
export type QrMatrix = boolean[][];

export interface QrSvgOptions {
  moduleSize?: number;
  margin?: number;
  dark?: string;
  light?: string;
  title?: string;
}

// Number of EC codewords per block, indexed [ecLevel][version]; index 0 unused.
const ECC_CODEWORDS_PER_BLOCK: Record<EcLevel, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

const NUM_EC_BLOCKS: Record<EcLevel, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

// Two-bit level indicator used inside the 15-bit format information.
const EC_FORMAT_BITS: Record<EcLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

export const MIN_VERSION = 1;
export const MAX_VERSION = 40;

// GF(256) arithmetic, primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 = 0x11D.
export function gfMul(a: number, b: number): number {
  let result = 0;
  for (let i = 7; i >= 0; i--) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    result ^= ((b >>> i) & 1) * a;
  }
  return result & 0xff;
}

// Coefficients of (x - a^0)(x - a^1)...(x - a^(degree-1)), leading 1 omitted.
export function rsGeneratorPoly(degree: number): number[] {
  if (degree < 1 || degree > 255) throw new RangeError('degree out of range');
  const result: number[] = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

// Remainder of data(x) * x^degree divided by the generator polynomial.
export function rsRemainder(data: readonly number[], generator: readonly number[]): number[] {
  const result: number[] = new Array(generator.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let j = 0; j < generator.length; j++) result[j] ^= gfMul(generator[j], factor);
  }
  return result;
}

function numRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

export function numDataCodewords(ver: number, ecl: EcLevel): number {
  return (
    Math.floor(numRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_EC_BLOCKS[ecl][ver]
  );
}

function charCountBits(ver: number): number {
  return ver <= 9 ? 8 : 16;
}

// Smallest version whose Byte-mode capacity holds `len` bytes at `ecl`.
export function chooseVersion(len: number, ecl: EcLevel): number {
  for (let ver = MIN_VERSION; ver <= MAX_VERSION; ver++) {
    const capacityBits = numDataCodewords(ver, ecl) * 8;
    const neededBits = 4 + charCountBits(ver) + len * 8;
    if (neededBits <= capacityBits) return ver;
  }
  throw new RangeError('data too long for a QR code');
}

function appendBits(bits: number[], value: number, len: number): void {
  for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

// Mode indicator + character count + payload + terminator + padding.
function buildDataCodewords(bytes: Uint8Array, ver: number, ecl: EcLevel): number[] {
  const capacityBits = numDataCodewords(ver, ecl) * 8;
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, charCountBits(ver));
  for (const b of bytes) appendBits(bits, b, 8);

  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);

  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) appendBits(bits, pad, 8);

  const codewords: number[] = new Array(bits.length / 8).fill(0);
  bits.forEach((bit, i) => {
    codewords[i >>> 3] |= bit << (7 - (i & 7));
  });
  return codewords;
}

// Split into blocks, append EC codewords per block, then interleave.
function interleaveBlocks(data: readonly number[], ver: number, ecl: EcLevel): number[] {
  const numBlocks = NUM_EC_BLOCKS[ecl][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][ver];
  const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const generator = rsGeneratorPoly(blockEccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + dataLen);
    k += dataLen;
    const ecc = rsRemainder(dat, generator);
    // Placeholder keeps every block the same length so the interleave loop can
    // index columns directly; it is skipped when emitting.
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return result;
}

function alignmentPatternPositions(ver: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const size = ver * 4 + 17;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  readonly isFunction: boolean[][];

  constructor(readonly version: number) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
  }

  setFunctionModule(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  drawFunctionPatterns(ecl: EcLevel): void {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const positions = alignmentPatternPositions(this.version);
    const n = positions.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corner = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
        if (!corner) this.drawAlignmentPattern(positions[i], positions[j]);
      }
    }

    this.drawFormatBits(ecl, 0);
    this.drawVersionBits();
  }

  drawFormatBits(ecl: EcLevel, mask: number): void {
    const data = (EC_FORMAT_BITS[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = (((data << 10) | rem) ^ 0x5412) & 0x7fff;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;

    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, bit(i));
    this.setFunctionModule(8, 7, bit(6));
    this.setFunctionModule(8, 8, bit(7));
    this.setFunctionModule(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, bit(i));
    this.setFunctionModule(8, this.size - 8, true);
  }

  drawVersionBits(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, dark);
      this.setFunctionModule(b, a, dark);
    }
  }

  drawCodewords(codewords: readonly number[]): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < codewords.length * 8) {
            this.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0; break;
          default: throw new RangeError('mask out of range');
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  penaltyScore(): number {
    const N1 = 3, N2 = 3, N3 = 40, N4 = 10;
    let result = 0;
    const finder = [true, false, true, true, true, false, true];

    const runPenalty = (line: boolean[]): number => {
      let score = 0;
      let runLen = 1;
      for (let i = 1; i <= line.length; i++) {
        if (i < line.length && line[i] === line[i - 1]) {
          runLen++;
        } else {
          if (runLen >= 5) score += N1 + (runLen - 5);
          runLen = 1;
        }
      }
      // Rule 3: 1011101 preceded or followed by four light modules.
      for (let i = 0; i + 7 <= line.length; i++) {
        if (!finder.every((v, k) => line[i + k] === v)) continue;
        const before = line.slice(Math.max(0, i - 4), i);
        const after = line.slice(i + 7, i + 11);
        if ((before.length === 4 && before.every((v) => !v)) || (after.length === 4 && after.every((v) => !v))) {
          score += N3;
        }
      }
      return score;
    };

    for (let y = 0; y < this.size; y++) result += runPenalty(this.modules[y]);
    for (let x = 0; x < this.size; x++) result += runPenalty(this.modules.map((row) => row[x]));

    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const c = this.modules[y][x];
        if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1]) {
          result += N2;
        }
      }
    }

    let dark = 0;
    for (const row of this.modules) for (const cell of row) if (cell) dark++;
    const total = this.size * this.size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += Math.max(k, 0) * N4;
    return result;
  }
}

export function encodeQR(text: string, ecLevel: EcLevel = 'M'): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length, ecLevel);
  const dataCodewords = buildDataCodewords(bytes, version, ecLevel);
  const allCodewords = interleaveBlocks(dataCodewords, version, ecLevel);

  const grid = new Grid(version);
  grid.drawFunctionPatterns(ecLevel);
  grid.drawCodewords(allCodewords);

  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    grid.applyMask(mask);
    grid.drawFormatBits(ecLevel, mask);
    const score = grid.penaltyScore();
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    grid.applyMask(mask);
  }
  grid.applyMask(bestMask);
  grid.drawFormatBits(ecLevel, bestMask);
  return grid.modules;
}

export function qrToSvg(matrix: QrMatrix, opts: QrSvgOptions = {}): string {
  const moduleSize = opts.moduleSize ?? 4;
  const margin = opts.margin ?? 4;
  const dark = opts.dark ?? '#000000';
  const light = opts.light ?? '#ffffff';
  const size = matrix.length;
  const dim = (size + margin * 2) * moduleSize;

  const parts: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) parts.push(`M${x + margin} ${y + margin}h1v1h-1z`);
    }
  }
  const title = opts.title ? `<title>${escapeXml(opts.title)}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" ` +
    `viewBox="0 0 ${size + margin * 2} ${size + margin * 2}" shape-rendering="crispEdges" role="img">` +
    title +
    `<rect width="100%" height="100%" fill="${light}"/>` +
    `<path fill="${dark}" d="${parts.join('')}"/>` +
    `</svg>`
  );
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

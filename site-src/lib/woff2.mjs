// TrueType → WOFF2 with no dependencies: Node's own Brotli and the WOFF2
// format's null transforms (W3C WOFF2 §5: glyf/loca transform version 3,
// every other table version 0). Every table is stored as it is in the TTF,
// so the font is byte-for-byte the same once a browser unpacks it; only the
// container and the compression change. A few percent larger than a font
// whose glyf table is transformed, and nothing to install.

import { brotliCompressSync, constants } from "node:zlib";

const tag = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const pad4 = (n) => (n + 3) & ~3;

/** The tables of an sfnt, in its own directory order. */
export function readTables(ttf) {
  const b = ttf;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const flavor = v.getUint32(0);
  if (flavor !== 0x00010000 && flavor !== 0x74727565) throw new Error("not a TrueType font");
  const n = v.getUint16(4);
  const tables = [];
  for (let i = 0; i < n; i++) {
    const e = 12 + i * 16;
    const t = tag(b, e), off = v.getUint32(e + 8), len = v.getUint32(e + 12);
    tables.push({ tag: t, data: b.subarray(off, off + len) });
  }
  return { flavor, tables };
}

function base128(n) {
  const out = [];
  do { out.unshift(n & 0x7f); n = Math.floor(n / 128); } while (n > 0);
  for (let i = 0; i < out.length - 1; i++) out[i] |= 0x80;
  return out;
}

export function ttfToWoff2(ttf) {
  const { flavor, tables } = readTables(ttf);
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const dir = [];
  for (const t of tables) {
    const nullXform = t.tag === "glyf" || t.tag === "loca" ? 3 : 0;
    dir.push((nullXform << 6) | 63, ...[...t.tag].map((c) => c.charCodeAt(0)), ...base128(t.data.length));
  }
  const stream = Buffer.concat(tables.map((t) => t.data));
  const compressed = brotliCompressSync(stream, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_FONT, [constants.BROTLI_PARAM_SIZE_HINT]: stream.length },
  });
  const sfntSize = 12 + 16 * tables.length + tables.reduce((s, t) => s + pad4(t.data.length), 0);
  const length = pad4(48 + dir.length + compressed.length);
  const out = Buffer.alloc(length);
  out.write("wOF2", 0, "latin1");
  out.writeUInt32BE(flavor, 4);
  out.writeUInt32BE(length, 8);
  out.writeUInt16BE(tables.length, 12);
  out.writeUInt16BE(0, 14);
  out.writeUInt32BE(sfntSize, 16);
  out.writeUInt32BE(compressed.length, 20);
  out.writeUInt16BE(1, 24); // font version 1.0 (informational)
  out.writeUInt16BE(0, 26);
  // metadata and private blocks: none (offsets and lengths stay 0)
  Buffer.from(dir).copy(out, 48);
  compressed.copy(out, 48 + dir.length);
  return out;
}

/** The Unicode code points a TrueType font maps (cmap format 4 / 12). */
export function codepoints(ttf) {
  const { tables } = readTables(ttf);
  const cmap = tables.find((t) => t.tag === "cmap")?.data;
  const set = new Set();
  if (!cmap) return set;
  const v = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
  const n = v.getUint16(2);
  for (let i = 0; i < n; i++) {
    const off = v.getUint32(4 + i * 8 + 4);
    const fmt = v.getUint16(off);
    if (fmt === 4) {
      const segX2 = v.getUint16(off + 6), ends = off + 14, starts = ends + segX2 + 2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = v.getUint16(ends + s * 2), start = v.getUint16(starts + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) set.add(c);
      }
    } else if (fmt === 12) {
      const groups = v.getUint32(off + 12);
      for (let g = 0; g < groups; g++) {
        const s = v.getUint32(off + 16 + g * 12), e = v.getUint32(off + 20 + g * 12);
        for (let c = s; c <= e && c - s < 70000; c++) set.add(c);
      }
    }
  }
  return set;
}

// Builds compare/compare.png from compare/punto-8dir-x{1,2,4}.png (run `generate.mjs --scale N` first).
// Rows 1–3: each strip at the same on-screen size (x1 ×4, x2 ×2, x4 ×1, nearest neighbour).
// Row 4: the face at 0° and 45° cropped from each scale and enlarged to the same size.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const file = name => new URL(`compare/${name}`, import.meta.url);
function read(name) {
  const b = readFileSync(file(name)), idat = [];
  let i = 8, w = 0, h = 0;
  while (i < b.length) {
    const len = b.readUInt32BE(i), type = b.toString('ascii', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(d);
    i += 12 + len;
  }
  // generate.mjs writes RGBA with filter 0 on every row.
  const raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) raw.copy(px, y * w * 4, y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1));
  return { w, h, px };
}
function write(name, w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const b = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
    for (const byte of b) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
    const len = Buffer.alloc(4), end = Buffer.alloc(4); len.writeUInt32BE(data.length); end.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, b, end]);
  };
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(w); hdr.writeUInt32BE(h, 4); hdr[8] = 8; hdr[9] = 6;
  writeFileSync(file(name), Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', hdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

const scales = [1, 2, 4], strips = scales.map(s => read(`punto-8dir-x${s}.png`));
const stripW = 96 * 8 * 4, stripH = 128 * 4, gap = 16;
// Face crop in x1 frame pixels: the head, from the top of the skull to the collar.
const crop = { x: 20, y: 20, w: 56, h: 52 }, zoom = 8, cropW = crop.w * zoom, cropH = crop.h * zoom;
const W = Math.max(stripW, 6 * cropW + 5 * gap), H = 3 * (stripH + gap) + cropH;
const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) out.writeUInt32BE(0xfcf4dfff, i * 4);
// Copies a source rectangle into the canvas at (dx, dy), enlarged by k with nearest neighbour.
function blit(img, sx, sy, sw, sh, k, dx, dy) {
  for (let y = 0; y < sh * k; y++) for (let x = 0; x < sw * k; x++) {
    const si = ((sy + Math.floor(y / k)) * img.w + sx + Math.floor(x / k)) * 4;
    if (img.px[si + 3]) img.px.copy(out, ((dy + y) * W + dx + x) * 4, si, si + 4);
  }
}
strips.forEach((img, r) => blit(img, 0, 0, img.w, img.h, 4 / scales[r], 0, r * (stripH + gap)));
strips.forEach((img, r) => {
  const s = scales[r], k = zoom / s;
  [0, 1].forEach((frame, j) => blit(img, (frame * 96 + crop.x) * s, crop.y * s, crop.w * s, crop.h * s, k, (r * 2 + j) * (cropW + gap), 3 * (stripH + gap)));
});
write('compare.png', W, H, out);
console.log(`compare.png ${W} × ${H}`);

// Builds compare/compare.png from compare/punto-8dir-x{1,2,4}.png. After changing shared inputs, regenerate all three scales before running this script.
// Rows 1–3: each strip at the same on-screen size (x1 ×4, x2 ×2, x4 ×1, nearest neighbour).
// Row 4: the face at 0° and 45° cropped from each scale and enlarged to the same size.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { writePng } from './png.mjs';

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
writePng(file('compare.png'), W, H, out);
console.log(`compare.png ${W} × ${H}`);

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { profileCurve } from '../scene-studio/src/vendor/anatomy/lathe.mjs';

// Use the same measured profiles as scene-studio, including its spline interpolation.
const source = readFileSync(new URL('../scene-studio/src/characters.ts', import.meta.url), 'utf8');
function rings(name) {
  const block = source.match(new RegExp(`(?:export )?const ${name}: Ring\\[\\] = \\[([\\s\\S]*?)\\];`));
  if (!block) throw new Error(`No se encontró el perfil ${name}`);
  return [...block[1].matchAll(/\{\s*z:\s*([\d.]+),\s*r:\s*([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2]), true]);
}
const head = profileCurve(rings('puntoHead'));
const body = profileCurve(rings('torso'));
const arm = profileCurve([[43,.1,true],[46,8,true],[54,12.5,true],[67,13.3,true],[82,11,true],[93,.1,true]]);
const css = readFileSync(new URL('../../tokens/vecinoclub.css', import.meta.url), 'utf8');
const token = name => css.match(new RegExp(`--vc-${name}:\\s*(#[\\da-f]+)`, 'i'))[1];

// Palette indices: 0 empty, 1 orange, 2 orange light, 3 orange shadow, 4 ivory, 5 ivory shadow, 6 ink, 7 arm orange.
// Shadow orange is the only tone not taken from tokens: the primary darkened toward ink, flat.
const colors = ['#00000000', token('primary'), token('primary-hover'), '#c4561a', '#f5f4f2', token('placeholder'), token('foreground'), token('primary')];
// Slice materials: 1 orange, 3 orange in shadow, 4 ivory, 6 ink, 7 arm (orange, outlined against the body).
// --scale 1|2|4 multiplies grid resolution and layer count; without it, x2 writes the default outputs.
const scaleArg = process.argv.indexOf('--scale'), scale = scaleArg < 0 ? 2 : Number(process.argv[scaleArg + 1]);
if (![1, 2, 4].includes(scale)) throw new Error('--scale debe ser 1, 2 o 4');
const started = performance.now();
const size = 72 * scale, unit = 1.8 / scale, count = Math.ceil(172 / unit);
const slices = [];
for (let iz = 0; iz < count; iz++) {
  const z = (iz + .5) * unit, layer = [];
  for (let iy = 0; iy < size; iy++) for (let ix = 0; ix < size; ix++) {
    const x = (ix - size / 2 + .5) * unit, y = (iy - size / 2 + .5) * unit;
    const inside = (r, depth) => (x / r) ** 2 + (y / (r * depth)) ** 2 <= 1;
    let c = 0;
    if (z <= 99 && inside(body.radius(z), .82)) c = 1;
    if (z >= 97 && inside(head.radius(z), .925)) c = 1;
    if (z >= 43 && z <= 93) for (const side of [-1, 1]) {
      const cx = side * 74.6 - side * .45 * z, r = arm.radius(z);
      if (((x - cx) / r) ** 2 + (y / (r * 1.36)) ** 2 <= 1) c = 7;
    }
    // Collar: the band of torso tucked under the head stays in shadow from every angle.
    if (c === 1 && z >= 87 && z < 99 && inside(body.radius(z), .82)) c = 3;
    // Seal is a surface material: the frontmost torso voxels inside its circle turn ivory, with no volume of its own.
    if (c === 1 && z <= 99 && inside(body.radius(z), .82) && (x / 20.7) ** 2 + ((z - 65) / 20) ** 2 <= 1
      && y > Math.sqrt(Math.max(0, body.radius(z) ** 2 - x * x)) * .82 - 10) c = 4;
    // Transfer face marks onto the frontmost voxels; one voxel of depth prevents holes.
    if (c && z >= 97) {
      const r = head.radius(z), front = Math.sqrt(Math.max(0, r * r - x * x)) * .925;
      if (y > front - 5 && y <= front + unit) {
        for (const ex of [-17.9, 19.3]) {
          if (((x - ex) / 4.4) ** 2 + ((z - 129.7) / 6.94) ** 2 <= 1) c = 6;
          if (((x - ex - .7) / 1.8) ** 2 + ((z - 132) / 2) ** 2 <= 1) c = 4;
        }
        if (Math.abs(x) <= 9 && Math.abs(z - (116 + 4.12 * ((x - .55) / 8.85) ** 2)) < 1.7) c = 6;
      }
    }
    layer.push(c);
  }
  slices.push(layer);
}

// This exact renderer is embedded in the standalone HTML and used for the PNG strip.
// Pass 1 stacks slices into material and height buffers; pass 2 applies flat screen-space
// shading; pass 3 traces a single 1 px ink outline around the finished silhouette.
function render(slices, angle, s = 1) {
  const w = 96 * s, h = 128 * s, n = 72 * s, base = 113 * s, squash = .35, rise = Math.sqrt(1 - squash * squash), top = slices.length;
  const mat = new Uint8Array(w * h), zb = new Int16Array(w * h).fill(-1), out = new Uint8Array(w * h);
  const a = angle * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
  for (let z = 0; z < top; z++) {
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const rx = px - w / 2, ry = (py - (base - z * rise)) / squash;
      const x = Math.floor(rx * co + ry * si + n / 2);
      const y = Math.floor(-rx * si + ry * co + n / 2);
      if (x >= 0 && x < n && y >= 0 && y < n) {
        const c = slices[z][y * n + x];
        if (c) { mat[py * w + px] = c; zb[py * w + px] = z; }
      }
    }
  }
  const at = (px, py) => px < 0 || py < 0 || px >= w || py >= h ? -1 : zb[py * w + px];
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px, m = mat[i], z = zb[i];
    if (!m) continue;
    if (m === 6 || m === 3) { out[i] = m; continue; }
    // Distances in pixels scale with s so every resolution gets the same shading bands.
    const free = (dx, dy, from, to) => { for (let k = from; k <= to; k++) if (at(px + dx * k, py + dy * k) < 0) return true; return false; };
    let up3 = -1; for (let k = 2 * s; k <= 3 * s; k++) up3 = Math.max(up3, at(px, py - k));
    const edgeR = free(1, 0, 1, 3 * s), edgeL = free(-1, 0, 1, 2 * s);
    // Shadow: under an overhang (head over body, arms over torso), the right flank and the base.
    const shadow = up3 > z + 8 * s || edgeR || z < top * .2;
    // Light: top rim and left flank, only where nothing casts a shadow.
    const light = !shadow && (free(0, -1, 1, 2 * s) || edgeL) && z > top * .3;
    if (m === 4) out[i] = edgeR ? 5 : 4;
    else out[i] = shadow ? 3 : light ? 2 : 1;
    // Where an arm crosses the body, the body pixel turns shadow orange: a soft crease, not an ink line.
    if (m !== 7 && (mat[i - 1] === 7 || mat[i + 1] === 7 || mat[i - w] === 7 || mat[i + w] === 7)) out[i] = 3;
  }
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (mat[py * w + px]) continue;
    if (at(px - 1, py) >= 0 || at(px + 1, py) >= 0 || at(px, py - 1) >= 0 || at(px, py + 1) >= 0) out[py * w + px] = 6;
  }
  return out;
}

function png(path, w, h, indexed) {
  const palette = colors.map(c => c.length === 9 ? [0,0,0,0] : [...c.slice(1).matchAll(/../g)].map(m => parseInt(m[0],16)).concat(255));
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const rgba = palette[indexed[y*w+x]];
    for (let i=0;i<4;i++) raw[y*(w*4+1)+1+x*4+i] = rgba[i];
  }
  function chunk(type, data) {
    const t = Buffer.from(type), b = Buffer.concat([t,data]); let crc = 0xffffffff;
    for (const byte of b) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
    const len = Buffer.alloc(4), end = Buffer.alloc(4); len.writeUInt32BE(data.length); end.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len,b,end]);
  }
  const hdr=Buffer.alloc(13); hdr.writeUInt32BE(w); hdr.writeUInt32BE(h,4); hdr[8]=8; hdr[9]=6;
  writeFileSync(new URL(path, import.meta.url), Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
const fw = 96 * scale, fh = 128 * scale, strip = new Uint8Array(fw*8*fh);
for (let i=0;i<8;i++) { const frame=render(slices,i*45,scale); for(let y=0;y<fh;y++) strip.set(frame.slice(y*fw,(y+1)*fw),y*fw*8+i*fw); }
if (scaleArg >= 0) {
  mkdirSync(new URL('compare/', import.meta.url), { recursive: true });
  png(`compare/punto-8dir-x${scale}.png`, fw*8, fh, strip);
  console.log(`x${scale}: ${count} cortes de ${size} px en ${((performance.now() - started) / 1000).toFixed(1)} s`);
  process.exit(0);
}
// Slice sheet: raw materials, bottom slice first, 16 per row.
const cols = 16, rowsN = Math.ceil(count / cols), sheet = new Uint8Array(size * cols * size * rowsN);
for (let z=0;z<count;z++) {
  const ox = (z % cols) * size, oy = Math.floor(z / cols) * size;
  for (let y=0;y<size;y++) sheet.set(slices[z].slice(y*size,(y+1)*size),(oy+y)*size*cols+ox);
}
png('punto-slices.png', size*cols, size*rowsN, sheet);
png('punto-8dir.png',fw*8,fh,strip);
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Punto · sprite stacking</title><style>body{margin:0;background:#f3e6cf;color:#171717;font:16px system-ui;display:grid;place-items:center;min-height:100vh}main{width:min(90vw,560px);text-align:center}canvas{width:min(72vw,288px);height:auto;image-rendering:pixelated;background:#fcf4df;border-radius:28px}label{display:block;margin:1rem}input{width:min(80%,360px);accent-color:#fb772a}button{border:0;border-radius:20px;padding:.7rem 1.2rem;background:#171717;color:#fff;font:inherit}p{color:#59554e}</style><main><h1>Punto en rotación</h1><p>Experimento de sprite stacking · ${count} cortes de ${size} px</p><canvas width="${fw}" height="${fh}" aria-label="Punto girando"></canvas><label for="angle">Ángulo: <output>0°</output></label><input id="angle" type="range" min="0" max="359" value="0"><p><button type="button">Pausar</button></p></main><script>const slices=${JSON.stringify(slices)}, colors=${JSON.stringify(colors)};const render=${render.toString()};const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),slider=document.querySelector('input'),out=document.querySelector('output'),button=document.querySelector('button');let angle=0,playing=true,last=0;function draw(){const p=render(slices,angle,${scale}),im=ctx.createImageData(canvas.width,canvas.height);for(let i=0;i<p.length;i++){if(!p[i])continue;const c=colors[p[i]];im.data[i*4]=parseInt(c.slice(1,3),16);im.data[i*4+1]=parseInt(c.slice(3,5),16);im.data[i*4+2]=parseInt(c.slice(5,7),16);im.data[i*4+3]=255}ctx.putImageData(im,0,0);slider.value=Math.round(angle)%360;out.value=slider.value+'°'}slider.oninput=()=>{angle=Number(slider.value);playing=false;button.textContent='Girar';draw()};button.onclick=()=>{playing=!playing;button.textContent=playing?'Pausar':'Girar'};function tick(t){if(playing&&last){angle=(angle+Math.min(t-last,50)*.025)%360;draw()}last=t;requestAnimationFrame(tick)}draw();requestAnimationFrame(tick);</script></html>`;
writeFileSync(new URL('index.html', import.meta.url),html);
console.log(`Generados ${count} cortes de ${size} px, tira de 8 ángulos e index.html`);

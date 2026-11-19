import { readFileSync, writeFileSync } from 'node:fs';
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
const orange = css.match(/--vc-primary:\s*(#[\da-f]+)/i)[1];
const colors = ['#00000000', orange, '#f5f4f2', '#171717'];
const size = 32, count = 64, unit = 172 / count;
const slices = [];
for (let iz = 0; iz < count; iz++) {
  const z = (iz + .5) * unit, layer = [];
  for (let iy = 0; iy < size; iy++) for (let ix = 0; ix < size; ix++) {
    const x = (ix - 15.5) * unit, y = (iy - 15.5) * unit;
    const inside = (r, depth) => (x / r) ** 2 + (y / (r * depth)) ** 2 <= 1;
    let c = 0;
    if (z <= 99 && inside(body.radius(z), .82)) c = 1;
    if (z >= 97 && inside(head.radius(z), .925)) c = 1;
    if (z >= 43 && z <= 93) for (const side of [-1, 1]) {
      const cx = side * 74.6 - side * .45 * z, r = arm.radius(z);
      if (((x - cx) / r) ** 2 + (y / (r * 1.36)) ** 2 <= 1) c = 1;
    }
    // Seal is the shallow ellipsoid used in scene-studio.
    if ((x / 20.7) ** 2 + ((y - 34.3) / 4.3) ** 2 + ((z - 65) / 20) ** 2 <= 1) c = 2;
    // Transfer face marks onto the frontmost voxels; one voxel of depth prevents holes.
    if (c && z >= 97) {
      const r = head.radius(z), front = Math.sqrt(Math.max(0, r * r - x * x)) * .925;
      if (y > front - unit * 1.5 && y <= front + unit) {
        for (const ex of [-17.9, 19.3]) {
          if (((x - ex) / 4.4) ** 2 + ((z - 129.7) / 6.94) ** 2 <= 1) c = 3;
          if (((x - ex - .7) / 1.8) ** 2 + ((z - 132) / 2) ** 2 <= 1) c = 2;
        }
        if (Math.abs(x) <= 9 && Math.abs(z - (116 + 4.12 * ((x - .55) / 8.85) ** 2)) < 1.7) c = 3;
      }
    }
    layer.push(c);
  }
  slices.push(layer);
}

// This exact renderer is embedded in the standalone HTML and used for the PNG strip.
function render(slices, angle) {
  const w = 48, h = 88, n = 32, pixels = new Uint8Array(w * h);
  const a = angle * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), squash = .5;
  for (let z = 0; z < slices.length; z++) {
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const rx = px - 24, ry = (py - (70 - z)) / squash;
      const x = Math.floor(rx * co + ry * si + n / 2);
      const y = Math.floor(-rx * si + ry * co + n / 2);
      if (x >= 0 && x < n && y >= 0 && y < n) {
        const c = slices[z][y * n + x];
        if (c) pixels[py * w + px] = c;
      }
    }
  }
  return pixels;
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
const sheet = new Uint8Array(size * count * size);
for (let z=0;z<count;z++) for(let y=0;y<size;y++) sheet.set(slices[z].slice(y*size,(y+1)*size),y*size*count+z*size);
png('punto-slices.png', size*count, size, sheet);
const strip = new Uint8Array(48*8*88);
for (let i=0;i<8;i++) { const frame=render(slices,i*45); for(let y=0;y<88;y++) strip.set(frame.slice(y*48,(y+1)*48),y*48*8+i*48); }
png('punto-8dir.png',48*8,88,strip);
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Punto · sprite stacking</title><style>body{margin:0;background:#f3e6cf;color:#171717;font:16px system-ui;display:grid;place-items:center;min-height:100vh}main{width:min(90vw,560px);text-align:center}canvas{width:min(72vw,288px);height:auto;image-rendering:pixelated;background:#fcf4df;border-radius:28px}label{display:block;margin:1rem}input{width:min(80%,360px);accent-color:#fb772a}button{border:0;border-radius:20px;padding:.7rem 1.2rem;background:#171717;color:#fff;font:inherit}p{color:#59554e}</style><main><h1>Punto en rotación</h1><p>Experimento de sprite stacking · 64 cortes</p><canvas width="48" height="88" aria-label="Punto girando"></canvas><label for="angle">Ángulo: <output>0°</output></label><input id="angle" type="range" min="0" max="359" value="0"><p><button type="button">Pausar</button></p></main><script>const slices=${JSON.stringify(slices)}, colors=${JSON.stringify(colors)};const render=${render.toString()};const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),slider=document.querySelector('input'),out=document.querySelector('output'),button=document.querySelector('button');let angle=0,playing=true,last=0;function draw(){const p=render(slices,angle),im=ctx.createImageData(48,88);for(let i=0;i<p.length;i++){if(!p[i])continue;const c=colors[p[i]];im.data[i*4]=parseInt(c.slice(1,3),16);im.data[i*4+1]=parseInt(c.slice(3,5),16);im.data[i*4+2]=parseInt(c.slice(5,7),16);im.data[i*4+3]=255}ctx.putImageData(im,0,0);slider.value=Math.round(angle)%360;out.value=slider.value+'°'}slider.oninput=()=>{angle=Number(slider.value);playing=false;button.textContent='Girar';draw()};button.onclick=()=>{playing=!playing;button.textContent=playing?'Pausar':'Girar'};function tick(t){if(playing&&last){angle=(angle+Math.min(t-last,50)*.025)%360;draw()}last=t;requestAnimationFrame(tick)}draw();requestAnimationFrame(tick);</script></html>`;
writeFileSync(new URL('index.html', import.meta.url),html);
console.log('Generados cortes, tira de 8 ángulos e index.html');

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

export function writePng(path, w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const b = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
    for (const byte of b) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
    const len = Buffer.alloc(4), end = Buffer.alloc(4); len.writeUInt32BE(data.length); end.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, b, end]);
  };
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(w); hdr.writeUInt32BE(h, 4); hdr[8] = 8; hdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', hdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

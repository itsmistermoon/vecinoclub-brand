// Adapted from iso-figure, MIT © 2026 Tolga Cohce. One projection for every scene object.
export type V3 = [number, number, number];
const C = Math.cos(Math.PI / 6),
  S = Math.sin(Math.PI / 6);
export const P = (x: number, y: number, z: number) => [
  (x - y) * C + 500,
  (x + y) * S - z + 405,
];
const D = (x: number, y: number, z: number) => [(x - y) * C, (x + y) * S - z];
const plane = (O: V3, U: V3, V: V3) => {
  const o = P(...O),
    u = D(...U),
    v = D(...V);
  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`;
};
export const TOP = (x: number, y: number, z: number) =>
  plane([x, y, z], [1, 0, 0], [0, 1, 0]);
export const FRONT = (x: number, y: number, z: number) =>
  plane([x, y, z], [1, 0, 0], [0, 0, -1]);
export const SIDE = (x: number, y: number, z: number) =>
  plane([x, y, z], [0, -1, 0], [0, 0, -1]);
export const rect = (t: string, w: number, h: number, r = 0, cls = "face") =>
  `<g transform="${t}"><rect class="${cls}" width="${w}" height="${h}" rx="${r}"/></g>`;
export const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  r = 0,
) =>
  rect(SIDE(x + w, y + d, z + h), d, h, Math.min(r, h / 4), "face side") +
  rect(FRONT(x, y + d, z + h), w, h, Math.min(r, h / 4)) +
  rect(TOP(x, y, z + h), w, d, r, "face top");
export const inPlane = (t: string, body: string) =>
  `<g transform="${t}">${body}</g>`;

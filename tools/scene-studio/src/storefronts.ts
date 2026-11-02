import { P, type V3 } from "./projection";
import type { Element, ShopVariant } from "./model";

// Every storefront is assembled in world space, then yawed before projection.
// Visible planes and painter order are recomputed for each of the four views.
const designs: Record<
  ShopVariant,
  { w: number; d: number; h: number; icon: string }
> = {
  generico: { w: 150, d: 110, h: 115, icon: "M-28 0H28" },
  cafeteria: {
    w: 132,
    d: 104,
    h: 110,
    icon: "M-15 -8h25v12q-12 14-25 0zM10 -5h8q10 8-8 10M-17 14h38M-7 -19v6M3 -21v8",
  },
  panaderia: {
    w: 168,
    d: 110,
    h: 104,
    icon: "M-30 6Q-30 -13-15 -13h30q15 0 15 19zM-15 -7l5 9M-1 -7l5 9M13 -7l5 9",
  },
  floreria: {
    w: 140,
    d: 104,
    h: 94,
    icon: "M0 0v19M0 12q-15 0-15-10q15 0 15 10M0 7Q15 7 15-3Q0-3 0 7M0-5C-20-2-20-17-6-17C-5-33 10-30 10-17C27-20 27-3 12-4C13 12-3 12 0-5Z",
  },
  almacen: {
    w: 184,
    d: 126,
    h: 124,
    icon: "M-24 -12h8l6 24h32l6-19H-13M-5 18a3 3 0 1 0 .1 0M18 18a3 3 0 1 0 .1 0M0-1h19",
  },
};
export function storefront(e: Element): string {
  const { w, d, h, icon } = designs[e.shopVariant];
  const angle =
    ({ SO: 0, SE: -90, NE: 180, NO: 90 }[e.orientation] * Math.PI) / 180;
  const turn = ([x, y, z]: V3): V3 => [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
    z,
  ];
  const project = (v: V3) => P(...turn(v));
  const planes: { depth: number; html: string }[] = [];
  function plane(
    o: V3,
    u: V3,
    v: V3,
    normal: V3,
    body: string,
    width: number,
    height: number,
  ) {
    const n = turn(normal);
    if (n[0] + n[1] + n[2] * Math.SQRT2 < 0.001) return;
    const a = project(o),
      b = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]),
      c = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
    const center = turn([
      o[0] + (u[0] * width) / 2 + (v[0] * height) / 2,
      o[1] + (u[1] * width) / 2 + (v[1] * height) / 2,
      o[2] + (u[2] * width) / 2 + (v[2] * height) / 2,
    ]);
    planes.push({
      depth: center[0] + center[1] + Math.SQRT2 * center[2],
      html: `<g transform="matrix(${b[0] - a[0]} ${b[1] - a[1]} ${c[0] - a[0]} ${c[1] - a[1]} ${a[0]} ${a[1]})">${body}</g>`,
    });
  }
  function block(
    x: number,
    y: number,
    z: number,
    bw: number,
    bd: number,
    bh: number,
    front = "",
    top = "",
    cls = "",
    side = "",
  ) {
    const face = (a: number, b: number, shade = "") =>
      `<rect class="face ${shade}" width="${a}" height="${b}" rx="1"/>`;
    const start = planes.length;
    plane(
      [x, y + bd, z + bh],
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0],
      face(bw, bh) + front,
      bw,
      bh,
    );
    plane(
      [x + bw, y, z + bh],
      [-1, 0, 0],
      [0, 0, -1],
      [0, -1, 0],
      face(bw, bh, "side") +
        `<path class="detail extras" d="M12 14h${bw - 24}M12 24h${bw - 24}"/>`,
      bw,
      bh,
    );
    plane(
      [x + bw, y + bd, z + bh],
      [0, -1, 0],
      [0, 0, -1],
      [1, 0, 0],
      face(bd, bh, "side") + side,
      bd,
      bh,
    );
    plane(
      [x, y, z + bh],
      [0, 1, 0],
      [0, 0, -1],
      [-1, 0, 0],
      face(bd, bh, "side") + side,
      bd,
      bh,
    );
    plane(
      [x, y, z + bh],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      face(bw, bd, "top") + top,
      bw,
      bd,
    );
    if (cls)
      for (let i = start; i < planes.length; i++)
        planes[i].html = `<g class="${cls}">${planes[i].html}</g>`;
  }
  const x = -w / 2,
    y = -d / 2,
    windowW = w - 61;
  const front = `<rect class="detail" x="10" y="41" width="${windowW}" height="${h - 52}" rx="2"/><path class="detail extras" d="M${10 + windowW / 2} 42v${h - 54}M11 ${h - 26}h${windowW - 2}"/><rect class="detail" x="${w - 43}" y="35" width="33" height="${h - 35}" rx="2"/><path class="detail" d="M${w - 37} 43h21v${h - 67}h-21zM${w - 35} ${h - 16}v6"/><rect class="face" x="${w / 2 - 42}" y="-7" width="84" height="34" rx="3"/><g class="detail extras" transform="translate(${w / 2} 10) scale(.65)"><path d="${icon}"/></g>`;
  const side = `<rect class="detail extras" x="18" y="40" width="${d - 36}" height="35" rx="2"/><path class="detail extras" d="M${d / 2} 41v33"/>`;
  block(x, y, 0, w, d, h, front, "", "", side);
  block(
    x - 5,
    y - 5,
    h,
    w + 10,
    d + 10,
    7,
    "",
    `<rect class="detail extras" x="10" y="10" width="${w - 10}" height="${d - 10}" rx="2"/>`,
  );
  if (e.shopVariant === "panaderia")
    block(x + 12, y + 12, h + 7, w - 24, d - 24, 13);
  if (e.shopVariant === "almacen")
    block(
      x + 20,
      y + 18,
      h + 7,
      38,
      38,
      19,
      "",
      `<path class="detail extras" d="M6 8h26M6 15h26M6 22h26M6 29h26"/>`,
    );
  const stripes = (width: number, height: number) =>
    `<rect class="face" width="${width}" height="${height}"/>` +
    Array.from(
      { length: 8 },
      (_, i) =>
        `<rect class="${i % 2 ? "face" : "accent"}" x="${(i * width) / 8}" width="${width / 8}" height="${height}"/>`,
    ).join("");
  const aw = w + 6,
    ay = y + d,
    az = h - 29;
  const start = planes.length;
  plane(
    [x - 3, ay, az + 5],
    [1, 0, 0],
    [0, 1, -0.18],
    [0, 0.18, 1],
    stripes(aw, 29),
    aw,
    29,
  );
  plane(
    [x - 3, ay + 29, az - 0.22],
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
    stripes(aw, 10),
    aw,
    10,
  );
  for (let i = start; i < planes.length; i++)
    planes[i].html = `<g class="awning">${planes[i].html}</g>`;
  if (e.shopVariant === "cafeteria") {
    for (const px of [x + 20, x + 53])
      block(px, ay + 39, 0, 18, 18, 25, "", "", "extras");
  }
  if (e.shopVariant === "floreria")
    for (let i = 0; i < 3; i++) {
      block(
        x + 8 + i * 28,
        ay + 36,
        0,
        22,
        18,
        17,
        `<path class="detail" d="M11 1v-19M11-10L2-16M11-13l9-8"/>`,
        "",
        "extras",
      );
    }
  if (e.shopVariant === "almacen")
    for (let i = 0; i < 2; i++)
      block(
        x + w + 8,
        y + d - 26 - i * 28,
        0,
        25,
        24,
        22,
        `<path class="detail" d="M3 4l19 14M3 18L22 4"/>`,
        "",
        "extras",
      );
  return planes
    .sort((a, b) => a.depth - b.depth)
    .map((p) => p.html)
    .join("");
}

import type { V3 } from "./projection";
import * as kit from "./vendor/anatomy/iso-kit.mjs";
import * as lathe from "./vendor/anatomy/lathe.mjs";
import type { Element } from "./model";
// Local +y is the character's front. NE/NO show its back, SE/SO its front.
const turns = { SO: 0, SE: -Math.PI / 2, NE: Math.PI, NO: Math.PI / 2 };
const dot = (a: V3, b: V3) => a.reduce((sum, v, i) => sum + v * b[i], 0);
function tint(hex: string, amount: number) {
  const v = hex.match(/[0-9a-f]{2}/gi)!.map((s) => parseInt(s, 16));
  return (
    "#" +
    v
      .map((n) =>
        Math.round(amount > 0 ? n + (255 - n) * amount : n * (1 + amount))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
const pointsD = (points: number[][], close = true) =>
  points
    .map((p, i) => `${i ? "L" : "M"}${p.map((v) => v.toFixed(3)).join(" ")}`)
    .join(" ") + (close ? "Z" : "");
type Ring = { z: number; rx: number; ry: number; cx?: number; cy?: number };
// Anatomy curves, configured to exactly match projection.ts (true 30° screen axes).
export const characterProjection = {
  origin: [500, 230],
  scale: Math.sqrt(1.5 / 1.6),
  azimuth: 45,
  elevation: (Math.atan(1 / Math.sqrt(2)) * 180) / Math.PI,
};
function renderer(e: Element) {
  const angle = turns[e.orientation],
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  const rotate = ([x, y, z]: V3): V3 => [
    x * cos - y * sin,
    x * sin + y * cos,
    z,
  ];
  const project = (p: V3) => kit.iso(rotate(p), characterProjection);
  const faces: { depth: number; svg: string }[] = [];
  const palette = [-0.18, -0.1, -0.03, 0.04, 0.12].map((value) =>
    tint(e.fill, value),
  );
  function polygon(points: V3[], color = e.fill, flip = false) {
    let n = lathe.unit3(
      lathe.cross3(
        lathe.sub3(points[1], points[0]),
        lathe.sub3(points[2], points[0]),
      ),
    );
    if (flip) n = n.map((v) => -v);
    const rn = rotate(n as V3);
    if (lathe.dot3(rn, lathe.viewOf(characterProjection)) <= 0) return;
    faces.push({
      depth:
        points.reduce((sum, p) => sum + dot(rotate(p), [1, 1, 1]), 0) /
        points.length,
      svg: `<path data-plane="surface" d="${kit.pathOf(points.map(project), true)}" fill="${color === e.fill ? palette[lathe.toneOf(rn, characterProjection)] : color}"/>`,
    });
  }
  function surface(rings: Ring[]) {
    const cx = rings.reduce((sum, r) => sum + (r.cx || 0), 0) / rings.length,
      cy = rings[0].cy || 0,
      wide = rings.filter((r) => r.rx > 1);
    const ratio = wide.reduce((sum, r) => sum + r.ry / r.rx, 0) / wide.length;
    const frame = {
      o: rotate([cx, cy, 0]),
      a: [0, 0, 1],
      u: rotate([1, 0, 0]),
      v: rotate([0, ratio, 0]),
    };
    const paths = lathe.lathe(
      rings.map((r) => [r.z, r.rx, true]),
      frame,
      characterProjection,
      { rims: "none", steps: 64 },
    );
    let svg = kit.solidSvg(paths, { crease: "none" });
    const colors = palette
      .map((color, index) => `--shade-${index}:${color}`)
      .join(";");
    svg = svg.replace("<g", `<g data-plane="lathe" style="${colors}"`);
    faces.push({
      depth:
        rings.reduce((sum, r) => sum + r.z, 0) / rings.length +
        dot(rotate([cx, cy, 0]), [1, 1, 1]),
      svg,
    });
  }
  function disk(
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    rz: number,
    color: string,
  ) {
    if (dot(rotate([0, 1, 0]), [1, 1, 1]) <= 0) return;
    faces.push({
      depth: 1000 + cz,
      svg: `<path d="${kit.pathOf(
        Array.from({ length: 40 }, (_, i) =>
          project([
            cx + Math.cos((i / 40) * Math.PI * 2) * rx,
            cy,
            cz + Math.sin((i / 40) * Math.PI * 2) * rz,
          ]),
        ),
        true,
      )}" fill="${color}"/>`,
    });
  }
  return {
    rotate,
    project,
    polygon,
    surface,
    disk,
    faces,
    finish: () =>
      faces
        .sort((a, b) => a.depth - b.depth)
        .map((f) => f.svg)
        .join(""),
  };
}
export function character(e: Element) {
  const r = renderer(e);
  let hoverFill = "";
  if (e.kind === "punto") {
    // Dominant head 78 units; continuous torso at most 58; one rounded pin tip; no legs.
    r.surface([
      { z: 0, rx: 1.5, ry: 1.5 },
      { z: 12, rx: 8, ry: 6 },
      { z: 30, rx: 18, ry: 12 },
      { z: 52, rx: 27, ry: 18 },
      { z: 73, rx: 29, ry: 20 },
      { z: 88, rx: 25, ry: 17 },
      { z: 94, rx: 14, ry: 11 },
      { z: 95, rx: 0.1, ry: 0.1 },
    ]);
    for (const side of [-1, 1])
      r.surface([
        { z: 52, rx: 0.1, ry: 0.1, cx: side * 37 },
        { z: 55, rx: 7, ry: 8, cx: side * 37 },
        { z: 65, rx: 9, ry: 10, cx: side * 35 },
        { z: 76, rx: 8, ry: 9, cx: side * 31 },
        { z: 83, rx: 0.1, ry: 0.1, cx: side * 28 },
      ]);
    r.surface([
      { z: 94, rx: 0.1, ry: 0.1 },
      { z: 96, rx: 24, ry: 18 },
      { z: 103, rx: 35, ry: 25 },
      { z: 116, rx: 39, ry: 28 },
      { z: 134, rx: 38, ry: 28 },
      { z: 151, rx: 32, ry: 24 },
      { z: 163, rx: 20, ry: 15 },
      { z: 170, rx: 0.1, ry: 0.1 },
    ]);
    r.disk(0, 20.2, 65, 12.5, 12.5, e.accent);
    for (const x of [-13, 13]) {
      r.disk(x, 26.6, 130, 3.5, 5.8, "#171717");
      r.disk(x + 0.7, 27, 132, 1, 1.2, "#f5f4f2");
    }
    if (r.rotate([0, 1, 0]).reduce((a, b) => a + b, 0) > 0) {
      const mouth = Array.from({ length: 15 }, (_, i): V3 => {
        const x = -7 + i;
        return [x, 28.4, 115 + 3 * (x / 7) ** 2];
      });
      r.faces.push({
        depth: 1000,
        svg: `<path d="${pointsD(mouth.map(r.project), false)}" stroke="#171717" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
      });
    }
  } else {
    // The canonical isotipo path in asset coordinates, uniformly scaled and extruded.
    // Original path coordinates are preserved, including the circular aperture.
    const outerCubics = [
      [
        [231.824, 4101.191],
        [231.824, 4009.167],
        [313.421, 3954.788],
        [379.229, 3954.788],
      ],
      [
        [379.229, 3954.788],
        [451.512, 3954.788],
        [526.635, 4013.271],
        [526.635, 4101.191],
      ],
      [
        [526.635, 4101.191],
        [526.635, 4189.111],
        [419.987, 4319.231],
        [379.229, 4319.231],
      ],
      [
        [379.229, 4319.231],
        [338.471, 4319.231],
        [231.824, 4193.215],
        [231.824, 4101.191],
      ],
    ];
    const outer = outerCubics.flatMap((curve) =>
      Array.from({ length: 16 }, (_, i) => {
        const t = i / 16;
        return [0, 1].map(
          (k) =>
            (1 - t) ** 3 * curve[0][k] +
            3 * (1 - t) ** 2 * t * curve[1][k] +
            3 * (1 - t) * t * t * curve[2][k] +
            t ** 3 * curve[3][k],
        );
      }),
    );
    const hole = Array.from({ length: 64 }, (_, i) => [
      379.229 + 56.142 * Math.cos((i / 64) * Math.PI * 2),
      4102.194 + 56.142 * Math.sin((i / 64) * Math.PI * 2),
    ]);
    const local = (p: number[], depth: number): V3 => [
      (p[0] - 379.229) / 3,
      depth,
      (4319.231 - p[1]) / 3,
    ];
    const cap = (points: number[][], depth: number) =>
      pointsD(points.map((p) => r.project(local(p, depth))));
    function extrude(out: number[][], inside: number[][] = []) {
      for (const depth of [-9, 9]) {
        const front =
          r.rotate([0, Math.sign(depth), 0]).reduce((a, b) => a + b, 0) > 0;
        if (front) {
          const d = cap(out, depth) + (inside.length ? cap(inside, depth) : "");
          r.faces.push({
            depth: 900,
            svg: `<path class="mesh-face" data-plane="cap" fill-rule="evenodd" d="${d}" fill="${tint(e.fill, depth > 0 ? 0 : -0.12)}" stroke="var(--stroke)" stroke-width="var(--line)" vector-effect="non-scaling-stroke"/>`,
          });
          hoverFill += `<path d="${cap(out, depth)}" fill="black"/>`;
        }
      }
      for (const [contour, hole] of [
        [out, false],
        [inside, true],
      ] as [number[][], boolean][]) {
        for (let i = 0; i < contour.length; i++) {
          const a = contour[i],
            b = contour[(i + 1) % contour.length];
          r.polygon(
            [local(a, -9), local(b, -9), local(b, 9), local(a, 9)],
            e.fill,
            hole,
          );
        }
      }
    }
    extrude(outer, hole);
    // The detached canonical dot: diameter ~52 local units, gap ~9 above the pin.
    const dotCircle = Array.from({ length: 64 }, (_, i) => [
      379.229 + 78 * Math.cos((i / 64) * Math.PI * 2),
      4319.231 - (156 + 26 * Math.sin((i / 64) * Math.PI * 2)) * 3,
    ]).reverse();
    extrude(dotCircle);
  }
  return { body: r.finish(), hoverFill };
}

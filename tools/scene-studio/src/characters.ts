import type { V3 } from "./projection";
import * as kit from "./vendor/anatomy/iso-kit.mjs";
import * as lathe from "./vendor/anatomy/lathe.mjs";
import type { Element } from "./model";
// Local +y is the character's front. NE/NO show its back, SE/SO its front.
const turns = { SO: 0, SE: -Math.PI / 2, NE: Math.PI, NO: Math.PI / 2 };
const dot = (a: V3, b: V3) => a.reduce((sum, v, i) => sum + v * b[i], 0);
function tint(hex: string, amount: number) {
  const rgb =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(1);
  const v = rgb.match(/../g)!.map((s) => parseInt(s, 16));
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
type Ring = { z: number; r: number; cx?: number; cy?: number };
export const puntoHead: Ring[] = [
  { z: 97, r: 24.5 },
  { z: 98, r: 30 },
  { z: 102, r: 36 },
  { z: 111, r: 42 },
  { z: 125, r: 45.2 },
  { z: 137, r: 45.5 },
  { z: 150, r: 42 },
  { z: 162, r: 32 },
  { z: 170, r: 14 },
  { z: 172, r: 0.1 },
];
const torso: Ring[] = [
  { z: 0, r: 0.1 },
  { z: 1.5, r: 4.8 },
  { z: 5.16, r: 8.62 },
  { z: 12, r: 13.8 },
  { z: 25, r: 23 },
  { z: 37.84, r: 29.65 },
  { z: 53, r: 35.7 },
  { z: 72, r: 39.5 },
  { z: 87, r: 36 },
  { z: 97, r: 26 },
  { z: 99, r: 0.1 },
];
// Anatomy curves, configured to exactly match projection.ts (true 30° screen axes).
export const characterProjection = {
  origin: [500, 230],
  scale: Math.sqrt(1.5 / 1.6),
  azimuth: 45,
  elevation: (Math.atan(1 / Math.sqrt(2)) * 180) / Math.PI,
};
function renderer(e: Element, projection = characterProjection, spin = 0) {
  const angle = turns[e.orientation] + spin,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  const rotate = ([x, y, z]: V3): V3 => [
    x * cos - y * sin,
    x * sin + y * cos,
    z,
  ];
  const project = (p: V3) => kit.iso(rotate(p), projection);
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
    if (lathe.dot3(rn, lathe.viewOf(projection)) <= 0) return;
    faces.push({
      depth:
        points.reduce((sum, p) => sum + kit.depthOf(rotate(p), projection), 0) /
        points.length,
      svg: `<path data-plane="surface" d="${kit.pathOf(points.map(project), true)}" fill="${color === e.fill ? palette[lathe.toneOf(rn, projection)] : color}"/>`,
    });
  }
  function surface(
    rings: Ring[],
    part = "torso",
    depthScale = 1,
    color = e.fill,
    lean = 0,
  ) {
    const cx = rings.reduce((sum, r) => sum + (r.cx || 0), 0) / rings.length;
    const cy = rings[0].cy || 0;
    const frame = {
      o: rotate([cx, cy, 0]),
      a: rotate([lean, 0, 1]),
      u: rotate([1, 0, 0]),
      v: rotate([0, depthScale, 0]),
    };
    const paths = lathe.lathe(
      rings.map((r) => [r.z, r.r, true]),
      frame,
      projection,
      { rims: "none", steps: 64 },
    );
    let svg = kit.solidSvg(paths, { crease: "none" });
    const colors = (
      color === e.fill
        ? palette
        : [-0.12, -0.06, 0, 0.03, 0.06].map((amount) => tint(color, amount))
    )
      .map((color, index) => `--shade-${index}:${color}`)
      .join(";");
    svg = svg.replace(
      "<g",
      `<g data-part="${part}" data-plane="lathe" style="--fill:${color};${part === "seal" ? "--line:0;" : ""}${colors}"`,
    );
    faces.push({
      depth: kit.depthOf(
        rotate([cx, cy, rings.reduce((sum, r) => sum + r.z, 0) / rings.length]),
        projection,
      ),
      svg,
    });
  }
  const visible = (p: V3, front: (x: number, z: number) => V3) => {
    const delta = 0.01,
      a = front(p[0] + delta, p[2]),
      b = front(p[0] - delta, p[2]),
      c = front(p[0], p[2] + delta),
      d = front(p[0], p[2] - delta);
    return (
      dot(
        rotate([-(a[1] - b[1]) / (2 * delta), 1, -(c[1] - d[1]) / (2 * delta)]),
        lathe.viewOf(projection) as V3,
      ) > 0
    );
  };
  function mark(
    cx: number,
    cz: number,
    rx: number,
    rz: number,
    color: string,
    front: (x: number, z: number) => V3,
    part = "mark",
    lean = 0,
    samples = 48,
  ) {
    const points = Array.from({ length: samples }, (_, i) => {
      const u = Math.cos((i / samples) * Math.PI * 2) * rx,
        v = Math.sin((i / samples) * Math.PI * 2) * rz;
      return front(
        cx + u * Math.cos(lean) - v * Math.sin(lean),
        cz + u * Math.sin(lean) + v * Math.cos(lean),
      );
    });
    const shown = points.filter((p) => visible(p, front));
    if (shown.length < 3) return;
    faces.push({
      depth: 1000 + cz,
      svg: `<path data-part="${part}" d="${kit.pathOf(shown.map(project), true)}" fill="${color}"/>`,
    });
  }
  return {
    rotate,
    project,
    polygon,
    surface,
    visible,
    mark,
    faces,
    finish: () =>
      faces
        .sort((a, b) => a.depth - b.depth)
        .map((f) => f.svg)
        .join(""),
  };
}
// Inverted drop: pointed tip down, soft round bulb up. A body of revolution looks
// identical at every turn angle, so only the eyes are redrawn per spin frame.
const gotaProfile: Ring[] = [
  { z: 0, r: 0.1 },
  { z: 1.5, r: 3.5 },
  { z: 8, r: 7 },
  { z: 16, r: 11.5 },
  { z: 28, r: 19 },
  { z: 42, r: 28.5 },
  { z: 58, r: 37.5 },
  { z: 74, r: 44 },
  { z: 90, r: 46.5 },
  { z: 106, r: 44 },
  { z: 120, r: 38 },
  { z: 132, r: 29 },
  { z: 142, r: 18 },
  { z: 150, r: 8 },
  { z: 154, r: 0.1 },
];
export const GOTA_FRAMES = 90;
function gota(e: Element, projection: typeof characterProjection) {
  const r = renderer(e, projection);
  r.surface(gotaProfile, "body", 1);
  const outline = r.finish();
  const curve = lathe.profileCurve(gotaProfile.map((p) => [p.z, p.r, true]));
  const front = (x: number, z: number): V3 => [
    x,
    Math.sqrt(Math.max(0, curve.radius(z) ** 2 - x * x)) + 0.15,
    z,
  ];
  // Gloss: a fixed crescent on the upper-left of the bulb, in screen space.
  const centre = r.project([0, 0, 92]),
    unit = r.project([1, 0, 92]),
    sphere =
      (46.5 * Math.hypot(unit[0] - centre[0], unit[1] - centre[1])) /
      Math.sqrt(2 / 3),
    rho = sphere * 0.76,
    arc = (degrees: number) =>
      [
        centre[0] + rho * Math.cos((degrees * Math.PI) / 180),
        centre[1] + rho * Math.sin((degrees * Math.PI) / 180),
      ]
        .map((v) => v.toFixed(2))
        .join(" ");
  const shine = `<path data-part="shine" d="M${arc(-168)} A${rho.toFixed(2)} ${rho.toFixed(2)} 0 0 1 ${arc(-112)}" fill="none" stroke-linecap="round"/>`;
  let frames = "";
  for (let i = 0; i < GOTA_FRAMES; i++) {
    const frame = renderer(e, projection, (i / GOTA_FRAMES) * Math.PI * 2);
    for (const side of [-1, 1])
      frame.mark(
        side * 15.5,
        98,
        3.4,
        10.5,
        "#ffffff",
        front,
        "gota-eye",
        side * 0.2,
        24,
      );
    frames += `<g class="spin-frame" style="--i:${i}">${frame.finish()}</g>`;
  }
  return {
    body: `${outline}${shine}<g class="spin">${frames}</g>`,
    hoverFill: "",
    outline,
  };
}
export function character(e: Element, projection = characterProjection) {
  if (e.kind === "gota") return gota(e, projection);
  const r = renderer(e, projection);
  let hoverFill = "";
  if (e.kind === "punto") {
    // Calibrated against all three orthographic crops of the canonical sheet.
    // Flat lower head, mild depth compression and feature dimensions are measured,
    // rather than assuming the reference is a sphere.
    r.surface(torso, "torso", 0.82);
    for (const side of [-1, 1])
      r.surface(
        [
          { z: 43, r: 0.1, cx: side * 74.6 },
          { z: 46, r: 8, cx: side * 74.6 },
          { z: 54, r: 12.5, cx: side * 74.6 },
          { z: 67, r: 13.3, cx: side * 74.6 },
          { z: 82, r: 11, cx: side * 74.6 },
          { z: 93, r: 0.1, cx: side * 74.6 },
        ],
        "arm",
        1.36,
        e.fill,
        -side * 0.45,
      );
    r.surface(puntoHead, "head", 0.925);
    const headCurve = lathe.profileCurve(
      puntoHead.map((p) => [p.z, p.r, true]),
    );
    const headFront = (x: number, z: number): V3 => [
      x,
      Math.sqrt(Math.max(0, headCurve.radius(z) ** 2 - x * x)) * 0.925 + 0.15,
      z,
    ];
    const eyeFront = (x: number, z: number): V3 => {
      const p = headFront(x, z);
      p[1] -= 5;
      return p;
    };
    const sealRings = Array.from({ length: 33 }, (_, i) => {
      const t = (i / 32) * Math.PI;
      return {
        z: 65 - 20.0 * Math.cos(t),
        r: 20.7 * Math.sin(t) + 0.001,
        cy: 34.3,
      };
    });
    r.surface(sealRings, "seal", 4.3 / 20.7, e.accent);
    for (const x of [-17.9, 19.3]) {
      r.mark(x, 129.7, 4.4, 6.94, "#171717", eyeFront, "eye");
      r.mark(x + 0.7, 132, 1.2, 1.6, "#f5f4f2", eyeFront, "highlight");
    }
    const mouth = Array.from({ length: 49 }, (_, i) => {
      const x = -8.3 + (i * 17.7) / 48;
      const p = headFront(x, 116 + 4.12 * ((x - 0.55) / 8.85) ** 2);
      p[1] -= 1.4 + 2.35 * ((x - 0.55) / 8.85) ** 2;
      return p;
    }).filter((p) => r.visible(p, headFront));
    if (mouth.length > 1)
      r.faces.push({
        depth: 2000,
        svg: `<path data-part="smile" d="${pointsD(mouth.map(r.project), false)}" stroke="#171717" stroke-width="2.3" fill="none" stroke-linecap="round"/>`,
      });
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
  const body = r.finish();
  return { body, hoverFill, outline: body };
}

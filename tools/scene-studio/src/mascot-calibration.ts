import reference from "./mascot-reference.json";
import { character } from "./characters";
import { createElement } from "./model";
import { sceneCSS } from "./scene";
export const comparisonViews = [
  { name: "frente", label: "Frente", azimuth: 90 },
  { name: "tres-cuartos", label: "Tres cuartos", azimuth: 127 },
  { name: "perfil", label: "Perfil", azimuth: 180 },
];
export { reference };
export function comparisonBody(index: number) {
  const e = createElement("punto", "comparison");
  e.orientation = "SO";
  return character(e, {
    origin: [0, 172],
    scale: 1 / Math.sqrt(1.6),
    azimuth: comparisonViews[index].azimuth,
    elevation: 0,
  }).body;
}
export const comparisonStyle =
  sceneCSS + "svg{--fill:#fb7629;--stroke:#fb7629;--line:0}";
export type Box = number[];
export type Boxes = {
  full: Box;
  head: Box;
  eyes: Box[];
  smile: Box;
  seal: Box;
  arm: Box;
  tip: Box;
  waist: Box;
};
const width = (b: Box) => b[2] - b[0],
  height = (b: Box) => b[3] - b[1],
  cx = (b: Box) => (b[0] + b[2]) / 2,
  cy = (b: Box) => (b[1] + b[3]) / 2;
/** Measurements independent of model parameters; dimensions normalized to full height/head. */
export function metrics(b: Boxes): Record<string, number> {
  const h = height(b.full),
    w = width(b.head),
    x = (box: Box) => (cx(box) - b.head[0]) / w,
    y = (box: Box) => (cy(box) - b.full[1]) / h;
  return {
    "Cabeza / altura": height(b.head) / h,
    "Ancho cabeza / altura": w / h,
    "Achatamiento (alto/ancho)": height(b.head) / w,
    "Ojos · altura":
      b.eyes.reduce((a, e) => a + height(e), 0) / b.eyes.length / h,
    "Ojos · posición X": b.eyes.reduce((a, e) => a + x(e), 0) / b.eyes.length,
    "Ojos · posición Y": b.eyes.reduce((a, e) => a + y(e), 0) / b.eyes.length,
    ...(b.eyes.length === 2
      ? { "Ojos · separación": Math.abs(cx(b.eyes[1]) - cx(b.eyes[0])) / w }
      : {}),
    "Sonrisa · ancho": width(b.smile) / w,
    "Sonrisa · altura": height(b.smile) / h,
    "Sonrisa · posición X": x(b.smile),
    "Sonrisa · posición Y": y(b.smile),
    "Sello · ancho": width(b.seal) / w,
    "Sello · altura": height(b.seal) / h,
    "Sello · posición X": x(b.seal),
    "Sello · posición Y": y(b.seal),
    "Brazos · envergadura / altura": width(b.full) / h,
    "Brazo · altura": height(b.arm) / h,
    "Punta · ancho al 97%": width(b.tip) / w,
    "Torso · ancho al 78%": width(b.waist) / w,
  };
}
export async function measureMascot(svg: SVGSVGElement): Promise<Boxes> {
  const bounds = (selector: string): Box[] =>
    [...svg.querySelectorAll<SVGGraphicsElement>(selector)].map((n) => {
      const b = n.getBBox(),
        m = svg.getCTM()!.inverse().multiply(n.getCTM()!);
      const points = [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      return [
        Math.min(...points.map((p) => p.x)),
        Math.min(...points.map((p) => p.y)),
        Math.max(...points.map((p) => p.x)),
        Math.max(...points.map((p) => p.y)),
      ];
    });
  const union = (bs: Box[]): Box => [
    Math.min(...bs.map((b) => b[0])),
    Math.min(...bs.map((b) => b[1])),
    Math.max(...bs.map((b) => b[2])),
    Math.max(...bs.map((b) => b[3])),
  ];
  const full = union(bounds("[data-part]")),
    head = union(bounds("[data-part=head]")),
    eyes = bounds("[data-part=eye]"),
    seal = union(bounds("[data-part=seal]"));
  const smile = union(bounds("[data-part=smile]")); // getBBox excludes round stroke caps.
  for (let i = 0; i < 4; i++) smile[i] += (i < 2 ? -1 : 1) * 1.15;
  const arms = bounds("[data-part=arm]");
  const arm = arms.reduce(
    (best, b) => (width(b) > width(best) ? b : best),
    arms[0],
  );
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy
    .querySelectorAll("[data-comparison-reference]")
    .forEach((n) => n.remove());
  const h = height(full),
    w = width(full),
    scale = 8;
  copy.setAttribute("viewBox", `${full[0]} ${full[1]} ${w} ${h}`);
  copy.setAttribute("width", String(Math.ceil(w * scale)));
  copy.setAttribute("height", String(Math.ceil(h * scale)));
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const image = new Image();
  image.src =
    "data:image/svg+xml;base64," +
    btoa(
      unescape(encodeURIComponent(new XMLSerializer().serializeToString(copy))),
    );
  await image.decode();
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const row = (fraction: number): Box => {
    const y = Math.round(c.height * fraction);
    let left = c.width,
      right = 0;
    for (let x = 0; x < c.width; x++)
      if (data[(y * c.width + x) * 4 + 3] > 220) {
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
      }
    return [
      full[0] + (left / c.width) * w,
      full[1] + (y / c.height) * h,
      full[0] + (right / c.width) * w,
      full[1] + ((y + 1) / c.height) * h,
    ];
  };
  return {
    full,
    head,
    eyes,
    smile,
    seal,
    arm,
    tip: row(0.97),
    waist: row(0.78),
  };
}
export function deviations(
  actual: Record<string, number>,
  target: Record<string, number>,
) {
  return Object.entries(target).map(([name, value]) => ({
    name,
    target: value,
    actual: actual[name],
    error: Math.abs(actual[name] / value - 1),
  }));
}

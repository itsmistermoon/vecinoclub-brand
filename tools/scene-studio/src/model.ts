export type Kind = "map" | "shop" | "tree" | "bench" | "punto" | "isotipo";
export type Orientation = "NE" | "SE" | "SO" | "NO";
export type Element = {
  id: string;
  kind: Kind;
  name: string;
  x: number;
  y: number;
  scale: number;
  fill: string;
  stroke: string;
  accent: string;
  line: number;
  opacity: number;
  visible: boolean;
  orientation: Orientation;
  amplitude: number;
  tilt: number;
  shadow: boolean;
  details: boolean;
  awning: boolean;
};
export type Scene = {
  version: 2;
  global: {
    background: string;
    zoom: number;
    duration: number;
    paused: boolean;
  };
  elements: Element[];
};
export const names: Record<Kind, string> = {
  map: "Mapa",
  shop: "Comercio",
  tree: "Árbol",
  bench: "Banco y jardinera",
  punto: "Punto",
  isotipo: "Isotipo",
};
export const floating = (e: Element) =>
  e.kind === "punto" || e.kind === "isotipo";
export function createElement(
  kind: Kind,
  id: string = crypto.randomUUID(),
): Element {
  return {
    id,
    kind,
    name: names[kind],
    x: 0,
    y: 0,
    scale: 1,
    fill:
      kind === "punto"
        ? "#fb7629"
        : kind === "isotipo"
          ? "#fb772a"
          : kind === "tree"
            ? "#ece4d1"
            : "#fcf4df",
    stroke: kind === "punto" || kind === "isotipo" ? "#c46b34" : "#c6b29d",
    accent: kind === "punto" ? "#f5f4f2" : "#fb772a",
    line: 0.85,
    opacity: 1,
    visible: true,
    orientation: "SO",
    amplitude: 10,
    tilt: 2,
    shadow: true,
    details: true,
    awning: true,
  };
}
export function initialScene(): Scene {
  const elements: Element[] = [];
  for (const kind of [
    "map",
    "shop",
    "tree",
    "tree",
    "tree",
    "bench",
    "punto",
    "isotipo",
  ] as Kind[])
    elements.push(createElement(kind, `${kind}-${elements.length + 1}`));
  Object.assign(elements[2], { name: "Árbol norte", x: -60.62, y: -135 });
  Object.assign(elements[3], { name: "Árbol este", x: 232.09, y: 39 });
  Object.assign(elements[4], { name: "Árbol oeste", x: -229.5, y: -32.5 });
  Object.assign(elements[7], { x: 220, y: 70, scale: 0.6 });
  return {
    version: 2,
    global: { background: "#fcf4df", zoom: 1, duration: 4.5, paused: false },
    elements,
  };
}
export function duplicate(e: Element): Element {
  return {
    ...e,
    id: crypto.randomUUID(),
    name: `${e.name} · copia`,
    x: e.x + 35,
    y: e.y + 25,
  };
}
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

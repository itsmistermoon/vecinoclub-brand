export type Kind =
  "map" | "shop" | "tree" | "bench" | "punto" | "isotipo" | "gota";
export type MapVariant = "barrio" | "cruce" | "plaza" | "compacto";
export const mapNames: Record<MapVariant, string> = {
  compacto: "Compacto",
  barrio: "Barrio",
  cruce: "Cruce",
  plaza: "Plaza",
};
export type ShopVariant =
  "generico" | "cafeteria" | "panaderia" | "floreria" | "almacen";
export const shopNames: Record<ShopVariant, string> = {
  generico: "Comercio",
  cafeteria: "Cafetería",
  panaderia: "Panadería",
  floreria: "Florería",
  almacen: "Almacén",
};
export type Orientation = "NE" | "SE" | "SO" | "NO";
export type Element = {
  id: string;
  kind: Kind;
  mapVariant: MapVariant;
  shopVariant: ShopVariant;
  flipX: boolean;
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
  spinning: boolean;
  spin: number;
  shine: number;
};
export type Scene = {
  version: 6;
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
  gota: "Gota",
};
export const floating = (e: Element) =>
  e.kind === "punto" || e.kind === "isotipo" || e.kind === "gota";
export function createElement(
  kind: Kind,
  id: string = crypto.randomUUID(),
): Element {
  return {
    id,
    kind,
    mapVariant: "barrio",
    shopVariant: "generico",
    flipX: false,
    name: names[kind],
    x: 0,
    y: 0,
    scale: 1,
    fill:
      kind === "punto"
        ? "#fb7629"
        : kind === "gota"
          ? "#fcbf29"
          : kind === "isotipo"
            ? "#fb772a"
            : kind === "tree"
              ? "#332f2a"
              : kind === "shop"
                ? "#27231e"
                : "#211e1a",
    stroke:
      kind === "gota"
        ? "#fcbf29"
        : kind === "punto" || kind === "isotipo"
          ? "#fb7629"
          : "#c6b29d",
    accent: kind === "punto" || kind === "gota" ? "#f5f4f2" : "#fb772a",
    line: 0.7,
    opacity: 1,
    visible: true,
    orientation: kind === "shop" ? "SE" : "SO",
    amplitude: 10,
    tilt: 2,
    shadow: true,
    details: true,
    awning: true,
    spinning: true,
    spin: 8,
    shine: 0.85,
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
    version: 6,
    global: { background: "#171717", zoom: 1, duration: 4.5, paused: false },
    elements: [
      elements[0],
      elements[2],
      elements[4],
      elements[1],
      elements[3],
      ...elements.slice(5),
    ],
  };
}
export function duplicate(e: Element): Element {
  return {
    ...e,
    id: crypto.randomUUID(),
    name: `${e.name.slice(0, 72)} · copia`,
    x: clamp(e.x + 35, -500, 500),
    y: clamp(e.y + 25, -400, 400),
  };
}
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type StackMove = "front" | "back" | "up" | "down";
/** Document order is back-to-front. No renderer-specific priority overrides it. */
export function moveLayer(
  elements: Element[],
  id: string,
  direction: StackMove,
): Element[] {
  const from = elements.findIndex((e) => e.id === id);
  if (from < 0) return elements;
  const to =
    direction === "front"
      ? elements.length - 1
      : direction === "back"
        ? 0
        : direction === "up"
          ? Math.min(elements.length - 1, from + 1)
          : Math.max(0, from - 1);
  if (from === to) return elements;
  const next = [...elements];
  const [element] = next.splice(from, 1);
  next.splice(to, 0, element);
  return next;
}
/** UI rows are front-to-back: dropping above a row inserts after it in the document. */
export function placeLayer(
  elements: Element[],
  id: string,
  targetId: string,
  edge: "above" | "below",
): Element[] {
  if (
    id === targetId ||
    !elements.some((e) => e.id === id) ||
    !elements.some((e) => e.id === targetId)
  )
    return elements;
  const element = elements.find((e) => e.id === id)!;
  const next = elements.filter((e) => e.id !== id),
    target = next.findIndex((e) => e.id === targetId);
  next.splice(target + (edge === "above" ? 1 : 0), 0, element);
  return next;
}

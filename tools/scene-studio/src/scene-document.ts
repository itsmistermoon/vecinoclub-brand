import { createElement, mapNames, names, shopNames, type Scene } from "./model";
export const DOCUMENT_VERSION = 6;
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_ELEMENTS = 200;
type Check = (value: unknown, path: string) => void;
const fail = (path: string, message: string): never => {
  throw new Error(`${path}: ${message}`);
};
const number =
  (min: number, max: number): Check =>
  (value, path) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      fail(path, `debe ser un número entre ${min} y ${max}.`);
  };
const boolean: Check = (value, path) => {
  if (typeof value !== "boolean") fail(path, "debe ser true o false.");
};
const color: Check = (value, path) => {
  if (
    typeof value !== "string" ||
    !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
  )
    fail(path, "usa un color HEX de 3 o 6 dígitos, por ejemplo #fb772a.");
};
const oneOf =
  (values: string[]): Check =>
  (value, path) => {
    if (typeof value !== "string" || !values.includes(value))
      fail(path, `elige uno de: ${values.join(", ")}.`);
  };
function object(
  value: unknown,
  rules: Record<string, Check>,
  path: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(path, "debe ser un objeto.");
  const data = value as Record<string, unknown>;
  for (const key of Object.keys(data))
    if (!Object.hasOwn(rules, key))
      fail(
        `${path}.${key}`,
        `campo desconocido para el formato ${DOCUMENT_VERSION}.`,
      );
  for (const [key, check] of Object.entries(rules)) {
    if (!Object.hasOwn(data, key))
      fail(`${path}.${key}`, "falta este campo obligatorio.");
    check(data[key], `${path}.${key}`);
  }
  return data;
}
const elementRules: Record<keyof Scene["elements"][number], Check> = {
  id: (value, path) => {
    if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(value))
      fail(
        path,
        "usa de 1 a 100 letras, números, guiones o guiones bajos; empieza con letra o número.",
      );
  },
  kind: oneOf(Object.keys(names)),
  mapVariant: oneOf(Object.keys(mapNames)),
  shopVariant: oneOf(Object.keys(shopNames)),
  flipX: boolean,
  name: (value, path) => {
    if (typeof value !== "string" || value.length > 80)
      fail(path, "debe ser texto de hasta 80 caracteres.");
  },
  x: number(-500, 500),
  y: number(-400, 400),
  scale: number(0.3, 2.5),
  fill: color,
  stroke: color,
  accent: color,
  line: number(0.2, 4),
  opacity: number(0.1, 1),
  visible: boolean,
  orientation: oneOf(["NE", "SE", "SO", "NO"]),
  amplitude: number(0, 30),
  tilt: number(0, 8),
  shadow: boolean,
  details: boolean,
  awning: boolean,
  spinning: boolean,
  spin: number(1, 30),
  shine: number(0, 1),
};
function migrateFromV5(document: Record<string, unknown>) {
  const { spinning, spin, shine } = createElement("gota");
  return {
    ...document,
    version: DOCUMENT_VERSION,
    elements: Array.isArray(document.elements)
      ? document.elements.map((e) =>
          e !== null && typeof e === "object" && !Array.isArray(e)
            ? { ...e, spinning, spin, shine }
            : e,
        )
      : document.elements,
  };
}
/** Accept a complete current document (or v5, upgraded). Invalid imports never partially apply. */
export function parseSceneDocument(text: string): Scene {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "JSON inválido: revisa la sintaxis del archivo. No se cargó nada.",
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("Documento", "debe ser un objeto JSON.");
  const version = (value as Record<string, unknown>).version;
  // The saved scenes predate Gota's spin and shine fields: v5 gains them with defaults.
  if (version === 5) value = migrateFromV5(value as Record<string, unknown>);
  else if (version !== DOCUMENT_VERSION)
    throw new Error(
      `Versión de formato ${typeof version === "number" ? version : "ausente o inválida"} no compatible. Se admiten las versiones 5 (se actualiza al cargar) y ${DOCUMENT_VERSION}; no se cargó nada.`,
    );
  object(
    value,
    {
      version: number(DOCUMENT_VERSION, DOCUMENT_VERSION),
      global: (value, path) => {
        object(
          value,
          {
            background: color,
            zoom: number(0.65, 1.2),
            duration: number(1, 12),
            paused: boolean,
          },
          path,
        );
      },
      elements: (value, path) => {
        if (!Array.isArray(value) || value.length > MAX_ELEMENTS)
          fail(path, `debe ser una lista de hasta ${MAX_ELEMENTS} elementos.`);
        const ids = new Set<string>();
        for (const [index, item] of (value as unknown[]).entries()) {
          const element = object(item, elementRules, `${path}[${index}]`);
          const id = element.id as string;
          if (ids.has(id))
            fail(
              `${path}[${index}].id`,
              `el identificador «${id}» está repetido.`,
            );
          ids.add(id);
        }
      },
    },
    "Documento",
  );
  return value as Scene;
}

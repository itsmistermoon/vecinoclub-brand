import { P, box, inPlane } from "./projection";
import { storefront } from "./storefronts";
import { worldProjection } from "./world-projection";
import type { Element } from "./model";
function tree(x: number, y: number) {
  const [a, b] = P(x, y, 0);
  return (
    box(x - 11, y - 11, 0, 22, 22, 6, 2) +
    `<g transform="translate(${a} ${b})"><path class="detail" d="M0 -5v-47 M0 -30l-12 -10 M0 -24l11 -12"/><path class="face" d="M0 -99C-30 -99 -39 -61 -24 -48C-9 -32 20 -36 29 -54C39 -75 22 -99 0 -99Z"/><path class="detail extras" d="M0 -90v46 M0 -66l-14 -10 M0 -57l14 -12"/></g>`
  );
}

const cache = new Map<string, string>();
function orientedEnvironment(e: Element) {
  const key = `${e.kind}/${e.mapVariant}/${e.orientation}`;
  if (cache.has(key)) return cache.get(key)!;
  const { TOP, box } = worldProjection(
    e.orientation,
    e.kind === "bench" ? [175, 115, 0] : [0, 0, 0],
  );
  const barrio =
    box(-245, -175, -9, 490, 350, 9, 5) +
    inPlane(
      TOP(-245, -175, 0),
      `<path class="detail" d="M0 110H490 M0 225H490 M145 0V350 M345 0V350"/><path class="detail extras" stroke-dasharray="3 7" d="M0 117H490 M0 232H490 M138 0V350 M352 0V350"/><rect class="detail" x="161" y="128" width="165" height="81" rx="4"/><path class="detail extras" d="M20 25h75v55H20z M375 25h85v55h-85z M20 260h85v65H20z M375 260h85v65h-85z"/>`,
    );
  const bench =
    box(145, 100, 0, 8, 32, 22) +
    box(207, 100, 0, 8, 32, 22) +
    box(140, 96, 22, 80, 39, 5, 1) +
    inPlane(
      TOP(140, 96, 27),
      `<path class="detail extras" d="M0 10h80 M0 20h80 M0 30h80"/>`,
    ) +
    box(145, 99, 27, 70, 5, 23, 1) +
    box(110, 125, 0, 22, 22, 24, 2) +
    inPlane(
      TOP(110, 125, 24),
      `<path class="detail" d="M11 18V0 M11 11L2 5 M11 9l8 -7"/>`,
    );

  const cruce =
    box(-245, -175, -9, 490, 350, 9, 5) +
    inPlane(
      TOP(-245, -175, 0),
      `<path class="map-road" d="M0 250H110V0h32v250h348v32H142v68h-32v-68H0Z"/><path class="detail extras" stroke-dasharray="5 8" d="M126 0v238M0 266h98M154 266h336M126 294v56"/><path class="detail" d="M20 20h70v90H20zM165 18h145v80H165zM340 20h130v102H340zM167 122h160v112H167zM20 302h70v28H20zM165 302h145v28H165zM340 302h130v28H340z"/><path class="detail extras" d="M112 236h28M112 241h28M112 291h28M112 296h28M96 252v28M101 252v28M151 252v28M156 252v28"/>`,
    );
  const plaza =
    box(-245, -175, -9, 490, 350, 9, 5) +
    inPlane(
      TOP(-245, -175, 0),
      `<circle class="map-road" cx="245" cy="175" r="135"/><circle class="detail" cx="245" cy="175" r="115"/><path class="detail" d="M0 165h110v20H0M380 165h110v20H380M235 0v40h20V0M235 310v40h20v-40"/><circle class="detail" cx="55" cy="70" r="26"/><circle class="detail" cx="435" cy="70" r="26"/><circle class="detail" cx="55" cy="280" r="26"/><circle class="detail" cx="435" cy="280" r="26"/><path class="detail extras" d="M40 70h30M55 55v30M420 70h30M435 55v30M40 280h30M55 265v30M420 280h30M435 265v30"/>`,
    );
  const compacto =
    box(-150, -150, -9, 300, 300, 9, 5) +
    inPlane(
      TOP(-150, -150, 0),
      `<path class="map-road" d="M0 227h300v27H0z"/><path class="detail" d="M16 16h268v195H16zM16 268h112v18H16zM168 268h116v18H168z"/><path class="detail extras" stroke-dasharray="4 8" d="M0 241h300"/><path class="detail extras" d="M136 227v27M142 227v27M148 227v27M154 227v27M160 227v27"/>`,
    );
  const maps = { barrio, cruce, plaza, compacto };
  const body = e.kind === "bench" ? bench : maps[e.mapVariant];
  cache.set(key, body);
  return body;
}
export function environment(e: Element) {
  return e.kind === "map"
    ? orientedEnvironment(e)
    : e.kind === "shop"
      ? storefront(e)
      : e.kind === "bench"
        ? orientedEnvironment(e)
        : tree(0, 0);
}

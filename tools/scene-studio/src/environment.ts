import { P, TOP, FRONT, SIDE, box, inPlane } from "./projection";
import type { Kind } from "./model";
const map =
  box(-245, -175, -9, 490, 350, 9, 5) +
  inPlane(
    TOP(-245, -175, 0),
    `<path class="detail" d="M0 110H490 M0 225H490 M145 0V350 M345 0V350"/><path class="detail extras" stroke-dasharray="3 7" d="M0 117H490 M0 232H490 M138 0V350 M352 0V350"/><rect class="detail" x="161" y="128" width="165" height="81" rx="4"/><path class="detail extras" d="M20 25h75v55H20z M375 25h85v55h-85z M20 260h85v65H20z M375 260h85v65h-85z"/>`,
  );
const shop =
  box(-75, -40, 0, 150, 110, 115, 1) +
  inPlane(
    FRONT(-75, 70, 115),
    `<rect class="detail" x="12" y="43" width="70" height="59" rx="2"/><path class="detail extras" d="M47 44v58 M13 83h68"/><rect class="detail" x="94" y="37" width="43" height="78" rx="2"/><path class="detail" d="M100 45h31v39h-31z M102 91v7"/><rect class="detail" x="17" y="10" width="116" height="19" rx="2"/><path class="detail extras" d="M42 19h66"/>`,
  ) +
  inPlane(
    SIDE(75, 70, 115),
    `<rect class="detail" x="22" y="36" width="68" height="44" rx="2"/><path class="detail extras" d="M56 37v42 M23 58h66 M20 95h72"/>`,
  ) +
  box(-82, -47, 115, 164, 124, 9, 2) +
  inPlane(
    TOP(-66, -31, 124),
    `<rect class="detail extras" width="132" height="92" rx="2"/>`,
  ) +
  `<g class="awning">` +
  inPlane(
    TOP(-78, 70, 85),
    `<rect class="face" width="156" height="27" rx="1"/>` +
      Array.from(
        { length: 8 },
        (_, i) =>
          `<rect class="${i % 2 ? "face" : "accent"}" x="${i * 19.5}" width="19.5" height="27"/>`,
      ).join(""),
  ) +
  inPlane(
    FRONT(-78, 97, 85),
    `<rect class="face" width="156" height="9"/>` +
      Array.from(
        { length: 8 },
        (_, i) =>
          `<rect class="${i % 2 ? "face" : "accent"}" x="${i * 19.5}" width="19.5" height="9"/>`,
      ).join(""),
  ) +
  `</g>`;
function tree(x: number, y: number) {
  const [a, b] = P(x, y, 0);
  return (
    box(x - 11, y - 11, 0, 22, 22, 6, 2) +
    `<g transform="translate(${a} ${b})"><path class="detail" d="M0 -5v-47 M0 -30l-12 -10 M0 -24l11 -12"/><path class="face" d="M0 -99C-30 -99 -39 -61 -24 -48C-9 -32 20 -36 29 -54C39 -75 22 -99 0 -99Z"/><path class="detail extras" d="M0 -90v46 M0 -66l-14 -10 M0 -57l14 -12"/></g>`
  );
}

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

export function environment(kind: Kind) {
  return kind === "map"
    ? map
    : kind === "shop"
      ? shop
      : kind === "bench"
        ? bench
        : tree(0, 0);
}

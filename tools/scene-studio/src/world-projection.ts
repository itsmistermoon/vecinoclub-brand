import { P, inPlane, type V3 } from "./projection";
import type { Orientation } from "./model";
/** Rotate real world axes about an object's ground anchor, preserving verticals. */
export function worldProjection(
  orientation: Orientation,
  pivot: V3 = [0, 0, 0],
) {
  const angle =
    ({ SO: 0, SE: -90, NE: 180, NO: 90 }[orientation] * Math.PI) / 180;
  const turn = ([x, y, z]: V3): V3 => [
    pivot[0] +
      (x - pivot[0]) * Math.cos(angle) -
      (y - pivot[1]) * Math.sin(angle),
    pivot[1] +
      (x - pivot[0]) * Math.sin(angle) +
      (y - pivot[1]) * Math.cos(angle),
    z,
  ];
  const project = (p: V3) => P(...turn(p));
  const plane = (o: V3, u: V3, v: V3) => {
    const a = project(o),
      b = project([o[0] + u[0], o[1] + u[1], o[2] + u[2]]),
      c = project([o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
    return `matrix(${b[0] - a[0]} ${b[1] - a[1]} ${c[0] - a[0]} ${c[1] - a[1]} ${a[0]} ${a[1]})`;
  };
  const TOP = (x: number, y: number, z: number) =>
    plane([x, y, z], [1, 0, 0], [0, 1, 0]);
  const FRONT = (x: number, y: number, z: number) =>
    plane([x, y, z], [1, 0, 0], [0, 0, -1]);
  const SIDE = (x: number, y: number, z: number) =>
    plane([x, y, z], [0, -1, 0], [0, 0, -1]);
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    r = 0,
  ) => {
    const surface = (
      o: V3,
      u: V3,
      v: V3,
      normal: V3,
      width: number,
      height: number,
      cls: string,
    ) => {
      const n = [
        normal[0] * Math.cos(angle) - normal[1] * Math.sin(angle),
        normal[0] * Math.sin(angle) + normal[1] * Math.cos(angle),
        normal[2],
      ];
      return n[0] + n[1] + n[2] > 0.001
        ? inPlane(
            plane(o, u, v),
            `<rect class="face ${cls}" width="${width}" height="${height}" rx="${Math.min(r, height / 4)}"/>`,
          )
        : "";
    };
    return (
      surface(
        [x + w, y + d, z + h],
        [0, -1, 0],
        [0, 0, -1],
        [1, 0, 0],
        d,
        h,
        "side",
      ) +
      surface([x, y, z + h], [0, 1, 0], [0, 0, -1], [-1, 0, 0], d, h, "side") +
      surface([x, y + d, z + h], [1, 0, 0], [0, 0, -1], [0, 1, 0], w, h, "") +
      surface([x + w, y, z + h], [-1, 0, 0], [0, 0, -1], [0, -1, 0], w, h, "") +
      inPlane(
        TOP(x, y, z + h),
        `<rect class="face top" width="${w}" height="${d}" rx="${r}"/>`,
      )
    );
  };
  return { TOP, FRONT, SIDE, box, project, turn };
}

import type { Element, Scene } from "./model";
import { floating } from "./model";
import { P } from "./projection";
import { environment } from "./environment";
import { character } from "./characters";
export const sceneCSS = `
.face{fill:var(--fill);stroke:var(--stroke);stroke-width:var(--line);stroke-linejoin:round}
.detail{fill:none;stroke:var(--stroke);stroke-width:var(--line);stroke-linecap:round;stroke-linejoin:round}
.accent{fill:var(--accent);stroke:var(--stroke);stroke-width:var(--line)}
.iso-fill{fill:var(--fill)}.iso-shade[data-shade="0"]{fill:var(--shade-0)}.iso-shade[data-shade="1"]{fill:var(--shade-1)}.iso-shade[data-shade="2"]{fill:var(--shade-2)}.iso-shade[data-shade="3"]{fill:var(--shade-3)}.iso-top{fill:var(--shade-4)}.iso-line{fill:none;stroke:var(--stroke);stroke-width:var(--line);vector-effect:non-scaling-stroke}.mesh-edge{fill:none;stroke:var(--stroke);stroke-width:var(--line);stroke-linejoin:round}
.face,.detail,.accent,.mesh-edge{vector-effect:non-scaling-stroke}
[data-object]{cursor:grab;outline:none;touch-action:none}[data-object].dragging{cursor:grabbing}
.hover-outline{opacity:0;pointer-events:none}
[data-object]:hover .hover-outline,[data-object]:focus-visible .hover-outline{opacity:1}
[data-details=false] .extras,[data-awning=false] .awning{display:none}
.idle{transform-box:view-box;animation:float var(--duration) ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0) rotate(calc(-1 * var(--tilt)))}50%{transform:translateY(calc(-1 * var(--amplitude))) rotate(var(--tilt))}}
.paused .idle{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){.idle{animation:none!important}}
`;
const NS = "http://www.w3.org/2000/svg";
export function anchor(e: Element) {
  return e.kind === "bench"
    ? P(175, 115, 0)
    : floating(e)
      ? P(0, 0, 175)
      : e.kind === "shop"
        ? P(0, 15, 0)
        : P(0, 0, 0);
}
export class SceneRenderer {
  readonly composition: SVGGElement;
  private nodes = new Map<
    string,
    {
      node: SVGGElement;
      content: SVGGElement;
      hover: SVGGElement;
      key: string;
      shadow: SVGElement;
    }
  >();
  constructor(readonly svg: SVGSVGElement) {
    svg.innerHTML = "";
    const style = document.createElementNS(NS, "style");
    style.textContent = sceneCSS;
    svg.append(style);
    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML = `<filter id="outer-silhouette" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.7" result="wide"/><feComposite in="wide" in2="SourceAlpha" operator="out" result="rim"/><feFlood flood-color="#fb772a"/><feComposite in2="rim" operator="in"/></filter>`;
    svg.append(defs);
    this.composition = document.createElementNS(NS, "g");
    this.composition.id = "composition";
    svg.append(this.composition);
  }
  update(state: Scene, selected: string) {
    this.svg.style.background = state.global.background;
    this.svg.style.setProperty("--duration", `${state.global.duration}s`);
    this.svg.classList.toggle("paused", state.global.paused);
    this.composition.setAttribute(
      "transform",
      `translate(500 380) scale(${state.global.zoom}) translate(-500 -380)`,
    );
    const ids = new Set(state.elements.map((e) => e.id));
    for (const [id, entry] of this.nodes)
      if (!ids.has(id)) {
        entry.node.remove();
        this.nodes.delete(id);
      }
    const sorted = [...state.elements].sort(
      (a, b) => this.depth(a) - this.depth(b),
    );
    for (const e of sorted) {
      let entry = this.nodes.get(e.id);
      const [a, b] = anchor(e);
      if (!entry) {
        const node = document.createElementNS(NS, "g");
        node.dataset.object = e.id;
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "button");
        const shadow = document.createElementNS(NS, "ellipse");
        shadow.setAttribute("cx", String(a));
        shadow.setAttribute("cy", String(b + 43));
        shadow.setAttribute("rx", "26");
        shadow.setAttribute("ry", "9");
        shadow.setAttribute("fill", "#171717");
        shadow.setAttribute("opacity", ".07");
        node.append(shadow);
        const animated = document.createElementNS(NS, "g");
        animated.classList.toggle("idle", floating(e));
        animated.style.transformOrigin = `${a}px ${b}px`;
        const content = document.createElementNS(NS, "g");
        content.classList.add("model-content");
        animated.append(content);
        const hover = document.createElementNS(NS, "g");
        hover.setAttribute("class", "hover-outline");
        hover.setAttribute("filter", "url(#outer-silhouette)");
        hover.setAttribute("aria-hidden", "true");
        animated.append(hover);
        node.append(animated);
        entry = { node, content, hover, key: "", shadow };
        this.nodes.set(e.id, entry);
      }
      const { node, content, hover, shadow } = entry;
      node.dataset.kind = e.kind;
      node.dataset.orientation = e.orientation;
      node.dataset.selected = String(e.id === selected);
      node.dataset.details = String(e.details);
      node.dataset.awning = String(e.awning);
      node.setAttribute("aria-label", `Editar ${e.name}`);
      node.setAttribute("aria-pressed", String(e.id === selected));
      node.setAttribute(
        "transform",
        `translate(${a + e.x} ${b + e.y}) scale(${e.scale}) translate(${-a} ${-b})`,
      );
      node.setAttribute("opacity", String(e.opacity));
      node.style.display = e.visible ? "" : "none";
      for (const [key, value] of Object.entries({
        fill: e.fill,
        stroke: e.stroke,
        accent: e.accent,
        line: e.line,
        amplitude: `${e.amplitude}px`,
        tilt: `${e.tilt}deg`,
      }))
        node.style.setProperty(`--${key}`, String(value));
      shadow.style.display = floating(e) && e.shadow ? "" : "none";
      const key = floating(e)
        ? `${e.kind}/${e.orientation}/${e.fill}/${e.accent}`
        : e.kind;
      if (entry.key !== key) {
        const geometry = floating(e)
          ? character(e)
          : { body: environment(e.kind), hoverFill: "" };
        content.innerHTML = geometry.body;
        hover.innerHTML = geometry.body + geometry.hoverFill;
        entry.key = key;
      }
      // Append only if ordering changed; moving an existing idle node can restart CSS animation.
    }
    const current = [...this.composition.children].map(
      (el) => (el as SVGElement).dataset.object,
    );
    if (current.join() !== sorted.map((e) => e.id).join())
      for (const e of sorted)
        this.composition.append(this.nodes.get(e.id)!.node);
  }
  private depth(e: Element) {
    return e.kind === "map" ? -10000 : floating(e) ? 10000 : anchor(e)[1] + e.y;
  }
  export(state: Scene) {
    const clone = this.svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", NS);
    clone.setAttribute("width", "1000");
    clone.setAttribute("height", "760");
    clone.setAttribute("role", "img");
    clone.setAttribute("aria-label", "Escena isométrica de VecinoClub");
    for (const el of clone.querySelectorAll(".hover-outline,defs")) el.remove();
    for (const el of clone.querySelectorAll("[data-object]")) {
      for (const attr of ["tabindex", "role", "aria-pressed", "data-selected"])
        el.removeAttribute(attr);
      el.classList.remove("dragging");
    }
    const meta = document.createElementNS(NS, "metadata");
    meta.textContent = JSON.stringify(state);
    clone.prepend(meta);
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      new XMLSerializer().serializeToString(clone)
    );
  }
}
export function download(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

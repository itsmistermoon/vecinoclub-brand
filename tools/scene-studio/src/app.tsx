import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus,
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Pause,
  Play,
  RotateCcw,
  MapPin,
  TreePine,
  Store,
  Armchair,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SceneRenderer, download } from "./scene";
import {
  initialScene,
  createElement,
  duplicate,
  floating,
  names,
  clamp,
  type Kind,
  type Orientation,
  type Element,
  type Scene,
} from "./model";
import { cn } from "@/lib/utils";
const icons = {
  map: Layers,
  shop: Store,
  tree: TreePine,
  bench: Armchair,
  punto: MapPin,
  isotipo: MapPin,
};
function Numeric({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field data-control={id}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
        <output className="text-xs tabular-nums text-muted-foreground">
          {Number(value.toFixed(2))}
        </output>
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </Field>
  );
}
function Check({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </Field>
  );
}
function Color({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-auto w-12 p-1"
      />
    </Field>
  );
}
function App() {
  const [state, setState] = useState<Scene>(initialScene);
  const [selected, setSelected] = useState("punto-7");
  const [status, setStatus] = useState(
    "Listo. Arrastra una pieza para moverla. Alt + rueda cambia su tamaño.",
  );
  const [reduced, setReduced] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const svg = useRef<SVGSVGElement>(null);
  const renderer = useRef<SceneRenderer | null>(null);
  const current = useRef(state);
  current.current = state;
  const selection = useRef(selected);
  selection.current = selected;
  const element = state.elements.find((e) => e.id === selected);
  function patch(id: string, values: Partial<Element>) {
    setState((s) => ({
      ...s,
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...values } : e)),
    }));
  }
  function global(values: Partial<Scene["global"]>) {
    setState((s) => ({ ...s, global: { ...s.global, ...values } }));
  }
  function add(kind: Kind) {
    const e = createElement(kind);
    e.x =
      kind === "isotipo"
        ? 220
        : kind === "tree"
          ? 220
          : kind === "shop"
            ? 160
            : 25;
    e.y =
      kind === "isotipo"
        ? 70
        : kind === "tree"
          ? 160
          : kind === "shop"
            ? 60
            : 25;
    if (kind === "isotipo") e.scale = 0.6;
    setState((s) => ({ ...s, elements: [...s.elements, e] }));
    setSelected(e.id);
    setStatus(`${e.name} añadido.`);
  }
  function copy(e: Element) {
    const next = duplicate(e);
    setState((s) => ({ ...s, elements: [...s.elements, next] }));
    setSelected(next.id);
    setStatus(`${next.name} añadido.`);
  }
  function remove(e: Element) {
    setState((s) => ({
      ...s,
      elements: s.elements.filter((item) => item.id !== e.id),
    }));
    if (selected === e.id) setSelected("");
    setStatus(`${e.name} eliminado.`);
  }
  useLayoutEffect(() => {
    renderer.current = new SceneRenderer(svg.current!);
    return () => {
      renderer.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    renderer.current?.update(state, selected);
  }, [state, selected]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const root = svg.current!;
    let drag: {
      id: string;
      pointer: number;
      start: DOMPoint;
      x: number;
      y: number;
    } | null = null;
    const point = (e: { clientX: number; clientY: number }) =>
      new DOMPoint(e.clientX, e.clientY).matrixTransform(
        renderer.current!.composition.getScreenCTM()!.inverse(),
      );
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = (e.target as globalThis.Element)?.closest?.(
        "[data-object]",
      ) as SVGGElement | null;
      if (!target) return;
      const id = target.dataset.object!;
      const obj = current.current.elements.find((v) => v.id === id)!;
      setSelected(id);
      drag = { id, pointer: e.pointerId, start: point(e), x: obj.x, y: obj.y };
      root.setPointerCapture(e.pointerId);
      target.classList.add("dragging");
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.pointer !== e.pointerId) return;
      const p = point(e);
      patch(drag.id, {
        x: clamp(Math.round(drag.x + p.x - drag.start.x), -500, 500),
        y: clamp(Math.round(drag.y + p.y - drag.start.y), -400, 400),
      });
    };
    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      root
        .querySelectorAll(".dragging")
        .forEach((n) => n.classList.remove("dragging"));
      drag = null;
      if (root.hasPointerCapture(e.pointerId))
        root.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      if (!e.altKey || e.deltaY === 0) return;
      const target = (e.target as globalThis.Element).closest(
        "[data-object]",
      ) as SVGGElement | null;
      if (!target) return;
      const id = target.dataset.object!,
        obj = current.current.elements.find((v) => v.id === id)!;
      e.preventDefault();
      setSelected(id);
      patch(id, {
        scale: clamp(
          Math.round(obj.scale * Math.exp(-e.deltaY * 0.002) * 100) / 100,
          0.3,
          2.5,
        ),
      });
    };
    const key = (e: KeyboardEvent) => {
      const target = (e.target as globalThis.Element).closest(
        "[data-object]",
      ) as SVGGElement | null;
      if (target && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setSelected(target.dataset.object!);
      }
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
    root.addEventListener("lostpointercapture", end);
    root.addEventListener("wheel", wheel, { passive: false });
    root.addEventListener("keydown", key);
    return () => {
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", end);
      root.removeEventListener("pointercancel", end);
      root.removeEventListener("lostpointercapture", end);
      root.removeEventListener("wheel", wheel);
      root.removeEventListener("keydown", key);
    };
  }, []);
  function Menu({ e }: { e: Element }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={`Menú de ${e.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{e.name}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setSelected(e.id)}>
              Editar pieza
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => patch(e.id, { visible: !e.visible })}
            >
              {e.visible ? <EyeOff /> : <Eye />}
              {e.visible ? "Ocultar" : "Mostrar"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => copy(e)}>
              <Copy />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => remove(e)}>
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <>
      <header className="studio-header">
        <div>
          <p className="eyebrow">VecinoClub · Taller de escena</p>
          <h1>Un punto en el barrio.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            id="json"
            onClick={() => {
              download(
                JSON.stringify(state, null, 2),
                "application/json",
                "vecinoclub-escena.json",
              );
              setStatus("Configuración JSON descargada.");
            }}
          >
            Guardar JSON
          </Button>
          <Button
            id="export"
            onClick={() => {
              download(
                renderer.current!.export(state),
                "image/svg+xml",
                "vecinoclub-escena.svg",
              );
              setStatus("Escena SVG descargada.");
            }}
          >
            <Download data-icon="inline-start" />
            Exportar SVG
          </Button>
        </div>
      </header>
      <main className="studio-layout">
        <aside className="layer-panel">
          <div className="flex items-center justify-between gap-2 mb-5">
            <h2 className="font-medium text-sm">
              Elementos{" "}
              <span className="text-muted-foreground">
                {state.elements.length}
              </span>
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Añadir elemento"
                >
                  <Plus />
                  Añadir
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Nuevo elemento</DropdownMenuLabel>
                  {(Object.keys(names) as Kind[]).map((kind) => {
                    const Icon = icons[kind];
                    return (
                      <DropdownMenuItem key={kind} onSelect={() => add(kind)}>
                        <Icon />
                        {names[kind]}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-1">
            {state.elements.map((e) => {
              const Icon = icons[e.kind];
              return (
                <div
                  key={e.id}
                  className={cn(
                    "layer-row",
                    selected === e.id && "layer-selected",
                  )}
                >
                  <Button
                    data-layer={e.id}
                    variant="ghost"
                    className="min-w-0 flex-1 justify-start"
                    aria-pressed={e.id === selected}
                    onClick={() => setSelected(e.id)}
                  >
                    <Icon data-icon="inline-start" />
                    <span className="truncate">{e.name}</span>
                    {!e.visible && <EyeOff data-icon="inline-end" />}
                  </Button>
                  <Menu e={e} />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-6">
            Cada árbol es independiente. El menú ··· permite duplicar, ocultar o
            eliminar cualquier pieza.
          </p>
        </aside>
        <section className="stage-panel">
          <Card className="scene-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-normal tracking-widest text-muted-foreground">
                FIG. 01 · COMERCIO LOCAL
              </CardTitle>
              <CardDescription>SVG · ISOMÉTRICA</CardDescription>
            </CardHeader>
            <CardContent className="scene-content">
              <svg
                id="scene"
                ref={svg}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1000 760"
                role="group"
                aria-label="Escena isométrica editable. Arrastra una pieza o usa Tab y Enter para seleccionarla."
              />
            </CardContent>
            <CardFooter className="justify-between text-xs text-muted-foreground">
              <span>{element?.name || "Sin selección"}</span>
              <span>
                {reduced
                  ? "MOVIMIENTO REDUCIDO"
                  : state.global.paused
                    ? "EN PAUSA"
                    : `IDLE · ${state.global.duration} S`}
              </span>
            </CardFooter>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button
              id="pause"
              variant="outline"
              size="sm"
              aria-pressed={state.global.paused}
              onClick={() => global({ paused: !state.global.paused })}
            >
              {state.global.paused ? <Play /> : <Pause />}
              {state.global.paused ? "Reanudar" : "Pausar"}
            </Button>
            <Button
              id="reset"
              variant="ghost"
              size="sm"
              onClick={() => {
                setState(initialScene());
                setSelected("punto-7");
                setStatus("Escena original restaurada.");
              }}
            >
              <RotateCcw />
              Restablecer escena
            </Button>
          </div>
          <p
            id="status"
            role="status"
            aria-live="polite"
            className="text-xs text-muted-foreground"
          >
            {status}
          </p>
          <p className="text-xs text-muted-foreground">
            Arrastrar: clic y mover · Tamaño: <kbd>Alt</kbd> + rueda sobre la
            pieza · Rueda sin Alt: desplaza la página.
          </p>
        </section>
        <aside className="settings-panel">
          <Card className="inspector-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{element?.name || "Selecciona una pieza"}</CardTitle>
                {element && <Menu e={element} />}
              </div>
              <CardDescription>Propiedades del elemento</CardDescription>
            </CardHeader>
            <CardContent>
              {element ? (
                <FieldGroup key={element.id} id="object-controls">
                  <Field>
                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                    <Input
                      id="name"
                      value={element.name}
                      maxLength={80}
                      onChange={(e) =>
                        patch(element.id, { name: e.target.value })
                      }
                    />
                  </Field>
                  <Check
                    id="visible"
                    label="Visible"
                    value={element.visible}
                    onChange={(v) => patch(element.id, { visible: v })}
                  />
                  {floating(element) && (
                    <Field>
                      <FieldLabel id="orientation-label">
                        Orientación isométrica
                      </FieldLabel>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={element.orientation}
                        onValueChange={(v) => {
                          if (v)
                            patch(element.id, {
                              orientation: v as Orientation,
                            });
                        }}
                        aria-labelledby="orientation-label"
                        className="w-full"
                      >
                        {(["NE", "SE", "SO", "NO"] as Orientation[]).map(
                          (value) => (
                            <ToggleGroupItem
                              data-orientation-control={value}
                              key={value}
                              value={value}
                              className="flex-1"
                            >
                              {value}
                            </ToggleGroupItem>
                          ),
                        )}
                      </ToggleGroup>
                      <FieldDescription>
                        {element.orientation === "NE" ||
                        element.orientation === "NO"
                          ? element.kind === "punto"
                            ? "Vista posterior: rostro y sello quedan en la cara opuesta."
                            : "Vista posterior."
                          : "Vista frontal en tres cuartos."}
                      </FieldDescription>
                    </Field>
                  )}
                  <Color
                    id="fill"
                    label="Cuerpo"
                    value={element.fill}
                    onChange={(v) => patch(element.id, { fill: v })}
                  />
                  <Color
                    id="stroke"
                    label="Línea"
                    value={element.stroke}
                    onChange={(v) => patch(element.id, { stroke: v })}
                  />
                  {(element.kind === "shop" || element.kind === "punto") && (
                    <Color
                      id="accent"
                      label={element.kind === "punto" ? "Sello" : "Acento"}
                      value={element.accent}
                      onChange={(v) => patch(element.id, { accent: v })}
                    />
                  )}
                  {(
                    [
                      ["line", "Grosor · px", 0.2, 4, 0.05],
                      ["scale", "Tamaño", 0.3, 2.5, 0.01],
                      ["x", "Posición horizontal", -500, 500, 1],
                      ["y", "Posición vertical", -400, 400, 1],
                      ["opacity", "Opacidad", 0.1, 1, 0.01],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <Numeric
                      key={key}
                      id={key}
                      label={label}
                      value={element[key]}
                      min={min}
                      max={max}
                      step={step}
                      onChange={(v) => patch(element.id, { [key]: v })}
                    />
                  ))}
                  {!floating(element) && (
                    <Check
                      id="details"
                      label="Detalles"
                      value={element.details}
                      onChange={(v) => patch(element.id, { details: v })}
                    />
                  )}
                  {element.kind === "shop" && (
                    <Check
                      id="awning"
                      label="Toldo"
                      value={element.awning}
                      onChange={(v) => patch(element.id, { awning: v })}
                    />
                  )}
                  {floating(element) && (
                    <FieldSet>
                      <FieldLegend variant="label">
                        Idle de esta figura
                      </FieldLegend>
                      <FieldGroup>
                        <Numeric
                          id="amplitude"
                          label="Flotación · px"
                          value={element.amplitude}
                          min={0}
                          max={30}
                          onChange={(v) => patch(element.id, { amplitude: v })}
                        />
                        <Numeric
                          id="tilt"
                          label="Balanceo · °"
                          value={element.tilt}
                          min={0}
                          max={8}
                          step={0.5}
                          onChange={(v) => patch(element.id, { tilt: v })}
                        />
                        <Check
                          id="shadow"
                          label="Sombra"
                          value={element.shadow}
                          onChange={(v) => patch(element.id, { shadow: v })}
                        />
                      </FieldGroup>
                    </FieldSet>
                  )}
                </FieldGroup>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona una pieza del lienzo o añade una nueva desde
                  Elementos.
                </p>
              )}
            </CardContent>
          </Card>
          <Separator />
          <Card className="inspector-card">
            <CardHeader>
              <CardTitle>Escena</CardTitle>
              <CardDescription>Ajustes globales</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup id="global-controls">
                <Color
                  id="background"
                  label="Fondo"
                  value={state.global.background}
                  onChange={(v) => global({ background: v })}
                />
                <Numeric
                  id="zoom"
                  label="Zoom"
                  value={state.global.zoom}
                  min={0.65}
                  max={1.2}
                  step={0.01}
                  onChange={(v) => global({ zoom: v })}
                />
                <Numeric
                  id="duration"
                  label="Duración idle · s"
                  value={state.global.duration}
                  min={1}
                  max={12}
                  step={0.1}
                  onChange={(v) => global({ duration: v })}
                />
              </FieldGroup>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              {reduced
                ? "Tu sistema solicita movimiento reducido: las figuras permanecen quietas."
                : "Se respeta el movimiento reducido del sistema."}
            </CardFooter>
          </Card>
        </aside>
      </main>
    </>
  );
}
createRoot(document.getElementById("app")!).render(<App />);

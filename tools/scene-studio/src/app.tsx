import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Pause,
  Play,
  RotateCcw,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
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
import { Slider } from "@/components/base-ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/base-ui/tabs";
import wordmark from "../../../assets/identity/vecinoclub_logo_mono_light.svg";
import { SceneRenderer, download } from "./scene";
import {
  initialScene,
  createElement,
  duplicate,
  floating,
  names,
  clamp,
  type Kind,
  mapNames,
  type MapVariant,
  type ShopVariant,
  shopNames,
  type Orientation,
  type Element,
  type Scene,
  type StackMove,
  moveLayer,
  placeLayer,
} from "./model";
import {
  parseSceneDocument,
  MAX_DOCUMENT_BYTES,
  MAX_ELEMENTS,
} from "./scene-document";
import { MascotComparison } from "./mascot-comparison";
import { Color } from "./color-field";
import { LayerSidebar } from "./layer-sidebar";
import {
  SidebarProvider,
  SidebarMenuAction,
} from "@/components/base-ui/sidebar";
import { TooltipProvider } from "@/components/base-ui/tooltip";
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
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
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
function App() {
  const [state, setState] = useState<Scene>(initialScene);
  const [selected, setSelected] = useState("punto-7");
  const [panel, setPanel] = useState("element");
  const fileInput = useRef<HTMLInputElement>(null),
    importSequence = useRef(0);
  const [draggingFile, setDraggingFile] = useState(false);
  const [importNotice, setImportNotice] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  async function loadFiles(files: FileList | File[]) {
    if (!files.length) return;
    const request = ++importSequence.current;
    try {
      if (files.length !== 1)
        throw new Error("Carga un solo archivo JSON cada vez.");
      const file = files[0];
      if (file.size > MAX_DOCUMENT_BYTES)
        throw new Error(
          "El archivo supera el límite de 2 MiB. No se cargó nada.",
        );
      const text = await file.text();
      if (request !== importSequence.current) return;
      const document = parseSceneDocument(text);
      // Imports replace the complete scene, including IDs whose type may change.
      renderer.current = new SceneRenderer(svg.current!);
      setState(document);
      selectElement(
        document.elements.filter((e) => e.visible).at(-1)?.id || "",
      );
      const message = `Cargado «${file.name}»: ${document.elements.length} elementos, formato ${document.version}.`;
      setImportNotice({ error: false, text: message });
      setStatus(message);
    } catch (error) {
      if (request === importSequence.current)
        setImportNotice({
          error: true,
          text:
            error instanceof Error
              ? error.message
              : "No se pudo leer el archivo JSON. No se cargó nada.",
        });
    }
  }

  function selectElement(id: string) {
    setSelected(id);
    setPanel("element");
  }
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
  function add(
    kind: Kind,
    mapVariant: MapVariant = "barrio",
    shopVariant: ShopVariant = "generico",
  ) {
    if (state.elements.length >= MAX_ELEMENTS) {
      setStatus(
        `Límite de ${MAX_ELEMENTS} elementos. Elimina una pieza para añadir otra.`,
      );
      return;
    }
    const e = createElement(kind);
    e.mapVariant = mapVariant;
    e.shopVariant = shopVariant;
    if (kind === "shop") e.name = shopNames[shopVariant];
    if (kind === "map") e.name = `Mapa · ${mapNames[mapVariant]}`;
    e.x =
      kind === "isotipo"
        ? 220
        : kind === "gota"
          ? -170
          : kind === "tree"
            ? 220
            : kind === "shop"
              ? 160
              : 25;
    e.y =
      kind === "isotipo"
        ? 70
        : kind === "gota"
          ? 60
          : kind === "tree"
            ? 160
            : kind === "shop"
              ? 60
              : 25;
    if (kind === "isotipo") e.scale = 0.6;
    setState((s) => {
      const elements = [...s.elements];
      const index =
        e.kind === "map"
          ? elements.map((item) => item.kind).lastIndexOf("map") + 1
          : elements.length;
      elements.splice(index, 0, e);
      return { ...s, elements };
    });
    selectElement(e.id);
    setStatus(`${e.name} añadido.`);
  }
  function copy(e: Element) {
    if (state.elements.length >= MAX_ELEMENTS) {
      setStatus(
        `Límite de ${MAX_ELEMENTS} elementos. Elimina una pieza para duplicar otra.`,
      );
      return;
    }
    const next = duplicate(e);
    setState((s) => {
      const elements = [...s.elements],
        index = elements.findIndex((item) => item.id === e.id);
      elements.splice(index + 1, 0, next);
      return { ...s, elements };
    });
    selectElement(next.id);
    setStatus(`${next.name} añadido.`);
  }
  function remove(e: Element) {
    setState((s) => ({
      ...s,
      elements: s.elements.filter((item) => item.id !== e.id),
    }));
    if (selected === e.id) selectElement("");
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
      selectElement(id);
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
      selectElement(id);
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
        selectElement(target.dataset.object!);
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
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) =>
      event.dataTransfer?.types.includes("Files");
    const enter = (event: DragEvent) => {
      if (hasFiles(event)) {
        depth++;
        setDraggingFile(true);
      }
    };
    const over = (event: DragEvent) => {
      if (hasFiles(event)) {
        event.preventDefault();
        event.dataTransfer!.dropEffect = "copy";
      }
    };
    const leave = (event: DragEvent) => {
      if (hasFiles(event)) {
        depth = Math.max(0, depth - 1);
        if (!depth) setDraggingFile(false);
      }
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDraggingFile(false);
      void loadFiles(event.dataTransfer!.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);
  function reorder(e: Element, direction: StackMove) {
    setState((s) => ({
      ...s,
      elements: moveLayer(s.elements, e.id, direction),
    }));
    setStatus(`Orden de ${e.name} actualizado.`);
  }
  function dropLayer(id: string, target: string, edge: "above" | "below") {
    setState((s) => ({
      ...s,
      elements: placeLayer(s.elements, id, target, edge),
    }));
    setStatus("Orden de apilado actualizado.");
  }
  function Menu({ e, sidebar = false }: { e: Element; sidebar?: boolean }) {
    const index = state.elements.findIndex((item) => item.id === e.id);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {sidebar ? (
            <SidebarMenuAction aria-label={`Menú de ${e.name}`}>
              <MoreHorizontal />
            </SidebarMenuAction>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Menú de ${e.name}`}
            >
              <MoreHorizontal />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{e.name}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => selectElement(e.id)}>
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
            <DropdownMenuLabel>Orden de apilado</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={index === state.elements.length - 1}
              onSelect={() => reorder(e, "front")}
            >
              <ArrowUpToLine />
              Traer al frente
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === state.elements.length - 1}
              onSelect={() => reorder(e, "up")}
            >
              <ChevronUp />
              Subir un nivel
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === 0}
              onSelect={() => reorder(e, "down")}
            >
              <ChevronDown />
              Bajar un nivel
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === 0}
              onSelect={() => reorder(e, "back")}
            >
              <ArrowDownToLine />
              Enviar al fondo
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
        <div className="studio-identity">
          <span
            className="brand-logo"
            role="img"
            aria-label="VecinoClub"
            dangerouslySetInnerHTML={{
              __html: wordmark.slice(wordmark.indexOf("<svg")),
            }}
          />
          <span className="header-separator" />
          <h1>Escena isométrica</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MascotComparison />
          <input
            type="file"
            hidden
            ref={fileInput}
            accept=".json,application/json"
            aria-label="Archivo JSON de escena"
            onChange={(event) => {
              const files = [...(event.currentTarget.files || [])];
              event.currentTarget.value = "";
              void loadFiles(files);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            id="load-json"
            onClick={() => fileInput.current?.click()}
          >
            Cargar JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
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
            size="sm"
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
      {importNotice && (
        <div
          className="import-notice"
          data-error={importNotice.error}
          role={importNotice.error ? "alert" : undefined}
        >
          <span>{importNotice.text}</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar aviso de importación"
            onClick={() => setImportNotice(null)}
          >
            Cerrar
          </Button>
        </div>
      )}
      {draggingFile && (
        <div className="file-drop-overlay" aria-hidden="true">
          <div>Suelta tu JSON para cargar la escena</div>
        </div>
      )}
      <main>
        <TooltipProvider>
          <SidebarProvider
            className="studio-layout min-h-0"
            style={
              {
                "--sidebar-width": "var(--studio-sidebar-width)",
              } as React.CSSProperties
            }
          >
            <LayerSidebar
              elements={state.elements}
              selected={selected}
              onSelect={selectElement}
              onAdd={add}
              onDrop={dropLayer}
              renderMenu={(e) => <Menu e={e} sidebar />}
            />
            <section className="stage-panel">
              <Card className="scene-card">
                <CardHeader className="stage-heading">
                  <div>
                    <CardTitle>Lienzo</CardTitle>
                    <CardDescription>1000 × 760 · SVG</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      id="pause"
                      variant="ghost"
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
                      size="icon"
                      aria-label="Restablecer escena"
                      onClick={() => {
                        importSequence.current++;
                        setImportNotice(null);
                        setState(initialScene());
                        selectElement("punto-7");
                        setStatus("Escena original restaurada.");
                      }}
                    >
                      <RotateCcw />
                    </Button>
                  </div>
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
                <CardFooter className="stage-footer">
                  <span>{element?.name || "Sin selección"}</span>
                  <span>
                    {reduced
                      ? "Movimiento reducido"
                      : state.global.paused
                        ? "En pausa"
                        : `Idle · ${state.global.duration} s`}
                  </span>
                </CardFooter>
              </Card>
              <p id="status" role="status" aria-live="polite">
                {status}
              </p>
            </section>
            <aside className="settings-panel">
              <Tabs
                value={panel}
                onValueChange={(value) => setPanel(String(value))}
                className="settings-tabs"
              >
                <TabsList className="settings-tabs-list">
                  <TabsTrigger value="element">Elemento</TabsTrigger>
                  <TabsTrigger value="scene">Escena</TabsTrigger>
                </TabsList>
                <TabsContent value="element">
                  {" "}
                  <Card className="inspector-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {element?.name || "Selecciona una pieza"}
                        </CardTitle>
                        {element && <Menu e={element} />}
                      </div>
                      <CardDescription>
                        Propiedades del elemento
                      </CardDescription>
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
                          {element.kind === "map" && (
                            <Field>
                              <FieldLabel id="map-style-label">
                                Variante de mapa
                              </FieldLabel>
                              <ToggleGroup
                                type="single"
                                variant="outline"
                                value={element.mapVariant}
                                onValueChange={(value) => {
                                  if (value)
                                    patch(element.id, {
                                      mapVariant: value as MapVariant,
                                    });
                                }}
                                aria-labelledby="map-style-label"
                                className="w-full flex-wrap"
                              >
                                {(Object.keys(mapNames) as MapVariant[]).map(
                                  (value) => (
                                    <ToggleGroupItem
                                      data-map-variant-control={value}
                                      key={value}
                                      value={value}
                                      className="flex-1"
                                    >
                                      {mapNames[value]}
                                    </ToggleGroupItem>
                                  ),
                                )}
                              </ToggleGroup>
                            </Field>
                          )}
                          {(floating(element) ||
                            ["shop", "map", "bench"].includes(
                              element.kind,
                            )) && (
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
                                {(
                                  ["NE", "SE", "SO", "NO"] as Orientation[]
                                ).map((value) => (
                                  <ToggleGroupItem
                                    data-orientation-control={value}
                                    key={value}
                                    value={value}
                                    className="flex-1"
                                  >
                                    {value}
                                  </ToggleGroupItem>
                                ))}
                              </ToggleGroup>
                              <FieldDescription>
                                {element.orientation === "NE" ||
                                element.orientation === "NO"
                                  ? element.kind === "punto" ||
                                    element.kind === "gota"
                                    ? "Vista posterior: el rostro queda en la cara opuesta."
                                    : "Vista posterior."
                                  : "Vista frontal en tres cuartos."}
                              </FieldDescription>
                            </Field>
                          )}
                          <Check
                            id="flipX"
                            label="Reflejar horizontalmente"
                            value={element.flipX}
                            onChange={(v) => patch(element.id, { flipX: v })}
                          />
                          {element.kind === "shop" && (
                            <Field>
                              <FieldLabel htmlFor="shop-variant">
                                Tipo de comercio
                              </FieldLabel>
                              <select
                                id="shop-variant"
                                className="shop-variant"
                                value={element.shopVariant}
                                onChange={(event) =>
                                  patch(element.id, {
                                    shopVariant: event.target
                                      .value as ShopVariant,
                                  })
                                }
                              >
                                {(Object.keys(shopNames) as ShopVariant[]).map(
                                  (value) => (
                                    <option key={value} value={value}>
                                      {shopNames[value]}
                                    </option>
                                  ),
                                )}
                              </select>
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
                          {(element.kind === "shop" ||
                            element.kind === "punto" ||
                            element.kind === "gota" ||
                            element.kind === "map") && (
                            <Color
                              id="accent"
                              label={
                                element.kind === "punto"
                                  ? "Sello"
                                  : element.kind === "gota"
                                    ? "Ojos y brillo"
                                    : element.kind === "map"
                                      ? "Senderos"
                                      : "Acento"
                              }
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
                              onChange={(v) =>
                                patch(element.id, { details: v })
                              }
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
                                  onChange={(v) =>
                                    patch(element.id, { amplitude: v })
                                  }
                                />
                                <Numeric
                                  id="tilt"
                                  label="Balanceo · °"
                                  value={element.tilt}
                                  min={0}
                                  max={8}
                                  step={0.5}
                                  onChange={(v) =>
                                    patch(element.id, { tilt: v })
                                  }
                                />
                                {element.kind === "gota" && (
                                  <>
                                    <Check
                                      id="spinning"
                                      label="Girar sobre su eje"
                                      value={element.spinning}
                                      onChange={(v) =>
                                        patch(element.id, { spinning: v })
                                      }
                                    />
                                    <Numeric
                                      id="spin"
                                      label="Giro · s por vuelta"
                                      value={element.spin}
                                      min={1}
                                      max={30}
                                      step={0.5}
                                      onChange={(v) =>
                                        patch(element.id, { spin: v })
                                      }
                                    />
                                    <Numeric
                                      id="shine"
                                      label="Brillo"
                                      value={element.shine}
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      onChange={(v) =>
                                        patch(element.id, { shine: v })
                                      }
                                    />
                                  </>
                                )}
                                <Check
                                  id="shadow"
                                  label="Sombra"
                                  value={element.shadow}
                                  onChange={(v) =>
                                    patch(element.id, { shadow: v })
                                  }
                                />
                              </FieldGroup>
                            </FieldSet>
                          )}
                        </FieldGroup>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Selecciona una pieza del lienzo o añade una nueva
                          desde Elementos.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="scene">
                  {" "}
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
                </TabsContent>
              </Tabs>
            </aside>
          </SidebarProvider>
        </TooltipProvider>
      </main>
    </>
  );
}
createRoot(document.getElementById("app")!).render(<App />);

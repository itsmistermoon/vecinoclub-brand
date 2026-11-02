import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/base-ui/slider";
import sheet from "../../../assets/mascot/_sheets/punto-vistas.png";
import {
  comparisonBody,
  comparisonStyle,
  comparisonViews,
  reference,
  measureMascot,
  metrics,
  deviations,
} from "./mascot-calibration";
const svgStyle = {
  "--fill": "#fb7629",
  "--stroke": "#fb7629",
  "--line": 0,
} as React.CSSProperties;
function ComparisonContent() {
  const [view, setView] = useState(0),
    [mode, setMode] = useState("side"),
    [opacity, setOpacity] = useState(0.5),
    [guides, setGuides] = useState(true);
  const [rows, setRows] = useState<ReturnType<typeof deviations>>([]),
    model = useRef<SVGSVGElement>(null);
  const source = reference.views[view],
    scale = 172 / (source.full[3] - source.full[1]),
    headCenter = (source.head[0] + source.head[2]) / 2,
    top = source.full[1];
  const body = comparisonBody(view);
  useEffect(() => {
    let active = true;
    measureMascot(model.current!).then((boxes) => {
      if (active) setRows(deviations(metrics(boxes), metrics(source)));
    });
    return () => {
      active = false;
    };
  }, [view]);
  const raster = (
    <g
      data-comparison-reference=""
      clipPath={`url(#reference-clip-${view})`}
      opacity={mode === "overlay" ? opacity : 1}
    >
      <defs>
        <clipPath id={`reference-clip-${view}`}>
          <rect
            x={(source.roi[0] - headCenter) * scale}
            y={(source.roi[1] - top) * scale}
            width={(source.roi[2] - source.roi[0]) * scale}
            height={(source.roi[3] - source.roi[1]) * scale}
          />
        </clipPath>
      </defs>
      <image
        href={sheet}
        x={-headCenter * scale}
        y={-top * scale}
        width={reference.size[0] * scale}
        height={reference.size[1] * scale}
      />
    </g>
  );
  const annotations = guides && (
    <g data-comparison-reference="">
      {[
        source.head,
        ...source.eyes,
        source.smile,
        source.seal,
        source.arm,
        source.tip,
      ].map((b, i) => (
        <rect
          key={i}
          x={(b[0] - headCenter) * scale}
          y={(b[1] - top) * scale}
          width={(b[2] - b[0]) * scale}
          height={Math.max(0.5, (b[3] - b[1]) * scale)}
          fill="none"
          stroke="#56cfe1"
          strokeWidth=".45"
        />
      ))}
    </g>
  );
  return (
    <>
      <div className="comparison-controls">
        <ToggleGroup
          type="single"
          value={String(view)}
          onValueChange={(v) => v && setView(Number(v))}
          aria-label="Vista de comparación"
          variant="outline"
        >
          {comparisonViews.map((v, i) => (
            <ToggleGroupItem
              key={v.name}
              value={String(i)}
              data-comparison-view={i}
            >
              {v.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v)}
          aria-label="Modo de comparación"
          variant="outline"
        >
          <ToggleGroupItem value="side">Lado a lado</ToggleGroupItem>
          <ToggleGroupItem value="overlay">Superposición</ToggleGroupItem>
        </ToggleGroup>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={guides}
            onChange={(e) => setGuides(e.target.checked)}
          />
          Medidas de referencia
        </label>
      </div>
      {mode === "overlay" && (
        <div className="comparison-opacity">
          <label id="reference-opacity-label">
            Opacidad de la hoja: {Math.round(opacity * 100)} %
          </label>
          <Slider
            value={[opacity]}
            min={0}
            max={1}
            step={0.01}
            aria-labelledby="reference-opacity-label"
            onValueChange={(v) => setOpacity(Array.isArray(v) ? v[0] : v)}
          />
        </div>
      )}
      <div
        className={`comparison-canvases ${mode === "overlay" ? "comparison-overlay" : ""}`}
      >
        {mode === "side" && (
          <figure>
            <figcaption>
              Hoja original · {comparisonViews[view].label}
            </figcaption>
            <svg
              viewBox="-85 -5 170 185"
              role="img"
              aria-label="Referencia canónica"
            >
              {raster}
              {annotations}
            </svg>
          </figure>
        )}
        <figure>
          <figcaption>
            {mode === "side"
              ? "Modelo SVG calibrado"
              : "Hoja sobre modelo · escala uniforme"}
          </figcaption>
          <svg
            ref={model}
            data-comparison-model={view}
            viewBox="-85 -5 170 185"
            style={svgStyle}
            aria-label="Modelo de Punto en la misma vista"
            role="img"
          >
            <g
              dangerouslySetInnerHTML={{
                __html: "<style>" + comparisonStyle + "</style>" + body,
              }}
            />
            {mode === "overlay" && (
              <>
                {raster}
                {annotations}
              </>
            )}
          </svg>
        </figure>
      </div>
      <p className="comparison-method">
        Registro por altura total y centro horizontal de la cabeza; solo escala
        uniforme y traslación. Cámaras niveladas: frente 0°, tres cuartos 37°,
        perfil 90°. No se aplana la foto para hacerla coincidir con el modelo.
        El idle se muestra quieto aquí; la escena conserva su animación.
      </p>
      <div className="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Medida normalizada</th>
              <th>Hoja</th>
              <th>Modelo</th>
              <th>Error relativo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} data-measurement={row.name}>
                <td>{row.name}</td>
                <td>{row.target.toFixed(4)}</td>
                <td>{row.actual.toFixed(4)}</td>
                <td data-within-tolerance={row.error <= 0.05}>
                  {(row.error * 100).toFixed(2)} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="comparison-method">
        Fuente: assets/mascot/_sheets/punto-vistas.png (1774 × 887). Cabeza
        segmentada hasta el cuello y rasgos por umbrales de color; extremos de
        brazos anotados con incertidumbre de ±4 px. Medidas guardadas en
        mascot-reference.json. Envergadura = ancho total de la silueta,
        incluidos brazos; altura del brazo se mide aparte. La tolerancia es ±5 %
        relativa a cada medida de referencia. Las coincidencias geométricas no
        certifican textura ni identidad artística.
      </p>
      <details>
        <summary>Ver hoja original completa</summary>
        <img
          src={sheet}
          alt="Hoja canónica de Punto: frente, tres cuartos y perfil"
          className="comparison-original"
        />
      </details>
    </>
  );
}
export function MascotComparison() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" size="sm" />}>
        Comparar Punto
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="comparison-backdrop" />
        <Dialog.Popup className="comparison-dialog">
          <div className="comparison-heading">
            <div>
              <Dialog.Title className="font-semibold">
                Punto · comparación medible
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                Referencia canónica y modelo, sin alterar la cámara de la
                escena.
              </Dialog.Description>
            </div>
            <Dialog.Close render={<Button variant="outline" size="sm" />}>
              Cerrar
            </Dialog.Close>
          </div>
          <ComparisonContent />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

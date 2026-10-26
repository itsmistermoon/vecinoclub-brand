# Taller de escena isométrica

Abrir **`tools/escena-isometrica.html` directamente en Chrome**. Incluye interfaz shadcn, React, estilos, fuentes y escena SVG; no requiere servidor, instalación ni red al abrirlo. Es una herramienta de diseño: no modifica ni compila la landing.

## Edición

La lista selecciona cada pieza; también se selecciona desde el dibujo o con Tab y Enter/Espacio. Cada elemento tiene un menú `···` para editar, ocultar/mostrar, duplicar o eliminar. El botón **+** de Elementos ofrece comercio, árbol, banco con jardinera, Punto, isotipo y tres mapas: **Barrio**, **Cruce** y **Plaza**. Cada Mapa permite cambiar su variante desde el inspector: Barrio conserva la cuadrícula original; Cruce añade avenidas, cruces peatonales y manzanas; Plaza dispone anillos y senderos alrededor del comercio. Son variantes de una pieza, no presets globales. Los tres árboles iniciales son independientes. El inspector tiene Tabs reales de shadcn: **Elemento** muestra la pieza seleccionada; **Escena** separa fondo, zoom y duración global. La interfaz usa el tema oscuro de DESIGN.md y `tokens/vecinoclub.css`, con Rubik para los controles y Barlow Condensed para el título. El encabezado utiliza el logotipo monocromo claro oficial sin modificar sus proporciones.

- **Mover:** mantener clic izquierdo sobre la pieza y arrastrar. Los deslizadores de posición usan las mismas coordenadas. La captura del puntero permite terminar el gesto fuera de la figura; cancelar o soltar libera el arrastre.
- **Tamaño:** mantener **Alt y girar la rueda sobre la pieza**. La rueda sin Alt conserva el desplazamiento normal de la página. El inspector ofrece el mismo tamaño mediante deslizador y teclado.
- **Orientación:** Punto e isotipo tienen un grupo NE, SE, SO, NO. SE/SO muestran el frente en tres cuartos; NE/NO muestran el dorso. La cara y el sello de Punto quedan ocultos en las vistas posteriores. El cambio gira la geometría 3D antes de proyectar; no aplica una rotación 2D al dibujo.
- **Hover:** se ilumina la silueta exterior. El filtro construye un borde desde el alfa de la figura y excluye el interior; para el isotipo la fuente del borde rellena provisionalmente el hueco, de modo que el aro interior no se ilumina. Ni las líneas interiores ni las caras se recolorean. El foco de teclado ofrece el mismo contorno.
- **Idle:** flotación, balanceo y sombra pertenecen a cada figura; duración y pausa son globales. El bucle conserva sus extremos y tangentes. Cambiar orientación conserva el nodo animado. `prefers-reduced-motion: reduce` detiene el idle tanto en el editor como en el SVG exportado.

Los controles permiten sacar piezas del encuadre deliberadamente. El lienzo de exportación sigue siendo 1000 × 760. No hay importación JSON ni presets.

## Volumen y marca

El entorno utiliza la proyección de planos iso-figure. Las figuras utilizan las curvas de revolución y el kit SVG de **Anatomy**, con un módulo propio en `scene-studio/src/characters.ts`. La cámara de Anatomy se configura con azimut 45°, elevación `atan(1/√2)` y escala `√(1.5/1.6)`: sus ejes proyectados coinciden con `(x−y) cos(30°), (x+y) sin(30°)−z` del entorno. Las cuatro orientaciones son giros reales de 90° alrededor del eje vertical. Las normales determinan visibilidad y bandas de luz; las piezas se ordenan por profundidad.

La cabeza de Punto es una esfera de radio 39, con el mismo radio en X, Y y Z, generada con `sphereOf` de Anatomy. Su contorno proyectado se expresa como dos arcos circulares exactos y sus bandas de luz se calculan sobre la esfera 3D. El torso y los brazos son perfiles de revolución de sección circular: no se comprime la base Y. Ojos, boca y sello siguen sus superficies curvas. Conserva cabeza dominante (~44 % de la altura), torso más estrecho, dos ojos ovalados con reflejos, boca corta, brazos cortos, sello marfil y una sola punta inferior. El contorno, el volumen y las bandas son SVG; no se reproduce textura raster de peluche. El isotipo se deriva del contorno canónico de `assets/identity/vecinoclub_isotipo_color.svg`, con espesor real, abertura y punto superior separados. No se modifica el activo oficial.

Colores y superficies de la interfaz proceden de la variante oscura de `tokens/vecinoclub.css`, mapeados a tokens semánticos shadcn. El HTML declara `class="dark" data-theme="dark"`; los valores iniciales del lienzo y sus piezas usan superficies oscuras de la misma paleta. Rubik y Barlow Condensed se incrustan con sus licencias OFL. El naranja de Punto y el marfil siguen `assets/mascot/GENERATION_GUIDE.md`.

## Guardar y exportar

**Guardar JSON** descarga el documento de diseño, versión 3: lista de elementos con identificadores únicos, tipos, nombres, orientaciones, propiedades, variante de mapa y ajustes globales. Duplicar, borrar, arrastrar o usar la rueda modifica ese mismo documento. No hay compatibilidad con el esquema anterior.

**Exportar SVG** descarga únicamente la escena, con superficies, proyección, geometría de la orientación vigente, animaciones, pausa, movimiento reducido y configuración en `<metadata>`. Conserva piezas añadidas, duplicadas, ocultas y sus propiedades. Excluye paneles, menús, filtro y superposición de hover, y scripts. Ambos botones usan Blob y XMLSerializer; no necesitan servicios externos.

## Comparación de motores y licencias

Se renderizaron **24 vistas**: Punto e isotipo × NE/SE/SO/NO × iso-figure, Colorfigures y Anatomy. Se usaron las mismas proporciones objetivo, anatomía, contorno del isotipo, color de marca y proyección. Se compararon con las vistas de mascota, la referencia hairline de la escena y la galería Plinth. El HTML y la lámina de comparación están en el expediente externo de firstmate, junto con las ocho capturas del editor final.

| Opción probada | Resultado observado | Decisión |
| --- | --- | --- |
| iso-figure: proyección y malla de caras propia | Volumen legible y tonos suaves; en la cabeza de Punto quedan facetas y bandas horizontales que se ven rígidas. El isotipo extruido mantiene buena lectura. | Se conserva para comercio y entorno, pero no para las curvas de Punto. |
| Colorfigures: `core.js`, `loft`, `toneI`, `hullInk` | Las cuatro vistas tienen volumen real. La silueta de tinta y las bandas oscuras hacen a Punto más duro que la mascota y más pesado frente al entorno hairline. El isotipo se parece mucho al resto. | No se incorpora su motor al entregable. El resultado no justifica un segundo motor ni su estilo de tinta. |
| Anatomy: `iso-kit.mjs`, `lathe.mjs` | Perfiles suaves, siluetas continuas y curvas de luz más apropiadas para la cabeza y el torso semiorgánicos. Mantiene la punta, el sello y los brazos en las vistas frontales. Su cámara se alinea con la del entorno. | **Elegida para las figuras**, con bandas de luz derivadas de los colores de marca y de menor contraste. |

La evaluación de Anatomy incluyó `references/craft.md`, los perfiles de `lathe`, `sphereOf`, `cylinder`, `disc`, `prismOf`, las curvas/siluetas y el ejemplo `examples/dial-indicator/build.mjs`. Para Punto se combina una esfera real con perfiles suaves de revolución de sección circular; para el isotipo se proyecta y extruye su contorno, con hueco real y caras visibles según la orientación. No se necesita WebGL, canvas ni un servicio en tiempo de ejecución. **No se copió ninguna ilustración de Plinth**: su captura y galería se usaron solo como referencia visual; su licencia de ilustraciones no está comprobada.

| Fuente | Licencia verificada antes de copiar | Uso |
| --- | --- | --- |
| [Anatomy](https://github.com/wheresryan22/anatomy) | [MIT, © 2026 Ryan](https://github.com/wheresryan22/anatomy/blob/main/LICENSE) | Kit de proyección y curvas, vendorizado sin modificaciones con LICENSE en `scene-studio/src/vendor/anatomy/`. |
| [iso-figure](https://github.com/MrBongoC/ai-iso-skill) | [MIT, © 2026 Tolga Cohce](https://github.com/MrBongoC/ai-iso-skill/blob/main/LICENSE) | Pequeño núcleo de proyección de planos para el entorno. |
| [Colorfigures](https://april-zhu.com/colorfigures) | MIT, © 2026 April Zhu y Tolga Cohce, comprobada en `colorfigures/LICENSE` del [paquete oficial](https://april-zhu.com/colorfigures/colorfigures.tar.gz) | Código utilizado solo en el prototipo comparativo externo; no se distribuye en el editor. |
| [shadcn/ui y skill](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn) | [MIT, © 2023 shadcn](https://github.com/shadcn-ui/ui/blob/main/LICENSE) | Componentes reales obtenidos por CLI: Button, Card, Field, ToggleGroup, DropdownMenu, Slider, Switch, Tabs, Input y sus dependencias. |
| [Hairline](https://github.com/lucasmarkes/hairline) | [MIT, © 2026 Lucas Marques](https://github.com/lucasmarkes/hairline/blob/main/LICENSE) | Referencia estética. Su kernel/bench de una figura y un gesto no se incorpora al editor de varias piezas. |
| [Anatomy Asset](https://github.com/Teddarific/skills/tree/main/skills/anatomy-asset) | [MIT, © 2026 Ryan](https://github.com/Teddarific/skills/blob/main/skills/anatomy-asset/LICENSE); README declara adiciones bajo MIT | Evaluada; su dirección de activos densos a cuatro tonos no aporta al editor. Se usa directamente el kit de Anatomy. |
| [Isoglow](https://isoglow.dev/) | MIT, © 2026 April Zhu y Tolga Cohce, comprobada en `iso-glow/LICENSE` del [paquete oficial](https://iso-glow.vercel.app/iso-glow.tar.gz) | Evaluada; iluminación oscura y resplandor se alejan de la escena. No se copia código. |

Los avisos MIT, OFL y los avisos de las dependencias de ejecución se incrustan en comentarios del HTML. Las fuentes de shadcn usan sus variantes y composición, con los tokens de marca; la compilación de autoría permite distribuir un HTML autónomo sin reemplazar sus componentes por imitaciones. Solo se ajustaron imports del helper `cn`, el color semántico del control de tamaño y la asociación accesible entre etiquetas y thumbs de Slider.

## Fuentes, compilación y pruebas

Las fuentes mantenibles están en `tools/scene-studio/`; `tools/escena-isometrica.html` es el artefacto generado. No editar el bundle a mano. Desde el directorio de fuentes:

```sh
npm ci
npm run typecheck
npm run build
npm test
```

La compilación usa esbuild y Tailwind para incrustar todo, incluidas fuentes y avisos de licencia. **Solo la autoría y las pruebas necesitan Node/npm**. `npm test` usa Playwright Core y Google Chrome instalado, con un contexto offline. Escribe capturas y resultados en un directorio temporal, o en la ruta definida por `SCENE_EVIDENCE_DIR`.

Las pruebas ejecutan la interfaz pública: cuatro orientaciones por figura y su geometría, circularidad y radio proyectado de la cabeza, las tres variantes de mapa y su exportación, tokens oscuros, idle, extremos de sliders, arrastre real con ratón, rueda con y sin Alt, hover exterior sin recolorear interiores, menús, alta/baja/duplicación, descarga JSON/SVG y concordancia de metadata, movimiento reducido real con control negativo, continuidad del bucle y móvil de 390 px sin desbordamiento horizontal. La revisión independiente por no-mistakes se hace después del primer handoff del HTML actualizado.

Resultado local de la revisión oscura: 124 comprobaciones en Chrome, sin errores de consola y con contexto offline; TypeScript aprobado. La tolerancia de 0,02 px en el muestreo del círculo cubre la aproximación numérica de `getPointAtLength` de Chrome; el modelo utiliza radios X/Y/Z idénticos y arcos SVG circulares exactos. Las capturas actualizadas están en el expediente externo `studio-v3/`. La primera entrega de esta revisión es el HTML para prueba; no implica que el nuevo commit ya esté publicado o haya pasado la siguiente revisión independiente.

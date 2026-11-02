# Taller de escena isométrica

Abrir **`tools/escena-isometrica.html` directamente en Chrome**. Incluye interfaz shadcn, React, estilos, fuentes y escena SVG; no requiere servidor, instalación ni red al abrirlo. Es una herramienta de diseño: no modifica ni compila la landing.

## Edición

La lista selecciona cada pieza; también se selecciona desde el dibujo o con Tab y Enter/Espacio. Cada elemento tiene un menú `···` para editar, ocultar/mostrar, duplicar o eliminar. El botón **+** de Elementos ofrece comercio, árbol, banco con jardinera, Punto, isotipo y cuatro mapas: **Compacto**, **Barrio**, **Cruce** y **Plaza**. El menú Comercios con toldo añade **Comercio**, **Cafetería**, **Panadería**, **Florería** y **Almacén** como piezas independientes. El inspector permite cambiar el tipo de cualquier comercio; cada diseño tiene proporciones, cubierta y detalles propios (taza y taburetes, pan y cubierta escalonada, flores y jardineras, carro y cajas). Cada Mapa permite cambiar su variante desde el inspector: Compacto tiene una base cuadrada de 300 × 300 unidades con una calle y cruce peatonal; Barrio conserva la cuadrícula original; Cruce añade avenidas, cruces peatonales y manzanas; Plaza dispone anillos y senderos alrededor del comercio. Son variantes de una pieza, no presets globales. Los tres árboles iniciales son independientes. La lista usa el Sidebar oficial de shadcn Base UI. El inspector utiliza los Slider y Tabs oficiales de la misma variante: **Elemento** muestra la pieza seleccionada; **Escena** separa fondo, zoom y duración global. La interfaz usa el tema oscuro de DESIGN.md y `tokens/vecinoclub.css`, con Rubik para los controles y Barlow Condensed para el título. El encabezado utiliza el logotipo monocromo claro oficial sin modificar sus proporciones.

- **Apilar:** la lista muestra delante arriba y fondo abajo. El menú de cada pieza y del inspector ofrece **Traer al frente**, **Subir un nivel**, **Bajar un nivel** y **Enviar al fondo**; las acciones sin efecto se desactivan en los extremos. En escritorio, arrastrar el asa de puntos coloca la pieza antes o después de la fila señalada. Cambiar el orden conserva el idle en marcha. Un mapa nuevo se inserta sobre los mapas existentes y detrás de las otras piezas iniciales; una copia queda inmediatamente delante de su original. Mover por el lienzo no cambia el apilado.
- **Mover:** mantener clic izquierdo sobre la pieza y arrastrar. Los deslizadores de posición usan las mismas coordenadas. La captura del puntero permite terminar el gesto fuera de la figura; cancelar o soltar libera el arrastre.
- **Tamaño:** mantener **Alt y girar la rueda sobre la pieza**. La rueda sin Alt conserva el desplazamiento normal de la página. El inspector ofrece el mismo tamaño mediante deslizador y teclado.
- **Reflejar:** cada pieza dispone de un interruptor de reflexión horizontal alrededor de su ancla. El reflejo conserva posición, tamaño, orden, controles de arrastre e idle.
- **Color:** cada campo combina una entrada HEX con un selector de saturación/brillo y tono, utilizable con ratón, tacto y teclado. La paleta ofrece los colores de marca; Escape, clic exterior o Listo cierran el selector.
- **Orientación:** mapas, banco/jardinera, comercios, Punto e isotipo tienen un grupo NE, SE, SO, NO. El comercio inicial está orientado SE, con su fachada y toldo mirando hacia la derecha. Los comercios recalculan planos visibles y orden por profundidad al girar. Mapas y banco/jardinera giran sus ejes de mundo 90° alrededor de su propia ancla de suelo, incluyendo el dibujo de calles, asiento, respaldo y planta; el giro no es una rotación plana del SVG ni un reflejo. SE/SO muestran el frente en tres cuartos; NE/NO muestran el dorso. La cara y el sello de Punto quedan ocultos en las vistas posteriores. El cambio gira la geometría 3D antes de proyectar; no aplica una rotación 2D al dibujo.
- **Hover:** se ilumina la silueta exterior. El filtro construye un borde desde el alfa de la figura y excluye el interior; para el isotipo la fuente del borde rellena provisionalmente el hueco, de modo que el aro interior no se ilumina. Ni las líneas interiores ni las caras se recolorean. El foco de teclado ofrece el mismo contorno.
- **Idle:** flotación, balanceo y sombra pertenecen a cada figura; duración y pausa son globales. El bucle conserva sus extremos y tangentes. Cambiar orientación conserva el nodo animado. `prefers-reduced-motion: reduce` detiene el idle tanto en el editor como en el SVG exportado.

Los controles permiten sacar piezas del encuadre deliberadamente. El lienzo de exportación sigue siendo 1000 × 760. No hay presets globales; la configuración se guarda y restaura como documento JSON.

## Gota

**Gota** es un personaje genérico de versión pública: gota invertida (punta abajo, bulbo redondo arriba) con volumen real, creada con la misma técnica de superficie de revolución que Punto. Tiene dos ojos como trazos blancos con inclinación opuesta y un brillo en curva en el costado superior izquierdo; es una pieza propia, sin relación con personajes existentes. El inspector ofrece cuerpo, línea, **Ojos y brillo** (color), **Brillo** (intensidad 0–1), **Girar sobre su eje**, **Giro · s por vuelta** (1–30), orientación NE/SE/SO/NO (fase inicial del giro o pose fija), reflejo, flotación, balanceo y sombra. Como la figura es de revolución, el cuerpo se dibuja una sola vez y solo los ojos se redibujan en 90 posiciones alrededor del eje; el giro alterna esos cuadros con una animación CSS `steps()`, sin scripts, de modo que el SVG exportado gira solo y el bucle cierra sin saltos. Con movimiento reducido, o con el giro apagado, se muestra únicamente el cuadro inicial de la orientación elegida. En vistas posteriores los ojos quedan ocultos.

## Escenas guardadas

`tools/scenes/vecinoclub-escena.svg` es la escena final de la landing y `vecinoclub-escena.json` su estado editable (formato 5; se actualiza al cargar). Para retomarla: abrir `tools/escena-isometrica.html` en Chrome y usar **Cargar JSON** (o arrastrar el archivo).

**Crear y guardar otra escena:**

1. Abrir `tools/escena-isometrica.html` y partir de la escena inicial, o cargar una existente con **Cargar JSON**.
2. Editar piezas, orden, colores y movimiento.
3. Pulsar **Guardar JSON** y **Exportar SVG**, y mover ambos archivos a `tools/scenes/` con el mismo nombre base (`mi-escena.json` y `mi-escena.svg`).
4. Confirmar el par en git; `.gitignore` ya admite `tools/scenes/`.

## Volumen y marca

El entorno utiliza la proyección de planos iso-figure. Las figuras utilizan las curvas de revolución y el kit SVG de **Anatomy**, con un módulo propio en `scene-studio/src/characters.ts`. La cámara de Anatomy se configura con azimut 45°, elevación `atan(1/√2)` y escala `√(1.5/1.6)`: sus ejes proyectados coinciden con `(x−y) cos(30°), (x+y) sin(30°)−z` del entorno. Las cuatro orientaciones son giros reales de 90° alrededor del eje vertical. Las normales determinan visibilidad y bandas de luz; las piezas se ordenan por profundidad.

La cabeza de Punto es un volumen de revolución con base suavemente aplanada, calibrado sobre `assets/mascot/_sheets/punto-vistas.png`. Las medidas **refutan la esfera** de la revisión anterior: el alto/ancho de referencia es 0,8302 de frente, 0,8517 en tres cuartos y 0,8920 de perfil; una esfera nivelada daba 1,0000. Ojos y sonrisa siguen la cabeza y su visibilidad real; el sello es un volumen crema poco profundo, los brazos se inclinan desde los hombros y el torso termina en una sola punta redondeada. Las 56 medidas declaradas de cabeza, ojos, sonrisa, sello, brazos, torso y punta quedan dentro de ±5% relativo por medida, con error máximo local 4,68%. No se reproduce textura raster de peluche ni se afirma coincidencia de todo el contorno píxel a píxel.

**Comparar Punto**, en el encabezado, abre el modo de referencia: frente, tres cuartos y perfil, hoja semitransparente sobre el modelo con opacidad regulable o lado a lado, cuadros medidos y tabla de errores. Se registra por altura y centro de cabeza con escala uniforme, sin deformar la hoja. Las cámaras niveladas de comparación son distintas de la cámara isométrica de la escena y se mantienen fijas al contrastar antes/después. La imagen canónica se incrusta solo para comparar; no entra en la escena ni en su SVG exportado. [Método, límites y tabla antes/después](scene-studio/mascot-measurements.md).

El isotipo se deriva del contorno canónico de `assets/identity/vecinoclub_isotipo_color.svg`, con espesor real, abertura y punto superior separados. No se modifica el activo oficial.

Colores y superficies de la interfaz proceden de la variante oscura de `tokens/vecinoclub.css`, mapeados a tokens semánticos shadcn. El HTML declara `class="dark" data-theme="dark"`; los valores iniciales del lienzo y sus piezas usan superficies oscuras de la misma paleta. Rubik y Barlow Condensed se incrustan con sus licencias OFL. El naranja de Punto y el marfil siguen `assets/mascot/GENERATION_GUIDE.md`.

## Guardar y exportar

**Guardar JSON** descarga el documento de diseño, versión 6, ordenada de fondo a delante: lista de elementos con identificadores únicos, tipos, nombres, orientaciones, propiedades, reflexión horizontal, variante de comercio, variante de mapa y ajustes globales. Duplicar, borrar, arrastrar o usar la rueda modifica ese mismo documento. No hay compatibilidad con el esquema anterior.

**Cargar JSON**, en el encabezado, abre el selector de archivos. También se puede soltar un archivo en cualquier parte del taller: aparece una zona de carga y el arrastre de archivos permanece separado del arrastre de capas. La carga **sustituye** el documento completo: piezas e identificadores, orden, orientaciones, reflejos, colores, tamaños, posiciones, visibilidad, detalles, toldos, idle, pausa y ajustes globales. El nombre del archivo y el número de elementos aparecen al terminar. El selector permite cargar de nuevo el mismo archivo.

Se admite el **formato 6** completo y el **formato 5**, que se actualiza al cargar añadiendo los campos de giro y brillo de Gota con sus valores por defecto (así se abre la escena guardada en `tools/scenes/`). Otras versiones, campos ausentes o desconocidos, IDs repetidos, tipos incorrectos, colores ajenos a HEX RGB y valores fuera de los rangos de los controles se rechazan con la ruta del campo que falla. No se corrige nada más en silencio. Un error conserva íntegra la escena anterior. Límites del taller: 200 elementos y archivos de hasta 2 MiB; los colores admiten `#RGB` y `#RRGGBB`. Duplicar en los límites conserva posiciones y nombres válidos. No se guarda automáticamente en el navegador: el archivo descargado es la copia persistente.

**Exportar SVG** descarga únicamente la escena, con superficies, proyección, geometría de la orientación vigente, animaciones, pausa, movimiento reducido y configuración en `<metadata>`. Conserva piezas añadidas, duplicadas, ocultas, sus propiedades y el orden manual del documento. Excluye paneles, menús, filtro y superposición de hover, y scripts. Guardar JSON y Exportar SVG usan Blob y XMLSerializer; Cargar JSON lee un archivo local. El SVG se vuelve a renderizar desde el documento, de forma determinista dentro de esta versión del taller: selección, historial de arrastre y fase de animación del DOM no alteran sus bytes. La prueba guarda un JSON real, modifica la escena, lo carga y exige que el SVG exportado sea idéntico byte por byte; repite el recorrido mediante arrastrar-soltar. No se necesitan servicios externos.

## Comparación de motores y licencias

Se renderizaron **24 vistas**: Punto e isotipo × NE/SE/SO/NO × iso-figure, Colorfigures y Anatomy. Se usaron las mismas proporciones objetivo, anatomía, contorno del isotipo, color de marca y proyección. Se compararon con las vistas de mascota, la referencia hairline de la escena y la galería Plinth.

| Opción probada | Resultado observado | Decisión |
| --- | --- | --- |
| iso-figure: proyección y malla de caras propia | Volumen legible y tonos suaves; en la cabeza de Punto quedan facetas y bandas horizontales que se ven rígidas. El isotipo extruido mantiene buena lectura. | Se conserva para comercio y entorno, pero no para las curvas de Punto. |
| Colorfigures: `core.js`, `loft`, `toneI`, `hullInk` | Las cuatro vistas tienen volumen real. La silueta de tinta y las bandas oscuras hacen a Punto más duro que la mascota y más pesado frente al entorno hairline. El isotipo se parece mucho al resto. | No se incorpora su motor al entregable. El resultado no justifica un segundo motor ni su estilo de tinta. |
| Anatomy: `iso-kit.mjs`, `lathe.mjs` | Perfiles suaves, siluetas continuas y curvas de luz más apropiadas para la cabeza y el torso semiorgánicos. Mantiene la punta, el sello y los brazos en las vistas frontales. Su cámara se alinea con la del entorno. | **Elegida para las figuras**, con bandas de luz derivadas de los colores de marca y de menor contraste. |

La evaluación de Anatomy incluyó `references/craft.md`, los perfiles de `lathe`, `sphereOf`, `cylinder`, `disc`, `prismOf`, las curvas/siluetas y el ejemplo `examples/dial-indicator/build.mjs`. Para Punto se combina un perfil de cabeza calibrado con perfiles suaves de revolución; para el isotipo se proyecta y extruye su contorno, con hueco real y caras visibles según la orientación. La escena y su idle usan únicamente SVG; el comparador utiliza un canvas temporal invisible para medir dos filas de la silueta. No se necesita WebGL ni ningún servicio externo. **No se copió ninguna ilustración de Plinth**: su captura y galería se usaron solo como referencia visual; su licencia de ilustraciones no está comprobada.

| Fuente | Licencia verificada antes de copiar | Uso |
| --- | --- | --- |
| [Anatomy](https://github.com/wheresryan22/anatomy) | [MIT, © 2026 Ryan](https://github.com/wheresryan22/anatomy/blob/main/LICENSE) | Kit de proyección y curvas, vendorizado sin modificaciones con LICENSE en `scene-studio/src/vendor/anatomy/`. |
| [iso-figure](https://github.com/MrBongoC/ai-iso-skill) | [MIT, © 2026 Tolga Cohce](https://github.com/MrBongoC/ai-iso-skill/blob/main/LICENSE) | Pequeño núcleo de proyección de planos para el entorno. |
| [Colorfigures](https://april-zhu.com/colorfigures) | MIT, © 2026 April Zhu y Tolga Cohce, comprobada en `colorfigures/LICENSE` del [paquete oficial](https://april-zhu.com/colorfigures/colorfigures.tar.gz) | Código utilizado solo en el prototipo comparativo externo; no se distribuye en el editor. |
| [shadcn/ui y skill](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn) | [MIT, © 2023 shadcn](https://github.com/shadcn-ui/ui/blob/main/LICENSE) | Componentes reales obtenidos por CLI: Button, Card, Field, ToggleGroup, DropdownMenu, Switch e Input de Radix; Sidebar, Slider y Tabs de Base UI, con sus dependencias. |
| [Base UI](https://github.com/mui/base-ui) | [MIT, © 2019 Material-UI SAS](https://github.com/mui/base-ui/blob/master/LICENSE) | Primitivas de los componentes oficiales Sidebar, Slider y Tabs. |
| [Hairline](https://github.com/lucasmarkes/hairline) | [MIT, © 2026 Lucas Marques](https://github.com/lucasmarkes/hairline/blob/main/LICENSE) | Referencia estética. Su kernel/bench de una figura y un gesto no se incorpora al editor de varias piezas. |
| [Anatomy Asset](https://github.com/Teddarific/skills/tree/main/skills/anatomy-asset) | [MIT, © 2026 Ryan](https://github.com/Teddarific/skills/blob/main/skills/anatomy-asset/LICENSE); README declara adiciones bajo MIT | Evaluada; su dirección de activos densos a cuatro tonos no aporta al editor. Se usa directamente el kit de Anatomy. |
| [Isoglow](https://isoglow.dev/) | MIT, © 2026 April Zhu y Tolga Cohce, comprobada en `iso-glow/LICENSE` del [paquete oficial](https://iso-glow.vercel.app/iso-glow.tar.gz) | Evaluada; iluminación oscura y resplandor se alejan de la escena. No se copia código. |

Los avisos MIT, OFL y los avisos de las dependencias de ejecución se incrustan en comentarios del HTML. Las fuentes de shadcn usan sus variantes y composición, con los tokens de marca; la compilación de autoría permite distribuir un HTML autónomo sin reemplazar sus componentes por imitaciones. Se ajustaron imports del helper `cn`, el color semántico del thumb y su asociación accesible con etiquetas. Los selectores de orientación de Base UI se expresan con la sintaxis nativa `data-[orientation=horizontal]` de Tailwind. Los componentes Base proceden del registro oficial `base-nova`; la interfaz mantiene los componentes Radix ya utilizados para los demás controles. Se eliminaron Slider y Tabs Radix que quedaron sin uso.

El [Color Picker comunitario de shadcn.io](https://www.shadcn.io/ui/color-picker) no se incorporó: requiere una cuenta/token y no se verificó el aviso de licencia de su implementación exacta. Por autorización posterior se eligió [react-colorful](https://github.com/omgovich/react-colorful), alternativa especializada sin dependencias: **MIT, © 2020–presente Vlad Shilov**, verificada en [LICENSE upstream](https://github.com/omgovich/react-colorful/blob/master/LICENSE) y en el paquete instalado antes de incorporarlo. Se usa su `HexColorPicker` y `HexColorInput` dentro de un Popover Base UI, con estilos semánticos de marca y una paleta propia. Su licencia se incluye en el HTML junto a las otras dependencias. No se presenta como componente oficial de shadcn/ui.


## Fuentes, compilación y pruebas

Las fuentes mantenibles están en `tools/scene-studio/`; `tools/escena-isometrica.html` es el artefacto generado. No editar el bundle a mano. Desde el directorio de fuentes:

```sh
npm ci
npm run typecheck
npm run build
npm test
```

La compilación usa esbuild y Tailwind para incrustar todo, incluidas fuentes y avisos de licencia. **Solo la autoría y las pruebas necesitan Node/npm**. `npm test` usa Playwright Core y Google Chrome instalado, con un contexto offline. Escribe capturas y resultados en un directorio temporal, o en la ruta definida por `SCENE_EVIDENCE_DIR`.

Las pruebas ejecutan la interfaz pública: cuatro orientaciones por figura y por los cinco comercios, reflexión horizontal y su exportación, interacción HEX/paleta/teclado/puntero del selector de color, medición del modelo contra píxeles de la hoja canónica con controles negativos, las cuatro variantes de mapa y su exportación, tokens oscuros, idle, extremos de sliders, arrastre real con ratón, rueda con y sin Alt, hover exterior sin recolorear interiores, menús, apilado de Plaza en ambos extremos, movimientos de un nivel, arrastre de capas por encima y debajo, persistencia del idle al reordenar, altura visible de las pistas Slider, alta/baja/duplicación, descarga JSON/SVG y concordancia de metadata, movimiento reducido real con control negativo, continuidad del bucle y móvil de 390 px sin desbordamiento horizontal. La revisión independiente por no-mistakes se hace después del primer handoff del HTML actualizado.

Resultado local: **247 comprobaciones de interfaz, 80 de medición y 56 de documentos aprobadas** en Chrome offline, sin errores de consola; TypeScript y build aprobados. Se capturaron la escena por defecto, las 20 vistas de comercios, el selector de color, el mapa compacto y tres configuraciones extremas con sus JSON. El test de anatomía vuelve a medir la hoja original con su hash fijado; compara 56 medidas dentro de ±5% relativo, verifica los ojos visibles y comprueba que una cabeza alterada +15% falle en las tres vistas. Los brazos incluyen anotación manual con incertidumbre declarada. La suite de documentos incluye el archivo proporcionado `vecinoclub-escena.json`, versionado en `scenes/vecinoclub-escena.json`; verifica ida y vuelta, carga con IDs reutilizados para otro tipo, escena vacía, colores abreviados, errores de esquema/versión, límites y móvil.

# Punto · experimento de sprite stacking

Desde la raíz del repositorio: `node tools/sprite-stack/generate.mjs`. No necesita instalar dependencias. Escribe la hoja de cortes y la tira de 8 ángulos en `assets/mascot/sprite-stack/`, registra ambas en `assets/mascot/manifest.json` y regenera el visor `index.html`. La tira contiene ángulos de 0° a 315° en pasos de 45°, en cuadros de 192 × 256 píxeles (escala x2, la salida por defecto).

El visor pesa pocos KB: carga `assets/mascot/sprite-stack/sprite-stack-slices.png` y lee sus píxeles en un canvas. Los navegadores bloquean esa lectura desde `file://`, así que hay que servir la raíz del repositorio por http:

```sh
npx serve .
```

Luego abre `http://localhost:3000/tools/sprite-stack/`. El control deslizante pausa la animación.

La hoja contiene 192 cortes de 144 × 144 píxeles (los brazos llegan a ±63 unidades del eje), de abajo hacia arriba, 16 por fila. Cada material es un color: naranja, naranja sombra (cuello), crema (sello), tinta (cara) y naranja claro para los brazos, que así se distinguen del torso. Cada capa equivale a 0,9 unidades del modelo y se eleva cos(20,5°) ≈ 0,94 px; el render reduce la profundidad a sin(20,5°) = 0,35. Así una esfera se dibuja como círculo. Los perfiles y su interpolación provienen de `scene-studio`.

El render trabaja en tres pasadas sobre un buffer:

- Apila los cortes y guarda material y altura por píxel.
- Sombrea con rellenos planos: naranja claro (`--vc-primary-hover`) en el borde superior y el flanco izquierdo; naranja sombra en el flanco derecho, la punta inferior y el cuello bajo la cabeza; el sello pasa a `--vc-placeholder` en su borde derecho. El sello es material de la superficie del torso, sin volumen propio.
- Traza un contorno de tinta de 1 px una sola vez, alrededor de la silueta terminada. Los brazos usan un material propio; donde cruzan el cuerpo, el borde pasa a naranja sombra, como un pliegue.

Los colores salen de `tokens/vecinoclub.css` y de la guía de mascota. El naranja sombra `#d3581f` y el crema del vientre `#f7ebd3` son los tonos que no salen de los tokens: la sombra es el primario oscurecido hacia un tono cálido; el crema imita el sello del peluche, como la sombra del peluche.

Limitaciones: la cara solo se lee entre 315° y 45°. No es un recurso de producción aprobado.

## Comparación de resolución

Cada ejecución con `--scale` escribe solo la tira de la escala indicada. La escala multiplica la grilla, el número de capas y el ancho de las bandas de sombreado. El contorno sigue siendo de 1 px.

Si cambias la paleta, los perfiles u otro insumo compartido, regenera las tres escalas antes de componer la hoja. Ejecuta desde la raíz del repositorio:

```sh
node tools/sprite-stack/generate.mjs --scale 1 &&
node tools/sprite-stack/generate.mjs --scale 2 &&
node tools/sprite-stack/generate.mjs --scale 4 &&
node tools/sprite-stack/compare.mjs
```

La hoja `compare/compare.png` muestra las tres tiras al mismo tamaño en pantalla y la cara a 0° y 45° de cada escala.

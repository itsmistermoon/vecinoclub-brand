# Punto · experimento de sprite stacking

Desde la raíz del repositorio: `node tools/sprite-stack/generate.mjs`. No necesita instalar dependencias. Regenera la hoja, la tira y el HTML autónomo; abre `index.html` para girar o pausar a Punto. El control deslizante pausa la animación. La tira contiene ángulos de 0° a 315° en pasos de 45°, en cuadros de 192 × 256 píxeles (escala x2, la salida por defecto).

La hoja contiene 192 cortes de 144 × 144 píxeles (los brazos llegan a ±63 unidades del eje), de abajo hacia arriba, 16 por fila. Cada capa equivale a 0,9 unidades del modelo y se eleva cos(20,5°) ≈ 0,94 px; el render reduce la profundidad a sin(20,5°) = 0,35. Así una esfera se dibuja como círculo. Los perfiles y su interpolación provienen de `scene-studio`.

El render trabaja en tres pasadas sobre un buffer:

- Apila los cortes y guarda material y altura por píxel.
- Sombrea con rellenos planos: naranja claro (`--vc-primary-hover`) en el borde superior y el flanco izquierdo; naranja sombra en el flanco derecho, la punta inferior y el cuello bajo la cabeza; el sello pasa a `--vc-placeholder` en su borde derecho. El sello es material de la superficie del torso, sin volumen propio.
- Traza un contorno de tinta de 1 px una sola vez, alrededor de la silueta terminada. Los brazos usan un material propio; donde cruzan el cuerpo, el borde pasa a naranja sombra, como un pliegue.

Los colores salen de `tokens/vecinoclub.css` y de la guía de mascota. El naranja sombra `#d3581f` y el crema del vientre `#f7ebd3` son los tonos que no salen de los tokens: la sombra es el primario oscurecido hacia un tono cálido; el crema imita el sello del peluche, como la sombra del peluche.

Limitaciones: la cara solo se lee entre 315° y 45°. No es un recurso de producción aprobado.

## Comparación de resolución

`node tools/sprite-stack/generate.mjs --scale 1|2|4` escribe solo `compare/punto-8dir-x{N}.png` (x1: 72 px, x2: 144 px, x4: 288 px): multiplica la grilla y el número de capas, y escala las bandas de sombreado. El contorno sigue siendo de 1 px. Luego, `node tools/sprite-stack/compare.mjs` arma `compare/compare.png`: las tres tiras al mismo tamaño en pantalla y la cara a 0° y 45° de cada escala.

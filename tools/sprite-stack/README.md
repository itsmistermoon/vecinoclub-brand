# Punto · experimento de sprite stacking

Desde la raíz del repositorio, ejecuta `node tools/sprite-stack/generate.mjs` sin argumentos para generar los [recursos de marca a escala x2](../../assets/mascot/GENERATION_GUIDE.md#sprite-stacking-sin-aplicación-definida-por-ahora). El generador registra los PNG en `assets/mascot/manifest.json` con el tipo `sprite-stack` y su SHA-256, y regenera el visor `index.html`. Solo requiere Node.js.

El visor pesa pocos KB: carga `assets/mascot/sprite-stack/sprite-stack-slices.png` y lee sus píxeles en un canvas. Los navegadores bloquean esa lectura desde `file://`, así que hay que servir la raíz del repositorio por http:

```sh
npx serve .
```

Luego abre `http://localhost:3000/tools/sprite-stack/`. Los controles se habilitan cuando carga la hoja. Mueve el control deslizante para elegir un ángulo y pausar la animación.

En la hoja, cada material tiene un color: naranja, naranja sombra (cuello), crema (sello y reflejos de los ojos), tinta (cara) y naranja claro para distinguir los brazos del torso. A escala x2, los cortes están separados por 0,9 unidades del modelo. Cada capa sube cos(20,5°) ≈ 0,94 px y el render multiplica la profundidad por sin(20,5°) ≈ 0,35. Así una esfera se dibuja como círculo.

El render trabaja en tres pasadas sobre un buffer:

- Apila los cortes y guarda material y altura por píxel.
- Sombrea con rellenos planos: naranja claro (`--vc-primary-hover`) en el borde superior y el flanco izquierdo; naranja sombra en el flanco derecho, la punta inferior y el cuello bajo la cabeza; el sello pasa a `--vc-placeholder` en su borde derecho. El sello es material de la superficie del torso, sin volumen propio.
- Traza un contorno de tinta de 1 px una sola vez, alrededor de la silueta terminada. Los brazos usan un material propio; donde cruzan el cuerpo, el borde pasa a naranja sombra, como un pliegue.

La paleta usa `tokens/vecinoclub.css` y dos tonos propios del sprite definidos en `generate.mjs`: un naranja sombra cálido y un crema inspirado en el sello del peluche.

La cara solo se lee entre 315° y 45°.

## Comparación de resolución

Para generar una tira comparativa, usa `--scale 1`, `--scale 2` o `--scale 4`. Cada opción escribe solo su tira en `compare/`. El generador rechaza cualquier otra forma de pasar argumentos antes de escribir archivos. La escala multiplica la grilla, el número de capas y el ancho de las bandas de sombreado. El contorno sigue siendo de 1 px.

Si cambias la paleta, los perfiles u otro insumo compartido, regenera las tres escalas antes de componer la hoja. Ejecuta desde la raíz del repositorio:

```sh
node tools/sprite-stack/generate.mjs --scale 1 &&
node tools/sprite-stack/generate.mjs --scale 2 &&
node tools/sprite-stack/generate.mjs --scale 4 &&
node tools/sprite-stack/compare.mjs
```

La hoja `compare/compare.png` muestra las tres tiras al mismo tamaño en pantalla y la cara a 0° y 45° de cada escala.

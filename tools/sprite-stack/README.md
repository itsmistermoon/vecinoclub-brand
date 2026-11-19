# Punto · experimento de sprite stacking

Desde la raíz del repositorio: `node tools/sprite-stack/generate.mjs`. No necesita instalar dependencias. Regenera la hoja, la tira y el HTML autónomo; abre `index.html` para girar o pausar a Punto. El control deslizante pausa la animación. La tira contiene ángulos de 0° a 315° en pasos de 45°, en cuadros de 72 × 128 píxeles.

La hoja contiene 96 cortes de 48 × 48 píxeles, de abajo hacia arriba, 16 por fila. Cada capa equivale a 1,8 unidades del modelo y se eleva un píxel; el render reduce la profundidad al 50 %. Los perfiles y su interpolación provienen de `scene-studio`.

El render trabaja en tres pasadas sobre un buffer:

- Apila los cortes y guarda material y altura por píxel.
- Sombrea con rellenos planos: naranja claro (`--vc-primary-hover`) en el borde superior y el flanco izquierdo; naranja sombra en el flanco derecho, la punta inferior y el cuello bajo la cabeza; el sello pasa a `--vc-placeholder` en su borde derecho.
- Traza un contorno de tinta de 1 px una sola vez, alrededor de la silueta terminada.

Los colores salen de `tokens/vecinoclub.css` y de la guía de mascota. El naranja sombra `#c4561a` es el único tono derivado: el primario oscurecido hacia la tinta.

Limitaciones: la cara solo se lee entre 315° y 45°; el sello sobresale como un disco en los perfiles; los brazos quedan como aletas cortas. No es un recurso de producción aprobado.

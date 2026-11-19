# Punto · experimento de sprite stacking

Desde la raíz del repositorio: `node tools/sprite-stack/generate.mjs`. No necesita instalar dependencias. Regenera la hoja, la tira y el HTML autónomo; abre `index.html` para girar o pausar a Punto. El control deslizante pausa la animación. La tira contiene ángulos de 0° a 315° en pasos de 45°.

La hoja contiene 64 cortes de 32 × 32 píxeles, ordenados de abajo hacia arriba en una fila. Cada capa equivale a 172/64 unidades del modelo y se eleva un píxel; el render reduce la profundidad al 50 %. Los perfiles y su interpolación provienen de `scene-studio`; la paleta usa el naranja de `tokens/vecinoclub.css` y el marfil y tinta de la guía de mascota. La tira y el HTML usan la misma función de renderizado por muestreo vecino más cercano.

Es una aproximación voxel de baja resolución: la cuantización simplifica brazos y rasgos, el sello es irregular y la cara pierde detalle en algunos ángulos. El modelo no reproduce la textura de peluche, sombras ni la proyección exacta del taller; no es un recurso de producción aprobado. Para mejorar la fidelidad conviene revisar los cortes a mano y comparar la rotación con las vistas canónicas antes de usarlo en una interfaz.

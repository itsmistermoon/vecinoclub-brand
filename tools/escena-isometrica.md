# Taller de escena isométrica

Abrir `escena-isometrica.html` directamente en Chrome. Es una herramienta de diseño: no modifica ni compila la landing. El archivo incluye SVG, CSS, JavaScript y las fuentes Rubik y Barlow Condensed, sin peticiones de red ni instalación.

Seleccionar una pieza en la lista, en el dibujo o mediante Tab y Enter/Espacio. El inspector permite cambiar cuerpo, línea, grosor, tamaño, posición, opacidad y visibilidad. El acento está disponible para el toldo y el sello de Punto. Los árboles se editan como conjunto; banco y jardinera forman otra pieza. Los controles globales ajustan fondo, zoom, duración, altura y balanceo del idle, detalles, toldo y sombra. Los límites de posición permiten sacar piezas del encuadre deliberadamente; el lienzo de exportación es fijo, 1000 × 760.

La animación usa CSS con los mismos valores y tangentes en ambos extremos del bucle. Pausar conserva su fase. `prefers-reduced-motion: reduce` elimina el movimiento tanto en el taller como en el SVG exportado. Los cambios de duración o amplitud pueden cambiar la fase visual al editar; el bucle en reposo es continuo.

Los colores iniciales proceden de `tokens/vecinoclub.css`; el cuerpo naranja y sello marfil de Punto siguen `assets/mascot/GENERATION_GUIDE.md`. El personaje es una adaptación vectorial para este encargo SVG: conserva la cabeza dominante, ojos ovalados, brazos cortos y una sola punta; el material de peluche de las referencias raster no se reproduce. No sustituye el master de mascota ni modifica sus activos.

## Guardar y exportar

Se incluyen ambos botones: usan las API nativas Blob, URL y XMLSerializer, con poco código y sin librerías.

- **Guardar JSON / Abrir JSON:** conserva las decisiones de diseño para volver a editarlas. El esquema actual es versión 1; se rechazan versiones distintas, claves desconocidas, colores inválidos y números fuera de los rangos del inspector, conservando la escena vigente. No se guarda selección ni fase temporal del idle.
- **Exportar SVG:** descarga la escena con estilos, animación, preferencia de movimiento reducido, estado de pausa y configuración en `<metadata>`. No incluye scripts ni recursos externos. Puede abrirse solo o usarse como imagen. Los controles y el panel quedan fuera del SVG.

## Fuentes evaluadas y licencias

Consulta realizada el 26 de octubre de 2026. Se leyeron las seis fuentes antes de implementar. Las licencias se verificaron en los archivos LICENSE, además de las descripciones públicas. No se instalaron skills globales ni se incorporaron motores de terceros.

| Fuente | Licencia comprobada | Decisión técnica |
| --- | --- | --- |
| [Anatomy](https://github.com/wheresryan22/anatomy) | [MIT, © 2026 Ryan](https://github.com/wheresryan22/anatomy/blob/main/LICENSE) | Descartada: orientada a sistemas explicativos de muchas piezas, sólidos sombreados y posibles shaders; demasiado detalle para un comercio simple de línea fina. |
| [Hairline](https://github.com/lucasmarkes/hairline) | [MIT, © 2026 Lucas Marques](https://github.com/lucasmarkes/hairline/blob/main/LICENSE) | Referencia estética principal, pero no se utiliza su implementación: hairline-create exige conservar su kernel y bench, con una figura, un gesto y un parámetro de intensidad. Esa interfaz no satisface un inspector con múltiples piezas independientes. |
| [Anatomy Asset](https://github.com/Teddarific/skills/tree/main/skills/anatomy-asset) | [MIT, © 2026 Ryan](https://github.com/Teddarific/skills/blob/main/skills/anatomy-asset/LICENSE); el README declara las adiciones bajo MIT | Descartada: exporta activos SVG de landing, pero su dirección de arte de cuatro tonos y muchos detalles es más densa que la referencia. |
| [iso-figure](https://github.com/MrBongoC/ai-iso-skill) | [MIT, © 2026 Tolga Cohce](https://github.com/MrBongoC/ai-iso-skill/blob/main/LICENSE) | **Elegida.** Proyección de planos con matrices SVG, trazos sin escala y estado central en un HTML sin dependencias. Se adapta su pequeño núcleo de proyección, con el aviso MIT completo en el HTML. La paleta monocroma de su guía se reemplaza por los tokens de marca solicitados. |
| [Isoglow](https://isoglow.dev/) | MIT, © 2026 April Zhu y Tolga Cohce, comprobada en `iso-glow/LICENSE` del [paquete oficial](https://iso-glow.vercel.app/iso-glow.tar.gz) | Descartada: iluminación, resplandor y escenas oscuras no corresponden al acabado hairline cálido solicitado. No se copia código ni recursos. |
| [Colorfigures](https://april-zhu.com/colorfigures) | MIT, © 2026 April Zhu y Tolga Cohce, comprobada en `colorfigures/LICENSE` del [paquete oficial](https://april-zhu.com/colorfigures/colorfigures.tar.gz) | Se evaluó con preferencia de desempate, pero no hubo empate técnico: su motor de cuerpos 3D, rotación completa, bandas de sombreado y contorno grueso agregan complejidad y se alejan de las líneas finas. Su documentación desaconseja figuras orgánicas como mascotas. No se copia código ni recursos. |

La licencia MIT de iso-figure está íntegra en el HTML. Las dos licencias OFL de las fuentes incrustadas también están incluidas en comentarios del HTML; sus originales siguen en `fonts/`. La geometría del comercio, entorno y Punto se dibujó para este proyecto. Las dos imágenes proporcionadas se usaron como referencias visuales, sin copiar ni incrustar sus píxeles: de hairline se conserva la ligereza de líneas y de mapa-pines la lectura de un marcador sobre una ubicación. Las fuentes consultadas y pruebas externas se conservan en el expediente de firstmate, fuera del repositorio.

## Verificación reproducible

El smoke test ejecuta controles públicos del DOM y las descargas reales, sin acceder al objeto interno de estado. Con el HTML abierto en chrome-devtools-axi:

```sh
chrome-devtools-axi run < /ruta/al/repo/tools/tests/escena-isometrica.browser.js
```

Comprueba selección por lista, dibujo y teclado; colores aplicables; extremos de todos los deslizadores; desplazamientos efectivos; visibilidad; controles globales; pausa; continuidad del bucle; exportación XML, carga autónoma como imagen y metadata; importación JSON válida e inválida. La ejecución exige movimiento normal para medir el idle. La comprobación de movimiento reducido se hace por separado con emulación real del navegador y verifica `matchMedia(...).matches === true` y `getComputedStyle(document.querySelector('.idle')).animationName === 'none'`.

La revisión visual y la verificación independiente de no-mistakes son pasos separados: un smoke test automatizado no certifica por sí solo la fidelidad de la ilustración.

Resultado local (Chrome, 26-10-2026): 225 aserciones satisfactorias, cero errores de consola; carga con contexto offline; SVG descargado y abierto como documento independiente; movimiento reducido confirmado en editor y SVG; móvil de 390 px sin desbordamiento horizontal. Se compararon las referencias proporcionadas con las capturas `default.png`, `extreme-ink.png`, `extreme-bold.png` y `extreme-quiet.png`. Los presets extremos prueban respectivamente línea de 0,2 px e idle de 1 s; línea de 4 px, Punto a 160 % y flotación de 30 px; escala de 40 %, opacidad de 30 %, zoom mínimo y detalles desactivados. Su legibilidad disminuye deliberadamente en los extremos mínimos; la configuración inicial mantiene la lectura de comercio y marcador. Las capturas y `verification.json` se conservan en el expediente externo de esta tarea, no como activos de la landing. La revisión independiente de no-mistakes queda pendiente del handoff.

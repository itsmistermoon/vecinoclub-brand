# Punto · guía de generación

## Fuente y alcance

La **referencia canónica** es `views/view-front.png`. `views/view-three-quarter.png` y `views/view-profile.png` forman su juego de vistas. `expressions/` y `poses/` son referencias secundarias. Las hojas originales vigentes, sin recomprimir, están en `_sheets/`. El master descartado se conservó fuera de esta colección, en `../mascot-archive/`; **no adjuntarlo para generar personajes nuevos**. Es dirección de arte raster, no modelo vectorial cerrado.

## Rasgos fijos

- **Silueta:** cabeza naranja grande, casi circular con base suavemente aplanada, separada visualmente del torso. Torso en forma de pin/gota: ancho arriba, afinado hacia **una sola punta inferior** redondeada. Brazos cortos, blandos, unidos a los costados. Nunca piernas.
- **Proporciones observadas:** en la vista frontal la cabeza ocupa ~44% de la altura visible; el sello marfil mide ~45% del ancho del torso sin brazos. Mantener cabeza dominante, torso más estrecho y punta claramente legible. Las proporciones son aproximadas por perspectiva, no medidas de un rig.
- **Cara:** dos ojos negros ovalados verticales, separados y con reflejo blanco pequeño; boca negra corta y curva, de apariencia bordada. En perfil se ve un ojo. Cejas solo cuando la expresión las exige. Sin nariz, dientes ni cabello.
- **Marca:** naranja `#FB7629`, marfil `#F5F4F2`, tinta `#171717`, extraídos de los SVG oficiales. La luz del render produce tonos derivados: pedir estos HEX como *colores base de material*, no exigir cada píxel idéntico. Sello circular marfil en el pecho.
- **Material:** peluche corto y denso, textura fina visible, bordes suaves, volumen 3D simple; iluminación cálida y difusa con sombra suave. No contorno dibujado. Ojos y boca oscuros de borde redondeado; grosor visual de boca cercano al ancho de la pupila menor (~1/5 del ancho de un ojo en la vista frontal). Evitar líneas finas.

## Prohibiciones

Piernas, pies, zapatos, separación en dos extremidades bajo el torso, postura sentada, brazos largos o dedos; cambiar la silueta del pin, color del cuerpo o posición del sello; añadir nariz, orejas, pelo, accesorios permanentes, letras/logos sobre el personaje; estilo plástico brillante, 2D plano, rasgos humanos o colores de la paleta de pruebas anteriores. Nunca usar una mascota distinta para resolver una pose.

## Referencias: adjuntar en este orden

1. `views/view-front.png` — identidad, proporciones y material canónicos.
2. **Si la vista lo requiere:** `views/view-three-quarter.png` o `views/view-profile.png`, según el ángulo; no adjuntar ambas sin necesidad.
3. **Solo si hace falta:** una expresión de `expressions/` o una pose de `poses/` cercana a la pedida.
4. **Solo para escena:** `usage/usage-bakery-counter.png` como referencia de ambiente, **no de anatomía**; muestra la exploración anterior. No copiar texto ni inventar un QR funcional.

No adjuntar los tableros iniciales de ChatGPT como referencia de personaje: contienen piernas, otras paletas y cuerpos inconsistentes.

## Plantilla universal

**Prompt positivo:**

> Usa las referencias adjuntas en el orden indicado. Genera **el mismo personaje Punto de VecinoClub**, no una reinterpretación. Mascota de peluche naranja con cabeza grande casi circular y base suavemente aplanada, dos ojos negros ovalados brillantes con reflejo pequeño, boca negra corta de apariencia bordada, brazos cortos, torso continuo de pin/gota con un único extremo inferior redondeado, sello circular marfil centrado en el pecho. Colores base: naranja #FB7629, marfil #F5F4F2, tinta #171717. Textura de peluche corto, volumen simple, luz cálida difusa y sombra suave. **Expresión:** [EXPRESIÓN]. **Pose:** [POSE]. **Vista:** [FRENTE / TRES CUARTOS / PERFIL]. **Escenario:** [FONDO TRANSPARENTE / ESCENARIO]. Mantén exactamente la identidad, proporción y ubicación del sello de `view-front.png`. Composición completa, con margen alrededor de toda la silueta. Una sola mascota.

**Negativo / restricciones:**

> Sin piernas, pies, zapatos ni dos apéndices inferiores; sin postura sentada, dedos, nariz, orejas, pelo, sombrero, mochila ni accesorios permanentes; sin otro color corporal, sin cambiar el sello, sin recortar brazos/cabeza/punta, sin duplicados, sin texto, sin marcas ajenas, sin estilo plástico o 2D. No añadir objetos salvo los pedidos en el escenario.

En interfaces que no admiten prompt negativo, agrega ese párrafo al final del positivo. En Midjourney adjunta primero las URLs de referencia y usa la restricción negativa en texto o `--no` según la versión disponible; revisa siempre el resultado porque la referencia no garantiza anatomía exacta.

## Variables intercambiables

- **Expresión:** bienvenida serena, alegría por sello, expectativa por dos compras restantes, premio listo, sorpresa por QR leído, gratitud tras canje.
- **Pose:** brazos bajos, un brazo saludando, ambos brazos celebrando, brazos abiertos. El torso no se divide ni se sienta.
- **Vista:** frente, tres cuartos, perfil real. No simular perspectiva comprimiendo horizontalmente el frente.
- **Escenario:** fondo transparente; mostrador de panadería de barrio; comercio local chileno; pantalla de celular con espacio para UI posterior. En escenas, el personaje debe seguir completo y sin piernas.

## Ejemplos listos para copiar

**Sello ganado:**

> [Adjunta `view-front.png`, `expression-stamp-earned.png`, `pose-celebrate.png`] Genera el mismo Punto de VecinoClub, peluche naranja #FB7629, sello marfil #F5F4F2, ojos y boca tinta #171717. Vista frontal, alegría clara al ganar un sello, brazos cortos levantados, cuerpo de pin con una única punta inferior, fondo transparente, personaje completo con margen uniforme. Sin piernas, pies, dedos, accesorios, texto ni cambios de proporción.

**Faltan dos compras:**

> [Adjunta `view-front.png`, `view-three-quarter.png`, `expression-two-to-go.png`] Mismo Punto de VecinoClub en tres cuartos, expresión expectante y amable, brazos cortos relajados. Conserva peluche naranja #FB7629, sello circular marfil #F5F4F2, ojos negros ovalados #171717, cabeza grande y torso en pin de una sola punta. Fondo transparente y margen completo. Sin piernas, pies, urgencia dramática, texto ni accesorios.

**Mostrador:**

> [Adjunta `view-front.png`, `usage-bakery-counter.png`] Fotografía cálida de una panadería local chilena. Coloca el mismo Punto completo junto a un letrero QR en blanco sobre el mesón; el personaje es secundario frente al espacio para el QR. Mantén anatomía de pin, peluche corto, naranja #FB7629 y sello marfil #F5F4F2. Luz realista, una sola sombra de contacto. Sin piernas, pies, QR inventado escaneable, letras, logotipos ni objetos que tapen la punta.

## Revisión de cada imagen nueva

- [ ] Comparar lado a lado con `view-front.png`: cabeza, torso, sello y material reconocibles.
- [ ] Contar **una** punta inferior y **cero** piernas/pies; revisar también sombras y objetos que parezcan pies.
- [ ] Ojos ovalados y boca corta; ningún rasgo nuevo permanente.
- [ ] Color base próximo a los tres HEX oficiales; aceptar variación solo por luz y textura.
- [ ] Brazos completos, silueta sin cortes, sin restos de otro personaje y margen suficiente.
- [ ] En transparencia: alfa real; en escena: sombra y escala coherentes.
- [ ] Revisar lectura a 128 px. Bajo 32 px usar el isotipo vectorial simplificado, no el render.
- [ ] Para producción, redibujar y superponer sobre un cuerpo vectorial maestro; las salidas generadas no garantizan coincidencia pixel a pixel.

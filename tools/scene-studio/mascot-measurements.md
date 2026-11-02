# Punto: mediciones antes y después

La hipótesis de una cabeza esférica se **refuta** con la hoja canónica: alto/ancho frontal 357/430 = 0,8302; tres cuartos 356/418 = 0,8517; perfil 355/398 = 0,8920. El modelo anterior daba 1,0000 en las tres cámaras niveladas. Se reemplazó por un volumen con base plana suave, profundidad menor que ancho y perfil de revolución medido. También se ajustaron ojos, sonrisa, sello elevado, brazos unidos y punta redondeada.

## Método

- Fuente original sin modificar: `assets/mascot/_sheets/punto-vistas.png`, 1774 × 887, SHA-256 `61e86dd653ccd53556800aab4b6869290ded6c393c36c0e12b3b0297645ba2e4`. Los cuadros de píxeles y los umbrales están en `src/mascot-reference.json`.
- Alfa >220; contorno naranja R>100; ojos/boca R<70,G<60,B<55; crema R>170,G>150,B>130,R−G<50,G−B<50. Cabeza cortada en la unión del cuello y=386. Los extremos de altura de brazos se anotaron manualmente, incertidumbre ±4 px. No se infiere la referencia desde el modelo.
- El test vuelve a medir el PNG real y compara sus cuadros con la ficha; además comprueba el hash. La altura del brazo es la extensión vertical del apéndice; la envergadura es el ancho de la silueta completa, incluidos brazos. No se afirma una segmentación automática fiable del hombro oculto.
- Cámaras ortográficas niveladas, frente 0°, tres cuartos 37°, perfil 90°; el giro intermedio de la hoja no está especificado, se registra como 37° y se mantiene idéntico antes/después. La escena conserva su cámara isométrica. Registro visual solo por altura total y centro horizontal de cabeza; sin estirar la foto por eje ni alinear cada rasgo por separado.
- Modelos medidos desde la geometría SVG realmente renderizada (`getBBox` y matrices DOM); punta al 97% y cintura al 78% de altura mediante rasterización a 8 px/unidad. La boca incluye el ancho de sus extremos redondos. Las dimensiones se dividen por altura total o ancho de cabeza, y las posiciones se miden respecto del borde superior de la silueta o izquierdo de la cabeza.
- Error = `abs(modelo / referencia − 1)`. El test exige ≤5% **relativo para cada medida**, y el conteo de ojos visible correcto (2,2,1). Como control negativo, escala la geometría de la cabeza +15% en cada vista y comprueba que la comparación deje de pasar. No se sustituyen mediciones por atributos que contengan el valor esperado.
- Antes: geometría del HTML v5 (SHA-256 `d0b18eb340e77236a8b5111cbcbf9861dd9d13274734c28e398baa264c06a9d0`), con cámara de comparación e identificadores semánticos añadidos solo para medir; coordenadas intactas. Código y capturas congelados en el expediente externo.

## Resultado

56 medidas dimensionales/posicionales dentro de ±5%; error máximo 4.68%. La prueba de mediciones suma 80 comprobaciones, incluidos PNG, ojos y controles negativos. La suite de interfaz suma 247; TypeScript y build aprobados.

Esto verifica los hitos geométricos declarados; no implica coincidencia píxel a píxel del contorno, textura de peluche, iluminación ni aprobación artística. La hoja es dirección de arte raster y sus vistas no son un rig exacto. El sello se modela como un volumen crema poco profundo para conservar su ancho en perfil.

## Tabla normalizada

| Vista | Medida | Hoja | Antes | Error antes | Después | Error después |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| frente | Cabeza / altura | 0.4364 | 0.4535 | 3.91% | 0.4360 | 0.09% |
| frente | Ancho cabeza / altura | 0.5257 | 0.4535 | 13.73% | 0.5291 | 0.65% |
| frente | Achatamiento (alto/ancho) | 0.8302 | 1.0000 | 20.45% | 0.8242 | 0.73% |
| frente | Ojos · altura | 0.0807 | 0.0674 | 16.41% | 0.0802 | 0.56% |
| frente | Ojos · posición X | 0.5064 | 0.5000 | 1.26% | 0.5077 | 0.26% |
| frente | Ojos · posición Y | 0.2457 | 0.2209 | 10.09% | 0.2459 | 0.09% |
| frente | Ojos · separación | 0.4058 | 0.3333 | 17.86% | 0.4088 | 0.73% |
| frente | Sonrisa · ancho | 0.2209 | 0.2090 | 5.41% | 0.2198 | 0.52% |
| frente | Sonrisa · altura | 0.0379 | 0.0308 | 18.69% | 0.0373 | 1.51% |
| frente | Sonrisa · posición X | 0.5058 | 0.5000 | 1.15% | 0.5060 | 0.05% |
| frente | Sonrisa · posición Y | 0.3136 | 0.2994 | 4.51% | 0.3136 | 0.01% |
| frente | Sello · ancho | 0.4581 | 0.3205 | 30.04% | 0.4549 | 0.70% |
| frente | Sello · altura | 0.2347 | 0.1453 | 38.08% | 0.2326 | 0.92% |
| frente | Sello · posición X | 0.4965 | 0.5000 | 0.70% | 0.5000 | 0.70% |
| frente | Sello · posición Y | 0.6210 | 0.6221 | 0.17% | 0.6221 | 0.17% |
| frente | Brazos · envergadura / altura | 0.7347 | 0.4884 | 33.53% | 0.7360 | 0.18% |
| frente | Brazo · altura | 0.2873 | 0.1802 | 37.26% | 0.2907 | 1.19% |
| frente | Punta · ancho al 97% | 0.1907 | 0.1090 | 42.85% | 0.1854 | 2.78% |
| frente | Torso · ancho al 78% | 0.6558 | 0.5577 | 14.96% | 0.6510 | 0.74% |
| frente | Ojos visibles | 2 | 2 | — | 2 | — |
| tres-cuartos | Cabeza / altura | 0.4352 | 0.4535 | 4.20% | 0.4360 | 0.19% |
| tres-cuartos | Ancho cabeza / altura | 0.5110 | 0.4535 | 11.26% | 0.5151 | 0.81% |
| tres-cuartos | Achatamiento (alto/ancho) | 0.8517 | 1.0000 | 17.42% | 0.8465 | 0.61% |
| tres-cuartos | Ojos · altura | 0.0819 | 0.0674 | 17.66% | 0.0802 | 2.04% |
| tres-cuartos | Ojos · posición X | 0.7333 | 0.7833 | 6.83% | 0.7317 | 0.22% |
| tres-cuartos | Ojos · posición Y | 0.2506 | 0.2209 | 11.84% | 0.2459 | 1.87% |
| tres-cuartos | Ojos · separación | 0.3397 | 0.2654 | 21.88% | 0.3313 | 2.49% |
| tres-cuartos | Sonrisa · ancho | 0.1842 | 0.1728 | 6.18% | 0.1841 | 0.06% |
| tres-cuartos | Sonrisa · altura | 0.0391 | 0.0308 | 21.23% | 0.0373 | 4.59% |
| tres-cuartos | Sonrisa · posición X | 0.7452 | 0.7848 | 5.31% | 0.7552 | 1.33% |
| tres-cuartos | Sonrisa · posición Y | 0.3203 | 0.2994 | 6.52% | 0.3136 | 2.09% |
| tres-cuartos | Sello · ancho | 0.3756 | 0.2564 | 31.73% | 0.3781 | 0.67% |
| tres-cuartos | Sello · altura | 0.2372 | 0.1453 | 38.71% | 0.2326 | 1.94% |
| tres-cuartos | Sello · posición X | 0.7213 | 0.7000 | 2.95% | 0.7331 | 1.63% |
| tres-cuartos | Sello · posición Y | 0.6186 | 0.6221 | 0.57% | 0.6221 | 0.57% |
| tres-cuartos | Brazos · envergadura / altura | 0.6088 | 0.4535 | 25.51% | 0.6360 | 4.48% |
| tres-cuartos | Brazo · altura | 0.2885 | 0.1802 | 37.53% | 0.2907 | 0.76% |
| tres-cuartos | Punta · ancho al 97% | 0.1746 | 0.1090 | 37.60% | 0.1790 | 2.50% |
| tres-cuartos | Torso · ancho al 78% | 0.6411 | 0.5577 | 13.02% | 0.6258 | 2.39% |
| tres-cuartos | Ojos visibles | 2 | 2 | — | 2 | — |
| perfil | Cabeza / altura | 0.4345 | 0.4535 | 4.37% | 0.4360 | 0.35% |
| perfil | Ancho cabeza / altura | 0.4871 | 0.4535 | 6.91% | 0.4895 | 0.49% |
| perfil | Achatamiento (alto/ancho) | 0.8920 | 1.0000 | 12.11% | 0.8907 | 0.14% |
| perfil | Ojos · altura | 0.0832 | 0.0674 | 18.97% | 0.0802 | 3.60% |
| perfil | Ojos · posición X | 0.8907 | 0.9712 | 9.03% | 0.8973 | 0.74% |
| perfil | Ojos · posición Y | 0.2497 | 0.2209 | 11.52% | 0.2459 | 1.51% |
| perfil | Sonrisa · ancho | 0.0528 | 0.0340 | 35.49% | 0.0528 | 0.01% |
| perfil | Sonrisa · altura | 0.0355 | 0.0308 | 13.19% | 0.0372 | 4.68% |
| perfil | Sonrisa · posición X | 0.9585 | 0.9709 | 1.29% | 0.9514 | 0.74% |
| perfil | Sonrisa · posición Y | 0.3201 | 0.2994 | 6.45% | 0.3135 | 2.05% |
| perfil | Sello · ancho | 0.1005 | 0.0385 | 61.73% | 0.1021 | 1.63% |
| perfil | Sello · altura | 0.2240 | 0.1453 | 35.11% | 0.2326 | 3.83% |
| perfil | Sello · posición X | 0.9095 | 0.8500 | 6.55% | 0.9074 | 0.24% |
| perfil | Sello · posición Y | 0.6126 | 0.6221 | 1.55% | 0.6221 | 1.55% |
| perfil | Brazos · envergadura / altura | 0.4871 | 0.4535 | 6.91% | 0.4895 | 0.49% |
| perfil | Brazo · altura | 0.2987 | 0.1802 | 39.65% | 0.2907 | 2.66% |
| perfil | Punta · ancho al 97% | 0.1608 | 0.1090 | 32.23% | 0.1662 | 3.34% |
| perfil | Torso · ancho al 78% | 0.5980 | 0.5577 | 6.74% | 0.5757 | 3.73% |
| perfil | Ojos visibles | 1 | 2 | — | 1 | — |

## Capturas y comparación interactiva

El botón **Comparar Punto** abre las tres vistas, lado a lado o superpuestas con opacidad 0–100%, cuadros de referencia y tabla viva. El SVG exportado conserva solo geometría vectorial de la escena; la imagen raster de la hoja vive únicamente en esta herramienta de comparación.

Expediente externo de firstmate: `studio-v6/before-after-0.png`, `before-after-1.png`, `before-after-2.png` (hoja/antes/después); `comparison-side-0.png` a `comparison-side-2.png`; `comparison-overlay-0.png` a `comparison-overlay-2.png` al 50%; capturas móvil, rotaciones de mapas y banco, escena por defecto y tres configuraciones extremas. `mascot-measurements.json` contiene el resultado reproducible.

Validación local; la revisión independiente y publicación siguen por el paso no-mistakes acordado.

# Identidad VecinoClub

## Propiedad y alcance

Este repositorio define la identidad de VecinoClub como marca. No define el sistema de componentes de `loyalty-platform` ni la identidad visual de un comercio. Imaquinaria es un tenant y conserva su identidad en su propio repositorio.

## Color

`tokens/vecinoclub.css` es la fuente ejecutable de los colores. La paleta cálida es optativa para superficies de marca como la landing o el acceso de la plataforma. La interfaz operativa usa la base neutral; no mezclar la paleta cálida con acentos de tenant en una misma superficie. El acento naranja `#fb772a` es común a los temas claro y oscuro.

Los valores `--vc-success`, `--vc-warning` y `--vc-danger` documentan el aspecto de superficies de marca. Los estados semánticos de la interfaz operativa pertenecen a su sistema de diseño.

## Tipografía

Rubik para texto e interfaz. Barlow Condensed para titulares o énfasis de marca. Los archivos en `fonts/` se distribuyen bajo las licencias OFL incluidas. Usar Barlow Condensed con moderación para preservar legibilidad.

## Logotipos

Las variantes oficiales están en `assets/identity/`. Elegir la versión que mantenga contraste suficiente sobre el fondo. Usar variantes monocromáticas cuando la personalización de un tenant requiera separar la marca de un acento ajeno. No recolorear el SVG ni editar sus proporciones en cada consumidor.

## Distribución

Cada consumidor fija un commit de este repositorio y copia los archivos necesarios. Una actualización de marca requiere revisar ambos temas y los contextos de logo en los consumidores antes de subir el commit fijado.

# Fuentes del taller

`npm ci && npm run build` genera `../escena-isometrica.html`. El resultado se abre desde disco sin dependencias externas. `npm run typecheck` comprueba TypeScript; `npm test` conduce Chrome instalado mediante Playwright Core y guarda evidencia en un directorio temporal o `SCENE_EVIDENCE_DIR`.

- `src/app.tsx`: interfaz shadcn, selección, menús y gestos de edición.
- `src/model.ts`: documento de diseño y creación/duplicación de piezas.
- `src/projection.ts`, `src/environment.ts`: planos y geometría del entorno.
- `src/characters.ts`: geometría 3D y orientación de Punto e isotipo; módulo independiente del editor.
- `src/scene.ts`: nodos SVG, orden, estilos, hover, animación y exportación.
- `src/components/ui/`: componentes shadcn obtenidos por CLI, con cambios locales acotados.
- `src/vendor/anatomy/`: kit MIT de Ryan, sin modificaciones; su aviso está junto al código.
- `build.mjs`: empaquetado de JS/CSS, fuentes y avisos de licencia en un único HTML.

Uso, controles, comparación de motores y licencias en [la guía del taller](../escena-isometrica.md). Los prototipos comparativos y capturas de desarrollo están en el expediente externo de firstmate, no en los activos de marca.

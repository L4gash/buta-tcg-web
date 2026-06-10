# BUTA TCG — Sitio web

Web oficial de BUTA TCG: torneos de Yu-Gi-Oh! Trading Card Game en Córdoba, Argentina.

## ¿Cómo veo la web en mi compu?

1. Instalá [Node.js](https://nodejs.org) (si no lo tenés).
2. En esta carpeta, ejecutá: `node serve.mjs`
3. Abrí http://localhost:3000 en el navegador.

## ¿Cómo conecto la planilla de Google? (torneos e inscripciones)

**Empezá por acá → [docs/setup-google-sheets.md](docs/setup-google-sheets.md)** — guía de 5 pasos.
Sin la planilla conectada, la web funciona igual mostrando los datos de respaldo (el YACS 06/12).

## ¿Dónde va cada cosa?

| Carpeta / archivo | Qué es |
|---|---|
| `index.html`, `torneos.html`, `resultados.html`, `nosotros.html` | Las 4 páginas del sitio |
| `js/config.js` | Acá se pegan los links de la planilla (ver guía) |
| `assets/results/` | Fotos de los tops (subir acá las fotos nuevas, en minúsculas y sin espacios) |
| `apps-script/Code.gs` | El código que se pega en Google Apps Script (ver guía, paso 3) |
| `docs/sheets-template/` | CSVs para importar en la planilla la primera vez |
| `scripts/optimize-images.mjs` | Achica y renombra fotos nuevas (`node scripts/optimize-images.mjs`) |

## Para desarrolladores

- Sin build: HTML + Tailwind CDN + JS vanilla (ES modules).
- Tests: `npm test` (Node 18+; el proyecto usa `node --test`).
- Capturas: `node screenshot.mjs http://localhost:3000 [etiqueta] [ANCHOxALTO]`

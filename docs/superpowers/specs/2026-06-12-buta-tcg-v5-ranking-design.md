# BUTA TCG v5 — Página de Ranking de liga

**Fecha:** 2026-06-12
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio v4 en producción (https://l4gash.github.io/buta-tcg-web/). Specs previos: v1–v4 en `docs/superpowers/specs/`.

## Resumen

Agregar una página **Ranking** que muestra la tabla de puntos de liga acumulados por jugador, leída de un **segundo Google Sheet público** (distinto al de torneos/inscripciones). Los puntos ya vienen calculados en ese sheet (columna `PL Totales`); la web solo los muestra. Incluye una sección estática "¿Cómo se ganan los puntos?" recreada en el tema del sitio. Sin cambios en el backend ni en la planilla de torneos/inscripciones.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Página | Nueva `ranking.html`; ítem "Ranking" en el menú de las 5 páginas (entre Resultados y Nosotros). |
| Fuente de datos | 2º spreadsheet (id `1N4S4eMmxVJxxyXVrOQpSI1vg3-u_LrC3o3b9ZzHRriY`, gid `2006498169`), leído como CSV vía endpoint `gviz/tq?tqx=out:csv` (verificado accesible). Nueva const `RANKING_CSV_URL` en `js/config.js`. |
| Columnas mostradas | Pos · Jugador · PL Totales · Torneos Jugados · Última fecha. (No se muestra Victorias.) |
| Orden | El que trae el sheet (por `Pos`). Se filtran filas sin jugador (relleno). |
| Contenido extra | Sección "¿Cómo se ganan los puntos?" en HTML estático (Victoria 3 · Top8 +2 · Top4 +1 · Top2 +1 · Campeón +1, acumulativo). Sin las infografías JPG; sin el bloque de Torneo Especial/Retadores (fuera de alcance). |
| Privacidad | El sheet de ranking solo tiene nombres + métricas, sin datos personales → público OK. |
| Cálculo de puntos | Lo hace BUTA en el sheet; la web NO calcula, solo lee `PL Totales`. |

## Estructura del segundo sheet (verificada)

Encabezado: `Pos, Jugador, Victorias, Torneos Jugados, PL Totales, Ultima fecha` (+ 2 columnas extra sin nombre que la web ignora). 39 jugadores reales seguidos de filas de relleno vacías (Jugador en blanco) que deben filtrarse.

## 1. Datos (`js/data.js`, `js/config.js`)

- `js/config.js`: nueva const `RANKING_CSV_URL` con el endpoint CSV del gid de ranking.
- `js/data.js`:
  - `FALLBACK_RANKING`: array embebido con ~5 filas de ejemplo (objetos con claves `Pos, Jugador, 'PL Totales', 'Torneos Jugados', 'Ultima fecha'`) para que la página no quede vacía si el CSV no responde.
  - `loadRanking()`: `fetchCsv(RANKING_CSV_URL, FALLBACK_RANKING)` (reusa el `fetchCsv` con timeout + fallback ya existente).
  - `filtrarRanking(rows)` (pura, testeable): descarta filas cuyo `Jugador` (trim) está vacío.
- `parseCsv` ya maneja los encabezados con espacios (`PL Totales`, etc.) y las columnas sin nombre (clave `''`, ignorada).

## 2. Página (`ranking.html` + `js/ranking.js`)

- `ranking.html`: chrome compartido (head con el comentario de autoría como las otras páginas; nav con "Ranking" activo). `<main>` con:
  - Hero: eyebrow "Temporada 2026", título "Ranking de liga".
  - `#tabla-ranking` (poblado por JS; skeleton al cargar).
  - Sección estática "¿Cómo se ganan los puntos?" (5 tarjetas en el tema; nota de acumulativo).
- `js/ranking.js` (módulo): `loadRanking()` → `filtrarRanking()` → render.
  - **Escritorio:** tabla/grilla de 5 columnas (Pos, Jugador, PL, Torneos, Última fecha); medallas 🥇🥈🥉 en puestos 1-3; fila 1 con tinte dorado; PL destacado en azul.
  - **Celular:** cada fila como tarjeta (medalla + nombre + PL grande a la derecha; "N torneos · últ. fecha" en chico). Sin scroll horizontal.
  - `esc()` en todos los campos del sheet.
  - Si `filtrarRanking` devuelve vacío: mensaje "Todavía no hay puntos cargados."
- El menú "Ranking" se agrega a `index.html`, `torneos.html`, `resultados.html`, `nosotros.html` y `ranking.html` (nav de 5 ítems; debe entrar sin romper en 390px).

## 3. Verificación

- **Tests** (`node --test`): `filtrarRanking` (descarta filas sin Jugador; conserva las que tienen; maneja `[]`).
- **Visual** (screenshots ≥2 rondas, móvil + escritorio): página de Ranking con datos reales (tabla + medallas + sección de puntos); nav de 5 ítems sin overflow en 390px en las 5 páginas.
- **Live check** post-deploy: la tabla carga del 2º sheet; las 5 páginas sin errores de consola; firma de consola presente.
- Sin E2E de backend (no se toca Apps Script ni la planilla de inscripciones).

## Manejo de errores / compatibilidad

- CSV de ranking no responde → `FALLBACK_RANKING` (la página no queda vacía).
- Filas de relleno vacías → filtradas por `filtrarRanking`.
- Si el sheet cambia el orden de columnas, el acceso es por nombre de encabezado (no por índice), así que tolera reordenamientos mientras los nombres se mantengan.

## Fuera de alcance

- Cálculo de puntos en la web (lo hace el sheet).
- Infografías JPG del usuario / bloque de Torneo Especial y Challengers (se recrea solo el sistema de puntos).
- Edición del ranking desde la web.
- Histórico por temporada / gráficos de evolución.

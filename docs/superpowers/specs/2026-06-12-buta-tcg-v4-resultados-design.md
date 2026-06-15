# BUTA TCG v4 — Resultados sin foto obligatoria

**Fecha:** 2026-06-12
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio v3 en producción (https://l4gash.github.io/buta-tcg-web/). Specs previos: v1 `2026-06-09`, v2 `2026-06-10`, v3 `2026-06-11`.

## Resumen

Adaptar la página **Resultados** al flujo real de BUTA: normalmente solo el campeón tiene foto de decklist; el resto del top son puesto + nombre (+ deck cuando se conoce). Hoy cada fila dibuja un `<img>` siempre, así que una fila sin foto muestra una imagen rota. Esta mejora hace que **las filas sin foto se rendericen de forma compacta y prolija** (sin imagen, sin lightbox), y muestra la línea de deck solo cuando hay dato. El estilo elegido es "compacta" (las tarjetas sin foto son más bajas; solo las que tienen foto muestran la imagen grande). Sin cambios de backend ni de esquema de planilla.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Estilo de tarjeta sin foto | Compacta (más baja): medalla/puesto + nombre + deck (si hay). Sin placeholder de imagen. |
| Línea de deck | Se muestra solo si `deck` no está vacío y no es `—`. |
| Foto del campeón | Hosting asistido por el dev (opción C): BUTA envía la imagen, el dev la sube al repo `assets/results/` y le indica el nombre para la celda `foto`. Sin formulario de subida nuevo. |
| Esquema de planilla | Sin cambios (`torneo, puesto, nombre, deck, foto`). |
| Backend | Sin cambios (no toca Apps Script). |
| Profundidad de top | Variable; típico Top 8. La página ya se adapta a la cantidad de filas. |

## 1. Cambios de renderizado (`js/resultados.js`)

### Helpers puros nuevos (en `js/data.js`, testeables en Node)
- `tieneFoto(r)`: `true` si `r.foto` tras trim no está vacío.
- `deckVisible(deck)`: `true` si `deck` tras trim no está vacío y distinto de `—`.

### `tarjeta(r, destacada)`
- **Con foto** (`tieneFoto(r)`): comportamiento actual — `<button class="tarjeta-resultado" data-foto data-alt>` con `<img>` (eager+fetchpriority si destacada), abre lightbox. Alt "Decklist de {nombre} (Top {puesto})".
- **Sin foto**: un contenedor NO interactivo (`<div>`, sin clase `tarjeta-resultado`, sin `data-foto`, sin `<img>`), más bajo, con: medalla/`#puesto`, nombre, y — si `deckVisible` — la línea "Deck: {deck}". Mantiene el marco dorado (`border-oro/60`) cuando `puesto === 1`.
- La línea de deck (en ambos tipos) usa `deckVisible`: si no hay deck, se omite la línea por completo (no más "Deck: —").

### `render(resultados)`
- Sin cambios estructurales: podio = puestos ≤ 3 (Top 1 destacado/dorado, centrado en desktop), grilla = puestos > 3, encabezado "Top {podio.length+1}–{total}". Las tarjetas compactas conviven con las que tienen foto en la misma grilla; el alto desparejo es aceptable (las tarjetas se alinean arriba).

### Lightbox
- Solo las tarjetas con foto tienen la clase/atributos que dispara el lightbox. El listener delegado actual (`closest('.tarjeta-resultado')`) ya ignora las compactas. Sin cambios en el lightbox.

## 2. Datos y flujo de carga

- **Self-service (texto):** BUTA agrega filas en `Resultados` con `torneo`, `puesto`, `nombre`; `deck` solo donde lo tenga; `foto` vacío salvo el campeón. La web actualiza sola (CSV publicado).
- **Foto del campeón (dev-asistido):** BUTA envía la imagen → el dev la optimiza con `scripts/optimize-images.mjs` (o equivalente) y la commitea a `assets/results/` → le indica a BUTA el nombre exacto para poner en la celda `foto` de la fila del campeón. (La página también acepta una URL completa en `foto` si en el futuro se quiere, porque `src()` usa el valor tal cual cuando contiene `/`.)
- **Doc:** se actualiza la sección de "cargar resultados" en `docs/setup-google-sheets.md` con este flujo (filas de texto self-service; foto del campeón vía dev; `foto` vacío = tarjeta compacta).

## 3. Verificación

- **Tests** (`node --test`): `tieneFoto` (vacío/espacios → false; con valor → true) y `deckVisible` (vacío → false; `—` → false; `Snake-Eye` → true; espacios → false).
- **Visual** (screenshots, ≥2 rondas, móvil + escritorio):
  1. **Torneo normal:** Top 8 donde solo el puesto 1 tiene foto y la mayoría sin deck → el campeón con imagen + dorado, el resto tarjetas compactas, sin imágenes rotas, sin "Deck: —".
  2. **Retrocompatibilidad YACS:** los 8 con foto y deck → idéntico a hoy.
  3. Un caso mixto (algunos con deck, otros no) para confirmar que la línea de deck aparece/desaparece bien.
- **Sin E2E de backend** (no se toca Apps Script ni la planilla).
- La verificación del torneo normal se hace con datos de prueba locales (editar temporalmente `FALLBACK_RESULTADOS` o servir un CSV de prueba), revirtiendo antes de commitear.

## Fuera de alcance

- Formulario/subida de decklists desde la web (se descartó: hosting asistido por el dev).
- Cambios en el esquema de la planilla o en el Apps Script.
- Galería/zoom adicional más allá del lightbox actual.
- Carga automática de decks por arquetipo o integración con bases de mazos.

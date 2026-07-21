# BUTA TCG v6 — Perfil de jugador + buscador

**Fecha:** 2026-06-19
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio v5 en producción (https://l4gash.github.io/buta-tcg-web/). Specs previos: v1–v5 en `docs/superpowers/specs/`.

## Resumen

Al tocar (o buscar) el nombre de un jugador se abre una **ficha en ventana emergente (modal)** con su historial en la liga, armada 100% con los datos que ya se cargan: la pestaña **Resultados** (torneos donde entró al Top 8 + su puesto) y la pestaña **Ranking** (PL Totales, posición, torneos jugados, victorias). Sin backend nuevo ni cambios en las planillas ni en el Apps Script. Es la feature #1 de un roadmap mayor (después: estadísticas/récords, temporadas manuales, countdown+calendario, aviso por email).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Coincidencia de nombres | Por nombre EXACTO. BUTA normaliza los nombres en las planillas (una vez) para que cada jugador se escriba siempre igual. El código no mantiene tabla de alias. |
| Presentación | Modal (mismo patrón que el lightbox de decklists): fondo oscurecido, cierra con ✕ / clic afuera / Escape. Componente compartido `js/perfil.js`. |
| Puntos de entrada | Nombres clickeables en Ranking (tabla) y en Resultados (tarjetas); buscador en la página de Ranking. |
| Datos mostrados | Encabezado (nombre, posición liga, PL); resumen (campeonatos/podios/Top 8/torneos jugados/victorias); mejor resultado; historial de torneos con puesto. |
| Backend / planillas | Sin cambios. Solo lectura de Resultados + Ranking (ya publicadas). |
| Temporadas | Fuera de alcance ahora. El perfil muestra el historial completo; el filtro por temporada se añadirá cuando exista esa feature. |

## Tarea operativa de BUTA (una vez)

Unificar los nombres en las pestañas `Resultados` y `Ranking` para que cada jugador se escriba idéntico (ej. siempre "Pedro Torres", nunca "Pedrito"; reemplazar apodos como "Fede"/"Juanito"/"Primo" por el nombre real). El dev entrega la lista de nombres a unificar (buscar-y-reemplazar). Sin esto, el perfil parte el historial de esos jugadores.

## 1. Lógica de agregación (`js/data.js`, pura y testeable)

- `historialJugador(resultados, nombre)` → objeto:
  - `torneos`: array de `{ torneo, puesto, foto }` de las filas de Resultados cuyo `nombre` coincide (exacto, tras trim). Orden: por orden inverso de aparición en el sheet (más reciente primero; el sheet se carga cronológico ascendente, así que se invierte).
  - `campeonatos`: cantidad con `puesto === 1`.
  - `podios`: cantidad con `puesto <= 3`.
  - `top8`: `torneos.length` (cada fila de Resultados es una aparición en el Top 8).
  - `mejorPuesto`: el `puesto` mínimo; `mejorTorneo`: el torneo donde lo consiguió (el más reciente si empata).
  - Si no hay filas → todos en 0 / `torneos: []` / `mejorPuesto: null`.
- `filaRanking(ranking, nombre)` → la fila de Ranking cuyo `Jugador` coincide (exacto, tras trim), o `null`.

Ambas funciones son puras (no tocan DOM) y se testean en Node.

## 2. Componente de perfil (`js/perfil.js`, nuevo)

Responsabilidad única: abrir/cerrar el modal de perfil y renderizar su contenido. Usado por `ranking.js` y `resultados.js`.

- Carga perezosa y cacheada de datos: la primera vez que se abre un perfil, hace `Promise.all([loadResultados(), loadRanking()])` una sola vez y cachea el resultado (en Resultados ya está cargado Resultados; en Ranking ya está Ranking; se completa lo que falte).
- `abrirPerfil(nombre)`: calcula `historialJugador` + `filaRanking`, arma el HTML de la ficha, lo inyecta en el modal y lo muestra. `esc()` en todos los campos.
- Inyecta el markup del modal una sola vez (`#perfil-modal` con overlay + contenedor + botón cerrar). Cierre por ✕ / clic en el backdrop / Escape; foco al abrir va al botón cerrar; al cerrar vuelve al elemento que lo abrió.
- `wirePerfil(root)`: listener delegado que abre el perfil al hacer clic en cualquier `[data-jugador]`.
- Estados: jugador sin fila de ranking → oculta PL/posición; jugador sin historial → "Todavía sin Top 8".

### Contenido de la ficha
- **Encabezado:** nombre; si hay fila de ranking: "#N en la liga · {PL} PL".
- **Resumen:** tarjetas 🥇 campeonatos · 🏅 podios · 🎖️ Top 8 · torneos jugados (de ranking) · victorias (de ranking).
- **Mejor resultado:** medalla/puesto + torneo (o "—" si sin historial).
- **Historial:** lista de `{ puesto, torneo }` (más reciente primero); si la fila tiene `foto`, un mini-enlace/botón "ver decklist" que abre el lightbox de esa imagen (solo en la página Resultados, donde el lightbox existe; en Ranking ese acceso no se muestra para no duplicar el lightbox).

## 3. Puntos de entrada

### Ranking (`ranking.html` + `js/ranking.js`)
- Cada nombre de la tabla se envuelve en un elemento clickeable con `data-jugador="{nombre}"`, clase con indicio visual (hover/subrayado tenue) y `role="button"` + foco accesible.
- **Buscador:** input "Buscar jugador…" arriba de la tabla, con `<datalist>` de los nombres del ranking; al elegir/enter con un nombre válido abre su perfil.
- Importa e inicializa `perfil.js` (`wirePerfil(document)`).

### Resultados (`resultados.html` + `js/resultados.js`)
- **Refactor de la tarjeta con foto:** hoy es un único `<button>` que abre el lightbox. Se reestructura a un contenedor (`<div>`/`<article>`) con: la imagen como botón que abre el lightbox (comportamiento actual) + el nombre como botón separado con `data-jugador` que abre el perfil. HTML válido (sin botones anidados).
- **Tarjeta compacta (sin foto):** el nombre pasa a ser clickeable con `data-jugador` (hoy es texto plano).
- Importa e inicializa `perfil.js`. El lightbox actual no cambia.

## 4. Compatibilidad y errores

- Datos no disponibles (CSV no responde) → se usan los fallbacks existentes; el perfil funciona con lo que haya.
- Nombre sin coincidencias en ninguna planilla → ficha con "Sin datos de este jugador todavía" (caso borde; no debería pasar si el nombre salió de la propia planilla).
- El lightbox de Resultados sigue funcionando igual; el modal de perfil es independiente (otro id, otra capa).

## 5. Verificación

- **Tests** (`node --test`): `historialJugador` (campeonatos/podios/top8/mejorPuesto/orden; caso vacío) y `filaRanking` (encuentra por nombre exacto; null si no está).
- **Visual** (screenshots ≥2 rondas, móvil + escritorio): ficha abierta desde Ranking y desde Resultados; buscador; estados sin-ranking y sin-historial.
- **Interacción** (puppeteer): clic en un nombre abre el modal con datos correctos; en Resultados la foto sigue abriendo la decklist y el nombre abre el perfil; Escape/clic-afuera cierran; foco correcto.
- **Live check** post-deploy: perfiles funcionan en las 2 páginas; las 5 páginas sin errores de consola.

## Fuera de alcance

- Estadísticas globales de la liga (jugador del mes, récords, cara a cara) → feature aparte.
- Temporadas / filtro por temporada → feature aparte.
- Tabla de alias en código (se resuelve normalizando en la planilla).
- Perfil como página propia compartible por link (se eligió modal).
- Edición de datos del jugador desde la web.

# BUTA TCG — Leaderboard de Omega (Duelists Unite)

**Fecha:** 2026-07-22
**Estado:** Diseño aprobado; pendiente revisión del documento escrito.
**Base:** sitio en producción (https://l4gash.github.io/buta-tcg-web/). Feature opt-in: solo aparecen jugadores cuyo perfil de Omega se cargó a propósito.

## Resumen

Una página nueva **Omega** con un leaderboard de los jugadores de BUTA que compiten en la plataforma YGO Omega (Duelists Unite). Muestra, por jugador: puesto, nombre, rating, tier (con color), win rate, matches (W/L) y link a su perfil de Omega. Los datos se **refrescan solos** desde la API pública de Omega vía el backend de Apps Script; el único paso manual es pegar el link del perfil de un jugador nuevo en una planilla, una vez.

## Hallazgo técnico que habilita la feature

Omega expone una **API pública JSON** (sin auth) que devuelve el perfil de cualquier jugador por su Discord ID:

```
GET https://duelistsunite.org/omega-web/v3/profile?id=<discordId>
→ { success, data: { id, username, displayname, avatar,
      tcgwins, tcgloses, tcgdraws, ocgwins, ocgloses, ocgdraws,
      tcgrating, ocgrating, lastlogin, accountrank } }
```

- El Discord ID está en el link del perfil: `tournament.duelistsunite.org/#/profile/<discordId>`.
- **No trae header CORS**, así que el navegador (GitHub Pages) NO puede leerla directo. Pero **Apps Script corre en servidor** (UrlFetchApp) y no le afecta el CORS → el refresco lo hace el backend.
- El dato sale de la fuente, así que **no se puede inflar** (se cae la necesidad de verificar a mano).
- Usamos los campos **TCG** (BUTA es TCG): `tcgrating`, `tcgwins`, `tcgloses`, `tcgdraws`.
- Tier según rating (extraído del cliente de Omega): `Iron` (<50) · `Bronze` ≥50 · `Silver` ≥200 · `Gold` ≥350 · `Platinum` ≥600 · `Diamond` ≥1000 · `Master` ≥1450 · `Omega` ≥2000.

(Endpoint auxiliar: `…/omega-web/v3/leaderboard` da el top 100 global TCG/OCG — no sirve para BUTA porque los locales no están en el top mundial; por eso usamos el endpoint por ID.)

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Fuente de datos | API pública de Omega por Discord ID, leída server-side por Apps Script. |
| Captación (MVP) | El admin pega el link de Omega en la pestaña "Omega" de la planilla. Sin formulario (queda para etapa 2). |
| Refresco | Trigger por tiempo en Apps Script (cada 12–24 h) que actualiza rating/wins/loses/draws/lastlogin. |
| Qué se muestra | Puesto, nombre, rating, tier (color), win rate, matches (W/L), link al perfil de Omega. |
| Cruce con la liga | Columna opcional `nombre_buta`: si está cargada, la fila también linkea al perfil BUTA (`jugador.html?nombre=…`). |
| Formato | TCG. |
| Orden | Por `tcgrating` descendente. |

## Contexto del código existente (verificado)

- `js/data.js`: patrón `loadX()` que baja un CSV publicado y lo parsea; helper `esc`. Agregar `loadOmega()`.
- `js/layout.js`: `PAGINAS` es la única fuente del nav.
- `apps-script/Code.gs`: backend en el repo que el admin sincroniza al editor de Apps Script a mano (mismo flujo para agregar la función nueva).
- Página de referencia para chrome/estilo: `ranking.html` (tabla tipo ranking). Perfiles BUTA en `jugador.html?nombre=…`.
- Split puro/entry ya usado (ej. `records-calc.js` + `records.js`).

## 1. Datos y backend

### Planilla — pestaña nueva "Omega"
Columnas (el admin solo toca las dos primeras):
- `link` — link del perfil de Omega (admin).
- `nombre_buta` — nombre en la liga, opcional (admin).
- Auto (las escribe el trigger): `id`, `nombre` (displayname de Omega), `rating`, `wins`, `loses`, `draws`, `lastlogin`, `actualizado` (timestamp), `estado` (ok / error de fetch).

Se publica esta pestaña como CSV (paso del usuario) y su URL alimenta `loadOmega()`.

### Apps Script — `apps-script/Code.gs`
Agregar `refrescarOmega()`:
1. Lee las filas de la pestaña "Omega".
2. Por fila con `link`: extrae el Discord ID con `/profile\/(\d+)/`. Si no matchea → `estado = "link inválido"`, sigue.
3. `UrlFetchApp.fetch('https://duelistsunite.org/omega-web/v3/profile?id=' + id, { muteHttpExceptions: true })`.
4. Si `success` y hay `data`: escribe `nombre=displayname`, `rating=tcgrating` (redondeado), `wins=tcgwins`, `loses=tcgloses`, `draws=tcgdraws`, `lastlogin`, `actualizado=now`, `estado="ok"`.
5. Errores por fila con try/catch → `estado` con el detalle; nunca corta la corrida entera.

Trigger por tiempo (cada 12 h ó 24 h) que llama `refrescarOmega`. Se documentan los pasos exactos para crearlo en el editor (una vez). El resto del `Code.gs` (registros/recibos/decklists/avisos) queda intacto.

## 2. Página y cálculo

### `js/omega-calc.js` (puro, testeable)
- `tierDeRating(rating)` → `{ nombre, clase }` según la escalera de arriba; `clase` = color temático por tier (definir en la implementación, coherente con el theme Neón).
- `winRate(wins, loses)` → porcentaje (número) o `null` si `wins+loses === 0`.
- `construirLeaderboard(rows)` → filas con `estado === "ok"` y `rating` numérico, ordenadas por `rating` desc, cada una con `{ puesto, nombre, nombreButa, rating, tier, winRate, matches, wins, loses, id, link }` donde `matches = wins+loses+draws`. Descarta filas sin rating válido.

### `js/omega.js` (entry/render)
- `loadOmega()` (CSV publicado) → `construirLeaderboard` → render de la tabla.
- Cada fila: `#puesto` · nombre (si `nombreButa` → `<a href="jugador.html?nombre=…">`, si no texto plano) · rating · badge de tier con color · win rate `%` · `W–L` · link al perfil de Omega (`https://tournament.duelistsunite.org/#/profile/<id>`, `target="_blank" rel="noopener noreferrer"`).
- `esc()` en nombres; `encodeURIComponent` en hrefs. Estados: sin datos → aviso; error de carga → mensaje (patrón de `jugador.js`).
- Responsive (móvil: columnas legibles / se apilan las secundarias). Nota breve de contexto ("Datos de YGO Omega · Duelists Unite, se actualizan periódicamente").

### Nav (`js/layout.js`)
Agregar `{ archivo: 'omega.html', etiqueta: 'Omega' }` a `PAGINAS` (posición a decidir en el plan; propuesto junto a "Ranking" por ser ranking-adjacent). Actualizar `tests/layout.test.mjs`. **Nota de densidad:** el nav quedaría con 10 ítems; a ~640–900px ya venía apretado. No se resuelve acá, pero se deja anotado como posible follow-up (agrupar páginas de stats en un desplegable).

## 3. Verificación

- **Tests** (`node --test`): `tierDeRating` en cada borde (49→Iron, 50→Bronze, 200→Silver, 350→Gold, 600→Platinum, 1000→Diamond, 1450→Master, 2000→Omega); `winRate` (incl. 0 games → null, redondeo); `construirLeaderboard` (orden desc, `matches`, descarte de filas inválidas, link a BUTA solo si hay `nombre_buta`).
- **Backend**: verificación manual — correr `refrescarOmega` una vez y confirmar que la planilla se llena (rating/W/L/tier) para un ID real (ej. 354099825249353738 → MarianoCB); una fila con link inválido marca `estado` sin cortar la corrida.
- **Visual** (screenshots ≥2 rondas, móvil + escritorio): leaderboard con datos reales, badges de tier con color, links a Omega y (cuando hay `nombre_buta`) a BUTA; estado vacío.
- **Live check** post-deploy: la página carga, muestra el leaderboard desde el CSV, nav muestra "Omega", sin errores de consola.

## Pasos del usuario (fuera del código)

1. Crear la pestaña "Omega" con los encabezados y publicarla como CSV; pasar la URL para `loadOmega()`.
2. Pegar el `Code.gs` actualizado en el editor de Apps Script y crear el trigger por tiempo de `refrescarOmega`.
3. Ir pegando los links de Omega de los jugadores que quieran aparecer (opt-in).

## Fuera de alcance

- Formulario de autoservicio para que el jugador cargue su perfil (etapa 2).
- Ranking OCG, historial/evolución del rating en el tiempo, avatares de Omega.
- Cálculo automático de posiciones dentro de la liga BUTA (no relacionado).
- Cualquier dato privado: solo se muestran perfiles públicos y opt-in.

# BUTA TCG — Cara a cara (head-to-head)

**Fecha:** 2026-07-22
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio en producción (https://l4gash.github.io/buta-tcg-web/). Segunda de la cola de features "de jugadores" (después del Salón de récords; antes de la evolución del meta).

## Resumen

Una página nueva **Cara a cara** que compara dos jugadores lado a lado usando los datos que ya se cargan (Resultados + Ranking). Muestra las estadísticas de cada uno y sus **coincidencias en el top** (torneos donde ambos entraron al Top 8, con quién quedó más arriba). Sin backend ni cambios en las planillas.

**Nota de datos (importante):** Resultados registra el **puesto de cada jugador por torneo**, no los resultados de partidas mano a mano. Por eso el "cara a cara" es comparación de estadísticas + coincidencias en el top, **no** un historial de victorias directas entre los dos.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Stats comparadas | Campeonatos, Top 8, podios, mejor puesto, promedio de puesto, posición de ranking, PL. |
| Coincidencias | Marcador (total, A arriba N, B arriba M) + lista de esos torneos con el puesto de cada uno (link al resultado). |
| Ubicación / selección | Página propia `cara-a-cara.html` con dos buscadores; ítem "Cara a cara" en el nav; link compartible `?a=…&b=…`. |
| Agrupación de nombres | Por `normalizarNombre` / `coincideJugador` (variantes = misma persona). |
| Backend / planillas | Sin cambios. Solo lectura de Resultados + Ranking. |

## Contexto del código existente (verificado)

- `js/historial.js`: `historialDe(nombre, grupos)` → participaciones `{torneo, puesto, deck}`; `estadisticasDe(historial)` → `{fechas, campeonatos, podios, mejorPuesto, promedioPuesto}`.
- `js/data.js`: `loadResultados()`, `loadRanking()`, `groupResultados(rows)`, `filtrarRanking(rows)`, `esc`.
- `js/buscar.js`: `normalizarNombre`, `coincideJugador`.
- `js/directorio-jugadores.js`: `listaJugadores(resultadosRows, rankingRows)` → lista deduplicada de todos los jugadores (`{nombre, tops, campeonatos, pos}`), ordenada alfabéticamente. Se reutiliza para poblar los buscadores.
- `js/layout.js`: `PAGINAS` (única fuente del nav); header/footer inyectados; `#volver`.
- Página de referencia para chrome: `ranking.html`. Resultados deep-link `resultados.html?torneo=…` ya existe.

## 1. Lógica (`js/cara-a-cara-calc.js`, pura y testeable)

`caraACara(resultadosRows, rankingRows, nombreA, nombreB, opciones = {})` → objeto:

```
{
  a: { nombre, campeonatos, top8, podios, mejorPuesto, promedio, pos, pl },
  b: { nombre, campeonatos, top8, podios, mejorPuesto, promedio, pos, pl },
  coincidencias: {
    total,          // torneos donde ambos entraron al top
    aArriba,        // veces que A terminó más arriba (puestoA < puestoB)
    bArriba,        // veces que B terminó más arriba
    torneos: [ { torneo, puestoA, puestoB } ]  // más reciente primero
  }
}
```

Cálculo:
- Agrupa los resultados con `groupResultados`. Para cada jugador, `historialDe` + `estadisticasDe` dan campeonatos/podios/mejorPuesto/promedio; `top8 = historial.length`. `pos`/`pl` salen de la fila de `filtrarRanking(rankingRows)` que coincide (`coincideJugador`), o `null` si no está.
- **Coincidencias:** recorrer los torneos en orden; en los que **ambos** jugadores tienen una fila (coinciden por `coincideJugador`), tomar `{ torneo, puestoA, puestoB }` (puestos numéricos). `aArriba` = cantidad con `puestoA < puestoB`; `bArriba` = con `puestoB < puestoA` (dentro de un torneo los puestos son únicos, no hay empate). La lista `torneos` va del más reciente al más viejo (invertir el orden del CSV).
- **Nombre a mostrar:** el "canónico" de cada jugador (el del ranking si existe; si no, la grafía más frecuente en Resultados). Reusar el criterio de `listaJugadores`/records según convenga; el `nombre` devuelto es el de mostrar.
- Bordes: si `nombreA`/`nombreB` no matchean a nadie, sus stats quedan en 0/null y `coincidencias` vacío. Si es el mismo jugador (mismo normalizado), la página lo maneja en UI (no es responsabilidad del cálculo).

Función pura (sin DOM ni fetch); se testea en Node.

## 2. Página (`cara-a-cara.html` + `js/cara-a-cara.js`) y nav

### `cara-a-cara.html`
- Chrome compartido (layout.js + `#site-header`/`#site-footer` + `#volver`), head con comentario de autoría, título "Cara a cara — BUTA TCG", OG tags propios.
- `<main>` con hero ("Cara a cara", subtítulo), **dos buscadores** (inputs con `<datalist>` de `listaJugadores`; labels "Jugador A" / "Jugador B") y un contenedor `#comparacion` (vacío hasta elegir dos).

### `js/cara-a-cara.js` (entry/render)
- `Promise.all([loadResultados(), loadRanking()])` (cacheado). Puebla los `<datalist>` con `listaJugadores`.
- Lee `?a=&b=` al cargar; si ambos válidos, precarga los inputs y renderiza. Cada cambio en un input (a un nombre válido de la lista) re-renderiza y actualiza la URL (`history.replaceState`) para que sea compartible.
- **Render de `#comparacion`:**
  - **Encabezado:** los dos nombres (cada uno `<a href="jugador.html?nombre=…">`).
  - **Tabla de stats:** filas (Campeonatos, Top 8, Podios, Mejor puesto, Promedio, Ranking, PL); 2 columnas (A | B). En cada fila se resalta el mejor: mayor en campeonatos/top8/podios; menor en mejor puesto/promedio/posición de ranking; PL mayor. Valores faltantes (sin ranking) → "—".
  - **Coincidencias:** marcador "Se cruzaron en **X** torneos — {A} arriba **N** · {B} arriba **M**"; debajo la lista de `torneos` (nombre linkeando a `resultados.html?torneo=…`, con el puesto/medalla de cada uno y resaltado quién quedó arriba). Si `total === 0`: "Todavía no coincidieron en un top.".
  - **Bordes UI:** mismo jugador en A y B → "Elegí dos jugadores distintos."; falta elegir uno → placeholder "Elegí dos jugadores para compararlos.".
- `esc()` en nombres/torneos; `encodeURIComponent` en hrefs.
- Estilo Neón, responsive (en móvil las dos columnas de stats se mantienen legibles; la lista de coincidencias se apila).

### Nav (`js/layout.js`)
- Agregar `{ archivo: 'cara-a-cara.html', etiqueta: 'Cara a cara' }` a `PAGINAS` (posición a decidir en el plan; propuesto después de "Récords"). Actualizar el test de layout si asertea la lista exacta.

## 3. Verificación

- **Tests** (`node --test`): `caraACara` — stats correctas por jugador; conteo de coincidencias, `aArriba`/`bArriba`, orden de la lista (reciente primero); jugador inexistente → stats vacías; sin coincidencias → `total 0`.
- **Visual** (screenshots ≥2 rondas, móvil + escritorio): la página con dos jugadores reales (tabla comparada con resaltado, marcador + lista de coincidencias); el link `?a=&b=` precarga y renderiza; estado "elegí dos jugadores" y "mismo jugador".
- **Interacción** (puppeteer): elegir A y B rinde la comparación; los nombres linkean al perfil; un torneo de la lista linkea al resultado correcto; el mismo jugador en ambos muestra el aviso.
- **Live check** post-deploy: la página carga, compara con datos reales, nav muestra "Cara a cara", sin errores de consola.

## Fuera de alcance

- Resultados de partidas mano a mano (no existe ese dato).
- Botón "comparar con…" desde el perfil (se eligió solo la página con buscadores).
- Comparar más de dos jugadores.
- Filtro por temporada de la comparación.
- Cambios en el backend o en las planillas.

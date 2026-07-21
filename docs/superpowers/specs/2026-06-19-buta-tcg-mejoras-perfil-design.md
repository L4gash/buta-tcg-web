# BUTA TCG — Mejoras al perfil de jugador

**Fecha:** 2026-06-19
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio en producción (https://l4gash.github.io/buta-tcg-web/). El perfil de jugador ya existe (`jugador.html` + `js/jugador.js` + `js/historial.js`); esto lo mejora, no lo reemplaza.

## Resumen

Tres mejoras concretas al perfil de jugador existente, todas con datos que ya se cargan (Resultados + Ranking), sin backend ni cambios en las planillas:

1. **Más estadísticas** en las tarjetas de resumen: Torneos jugados, Victorias, Veces en Top 8 y Mejor resultado.
2. **Historial clickeable:** cada fila del historial enlaza al resultado de ese torneo, y abre la decklist del jugador si existe.
3. **Indicador de zona** en el encabezado: clasificación directa (1°–8°) o repechaje (9°–16°) al torneo de campeones.

## Contexto del código existente (verificado)

- `js/jugador.js`: arma el perfil. Chips actuales: `#Ranking`, `Puntos de liga`, `Campeonatos`, `Podios`, `Promedio de puesto`. Tiene `filaRanking` (fila del ranking del jugador) y `stats` (`estadisticasDe`).
- `js/historial.js`: `estadisticasDe(historial)` ya devuelve `fechas`, `campeonatos`, `podios`, `mejorPuesto`, `promedioPuesto`. `historialDe`/`historialPorTemporada` arman las participaciones.
- `js/ranking-zonas.js`: `zonaDe(pos)` → `'clasifica'` (1–8), `'repechaje'` (9–16) o `null`. `CORTE_CLASIFICA=8`, `CORTE_REPECHAJE=16`.
- `js/resultados.js`: hoy arranca en la última temporada y el último torneo; **no** lee parámetros de URL. Usa `listaTemporadas`/`filasDeTemporada`/`groupResultados`, un carrusel de fechas (`seleccionar(nombreTorneo)`) y el lightbox (tarjetas con `data-foto`).
- Sheet de ranking: columnas `Pos, Jugador, Victorias, Torneos Jugados, PL Totales, Ultima fecha`.

## 1. Más estadísticas (`js/jugador.js`)

El nuevo set de chips (en este orden), respetando que los que dependen del ranking se omiten si no hay `filaRanking`:

| Chip | Valor | Fuente |
|---|---|---|
| Ranking | `#{Pos}` | filaRanking (si existe) |
| Puntos de liga | `PL Totales` | filaRanking (si existe) |
| Torneos jugados | `Torneos Jugados` | filaRanking (si existe) |
| Victorias | `Victorias` | filaRanking (si existe) |
| Top 8 | `stats.fechas` (cantidad de tops) | historial |
| Campeonatos | `stats.campeonatos` | historial |
| Podios | `stats.podios` | historial |
| Mejor resultado | medalla (`🥇/🥈/🥉`) o `#{mejorPuesto}`; `—` si sin historial | historial |
| Promedio de puesto | `stats.promedioPuesto` a 1 decimal, o `—` | historial |

- La grilla existente (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) acomoda las 9 tarjetas (2 filas en escritorio). Sin cambios de layout.
- "Mejor resultado": si `mejorPuesto === 1/2/3` muestra la medalla; si es mayor, `#{n}`; si no hay historial, `—`.
- Helper de formato de puesto (`medallaOPuesto(n)`) puede vivir en `js/historial.js` como función pura testeable, o inline; se define en el plan.

## 2. Historial clickeable → torneo / decklist

### `js/jugador.js`
- `filaFecha(h)` deja de ser un `<div>` y pasa a ser un `<a href="resultados.html?torneo=<enc>&jugador=<enc>">` (mismos estilos + estado hover/focus). `enc` = `encodeURIComponent`. El `jugador` es el nombre mostrado (`nombreMostrar`).
- Mantiene el chip de deck por fila como está hoy.

### `js/resultados.js`
- Al iniciar, lee `new URLSearchParams(location.search)`: `torneo` y `jugador` (opcional).
- Si hay `torneo` y existe en los datos:
  1. Ubica su temporada con el helper `temporadaDeTorneo(rows, torneo)` y llama a `verTemporada(esaTemporada)`.
  2. Llama a `seleccionar(torneo)` y hace `scrollIntoView` de la sección de resultados / de la tarjeta de fecha seleccionada.
  3. Si además hay `jugador` y ese jugador tiene fila con `foto` en ese torneo, abre su decklist en el lightbox existente (dispara el mismo flujo que un clic en su tarjeta).
- Si `torneo` no existe (dato viejo/renombrado): comportamiento normal (última temporada/torneo), sin error.
- El resto del comportamiento de Resultados no cambia.

### Helper puro nuevo
- `temporadaDeTorneo(rows, torneo)` (en `js/temporadas.js`, testeable): devuelve la temporada (label) de la primera fila cuyo `torneo` coincide, o `null`. Reutiliza la lógica de temporada ya existente.

## 3. Indicador de zona (`js/jugador.js`)

- Debajo del nombre (y del botón "Compartir"), si hay `filaRanking`, una insignia según `zonaDe(Number(filaRanking.Pos))`:
  - `'clasifica'` → "✅ Clasifica al torneo de campeones" (borde/acento dorado, `border-oro`).
  - `'repechaje'` → "🔁 Zona de repechaje (9°–16°)" (acento violeta).
  - `null` o sin `filaRanking` → no se muestra nada.
- Insignia como pill en el tema Neón, centrada, accesible (texto legible, contraste AA).

## 4. Verificación

- **Tests** (`node --test`): `temporadaDeTorneo` (encuentra la temporada de un torneo; `null` si no está) y, si se agrega, `medallaOPuesto` (1→🥇, 3→🥉, 5→"#5", null→"—").
- **Visual** (screenshots ≥2 rondas, móvil + escritorio): perfil con las 9 tarjetas y la insignia de zona (un jugador en zona clasifica, uno en repechaje, uno sin ranking).
- **Interacción** (puppeteer): clic en una fila del historial abre `resultados.html` en el torneo correcto; si el jugador tenía decklist, se abre el lightbox; si no, se ve el torneo sin error. Un `?torneo=` inexistente no rompe la página.
- **Live check** post-deploy: perfil e historial-link funcionan; las páginas sin errores de consola.

## Fuera de alcance

- Limpiar el chip de deck repetido por fila (se decidió no hacerlo ahora).
- Estadísticas globales de la liga (jugador del mes, cara a cara) — feature aparte.
- Cambios en el modelo de temporadas o en el backend/planillas.
- Convertir el perfil en modal (ya es página; se mantiene).

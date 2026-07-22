# BUTA TCG — Salón de récords históricos

**Fecha:** 2026-07-22
**Estado:** Diseño aprobado verbalmente; pendiente revisión del documento escrito.
**Base:** sitio en producción (https://l4gash.github.io/buta-tcg-web/). Primera de la cola de features "de jugadores" (después: cara a cara, evolución del meta).

## Resumen

Una página nueva **Récords** que muestra los rankings históricos de la liga (toda la historia, todas las temporadas) derivados de los datos de Resultados que ya se cargan. Cuatro récords, cada uno con un **mini-podio Top 3** cuyos nombres linkean al perfil del jugador. Sin backend ni cambios en las planillas.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Récords | Más campeonatos 🥇 · Más Top 8 · Más podios 🏅 · Mejor promedio de puesto (mín. 5 tops). |
| Formato | Mini-podio Top 3 por récord; nombres clickeables → `jugador.html?nombre=`. |
| Ubicación | Página propia `records.html` + ítem "Récords" en el nav (`layout.js`). |
| Alcance | Histórico / todas las temporadas (no hay filtro por temporada en esta versión). |
| Agrupación de nombres | Por `normalizarNombre` (ignora mayúsculas/tildes) para que variantes cuenten como el mismo jugador. |
| Backend / planillas | Sin cambios. Solo lectura de Resultados. |

## Contexto del código existente (verificado)

- `js/buscar.js`: `normalizarNombre(s)` (minúsculas + sin tildes) y `coincideJugador(a,b)`.
- `js/data.js`: `loadResultados()` (con fallback), `esc`.
- `js/layout.js`: `PAGINAS` (array de `{archivo, etiqueta}`) es la única fuente del nav; agregar una entrada suma el ítem en las páginas. Header/footer se inyectan en `#site-header`/`#site-footer`. Mecanismo `VOLVER` para la flecha atrás.
- `js/historial.js`: patrón de estadísticas puras existente (referencia de estilo).
- Filas de Resultados: `{ torneo, puesto, nombre, deck, foto, temporada? }`.

## 1. Lógica (`js/records.js`, pura y testeable)

`calcularRecords(resultados, opciones = { minPromedio: 5 })` → objeto con 4 arrays (cada uno el Top 3):

```
{
  campeonatos:    [{ nombre, valor }, ...≤3],
  top8:           [{ nombre, valor }, ...≤3],
  podios:         [{ nombre, valor }, ...≤3],
  mejorPromedio:  [{ nombre, valor }, ...≤3],  // valor = promedio a 1 decimal
}
```

Cálculo:
- Agrupa las filas por `normalizarNombre(nombre)`. Ignora filas con `nombre` vacío.
- Por jugador acumula: `campeonatos` (puesto===1), `top8` (cantidad de filas = apariciones en top), `podios` (puesto≤3), y para el promedio: suma de puestos numéricos y su cantidad.
- **Nombre a mostrar:** la variante de nombre más frecuente del jugador (desempate: la más reciente en el CSV). Así el récord muestra el nombre "canónico" aunque haya variantes.
- **Mejor promedio:** solo jugadores con `top8 >= minPromedio` (5). `valor = (suma/cantidad)` redondeado a 1 decimal; se ordena ascendente (menor promedio = mejor).
- **Orden y desempates** (cada récord toma los primeros 3):
  - Campeonatos: desc por campeonatos, desempata desc por top8, luego alfabético.
  - Top 8: desc por top8, desempata desc por campeonatos, luego alfabético.
  - Podios: desc por podios, desempata desc por campeonatos, luego alfabético.
  - Mejor promedio: asc por promedio, desempata desc por top8 (más muestra), luego alfabético.
- Sin datos suficientes en un récord → array vacío (la página muestra el mensaje vacío para ese bloque).

Función pura (sin DOM ni fetch); se testea en Node.

## 2. Página (`records.html` + `js/records.js` render) y nav

### `records.html`
- Chrome compartido (`#site-header`/`#site-footer` + `js/layout.js`), head con el comentario de autoría y título "Récords — BUTA TCG".
- `<main>` con hero ("Salón de récords", subtítulo "Los números de toda la historia de la liga") y un contenedor `#records` (skeleton al cargar).

### `js/records.js` (render)
- `loadResultados()` → `calcularRecords()` → dibuja 4 bloques. Cada bloque:
  - Título con emoji (🥇 Más campeonatos · 🎖️ Más Top 8 · 🏅 Más podios · 📊 Mejor promedio).
  - Mini-podio: 3 filas (medalla 🥇/🥈/🥉 + nombre como `<a href="jugador.html?nombre=<enc>">` + valor destacado). El 1º con tinte dorado.
  - Si el array está vacío: "Todavía no hay suficientes datos.".
- `esc()` en nombres; `encodeURIComponent` en el href.
- Estilo Neón, responsive (los 4 bloques en grilla: 1 col móvil, 2 en escritorio).

### Nav (`js/layout.js`)
- Agregar `{ archivo: 'records.html', etiqueta: 'Récords' }` al array `PAGINAS` (entre Ranking/Jugadores y Nosotros — posición a decidir en el plan; propuesto después de Jugadores).

## 3. Verificación

- **Tests** (`node --test`): `calcularRecords` — conteos correctos de campeonatos/top8/podios; filtro de mínimo 5 en promedio (un jugador con <5 tops no aparece); orden y desempates; top 3 (no más de 3); nombre canónico = variante más frecuente; caso sin datos → arrays vacíos.
- **Visual** (screenshots ≥2 rondas, móvil + escritorio): la página con datos reales (4 mini-podios, 1º dorado, nombres linkeados); `layout.js` test existente sigue verde con el nuevo ítem de nav.
- **Interacción**: clic en un nombre del podio abre el perfil correcto; nav muestra "Récords" activo en la página.
- **Live check** post-deploy: la página carga, los récords renderizan, sin errores de consola en las páginas.

## Fuera de alcance

- Racha de tops consecutivos y "más decks distintos" (no elegidos ahora).
- Filtro por temporada de los récords (se puede agregar cuando exista la necesidad).
- Cara a cara / evolución del meta (features aparte de la cola).
- Cambios en el backend o en las planillas.

// Historial de un jugador a partir de los resultados agrupados por torneo.
// Funciones puras (sin DOM ni fetch): las usa jugador.html y las testean en Node.
import { coincideJugador } from './buscar.js';
import { groupResultados, deckVisible } from './data.js';
import { listaTemporadas, filasDeTemporada } from './temporadas.js';

// '?nombre=Juan%20Perez' -> 'Juan Perez'. Sin parámetro => ''.
export function nombreDesdeParams(search) {
  return new URLSearchParams(search ?? '').get('nombre')?.trim() ?? '';
}

// Recorre los grupos ({ torneo: filas[] }) y devuelve las participaciones del
// jugador en el orden de los grupos (el CSV va de más viejo a más nuevo).
export function historialDe(nombre, grupos) {
  const out = [];
  for (const filas of Object.values(grupos ?? {})) {
    const fila = filas.find((r) => coincideJugador(r.nombre, nombre));
    if (fila) out.push({ torneo: fila.torneo, puesto: fila.puesto, deck: fila.deck });
  }
  return out;
}

// Historial segmentado por temporada: [{ temporada, items }] en el orden de
// las temporadas (vieja → nueva), incluyendo solo aquellas donde el jugador
// tiene al menos un top. Recibe las filas CRUDAS de resultados (no agrupadas).
export function historialPorTemporada(nombre, rows) {
  return listaTemporadas(rows)
    .map((temporada) => ({
      temporada,
      items: historialDe(nombre, groupResultados(filasDeTemporada(rows, temporada))),
    }))
    .filter((s) => s.items.length > 0);
}

// El deck con más tops del historial, o null si ninguna fila tiene deck cargado.
export function deckFavorito(historial) {
  const conteo = new Map();
  for (const h of historial ?? []) {
    if (!deckVisible(h.deck)) continue;
    const deck = String(h.deck).trim();
    conteo.set(deck, (conteo.get(deck) ?? 0) + 1);
  }
  const top = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { deck: top[0], veces: top[1] } : null;
}

// Resumen del historial: fechas jugadas con top, campeonatos, podios, mejor
// puesto y promedio. El promedio es solo entre las fechas en las que el
// jugador hizo top (Resultados no registra puesto de quien no llegó a top),
// no un promedio sobre todos los torneos a los que asistió.
export function estadisticasDe(historial) {
  const puestos = historial.map((h) => Number(h.puesto)).filter((n) => n > 0);
  return {
    fechas: historial.length,
    campeonatos: puestos.filter((p) => p === 1).length,
    podios: puestos.filter((p) => p <= 3).length,
    mejorPuesto: puestos.length ? Math.min(...puestos) : null,
    promedioPuesto: puestos.length ? puestos.reduce((a, b) => a + b, 0) / puestos.length : null,
  };
}

// Medalla para el podio, "#n" para el resto, "—" si no hay puesto.
export function medallaOPuesto(puesto) {
  const MED = { 1: '🥇', 2: '🥈', 3: '🥉' };
  if (puesto == null) return '—';
  return MED[Number(puesto)] ?? `#${puesto}`;
}

// Historial de un jugador a partir de los resultados agrupados por torneo.
// Funciones puras (sin DOM ni fetch): las usa jugador.html y las testean en Node.
import { coincideJugador } from './buscar.js';

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

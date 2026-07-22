// Comparación "cara a cara" de dos jugadores a partir de Resultados + Ranking.
// Pura (sin DOM ni fetch). Nota: Resultados guarda el puesto por torneo, no
// partidas mano a mano — "coincidencias" = torneos donde ambos hicieron top.
import { groupResultados, filtrarRanking } from './data.js';
import { historialDe, estadisticasDe } from './historial.js';
import { coincideJugador } from './buscar.js';

function statsDe(nombre, grupos, ranking) {
  const historial = historialDe(nombre, grupos);
  const st = estadisticasDe(historial);
  const fila = ranking.find((r) => coincideJugador(r.Jugador, nombre)) ?? null;
  return {
    nombre,
    campeonatos: st.campeonatos,
    top8: st.fechas,
    podios: st.podios,
    mejorPuesto: st.mejorPuesto,        // null si sin tops
    promedio: st.promedioPuesto,        // null si sin tops
    pos: fila ? (Number(fila.Pos) || null) : null,
    pl: fila ? (fila['PL Totales'] ?? null) : null,
  };
}

export function caraACara(resultadosRows, rankingRows, nombreA, nombreB) {
  const grupos = groupResultados(resultadosRows ?? []);
  const ranking = filtrarRanking(rankingRows ?? []);
  const a = statsDe(nombreA, grupos, ranking);
  const b = statsDe(nombreB, grupos, ranking);

  // Torneos donde ambos tienen fila. groupResultados preserva el orden del CSV
  // (viejo→nuevo); invertimos la lista para mostrar reciente→viejo.
  const torneos = [];
  let aArriba = 0;
  let bArriba = 0;
  for (const [torneo, filas] of Object.entries(grupos)) {
    const fa = filas.find((r) => coincideJugador(r.nombre, nombreA));
    const fb = filas.find((r) => coincideJugador(r.nombre, nombreB));
    if (!fa || !fb) continue;
    const puestoA = Number(fa.puesto);
    const puestoB = Number(fb.puesto);
    torneos.push({ torneo, puestoA, puestoB });
    if (puestoA < puestoB) aArriba += 1;
    else if (puestoB < puestoA) bArriba += 1;
  }
  torneos.reverse();
  return { a, b, coincidencias: { total: torneos.length, aArriba, bArriba, torneos } };
}

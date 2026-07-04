// Directorio de todos los jugadores únicos que participaron alguna vez: une
// los nombres de Resultados (todas las temporadas) con los del Ranking actual,
// deduplicando por nombre normalizado (ignora tildes/mayúsculas — la misma
// persona a veces queda cargada con distinta grafía entre planillas). Cuando
// el jugador está en el ranking, esa grafía manda porque es la que carga la
// organización.
import { normalizarNombre } from './buscar.js';

export function listaJugadores(resultadosRows, rankingRows) {
  const porNombre = new Map();

  for (const r of resultadosRows ?? []) {
    const nombre = String(r?.nombre ?? '').trim();
    const key = normalizarNombre(nombre);
    if (!key) continue;
    const actual = porNombre.get(key) ?? { nombre, tops: 0, campeonatos: 0, pos: null };
    actual.tops += 1;
    if (Number(r.puesto) === 1) actual.campeonatos += 1;
    porNombre.set(key, actual);
  }

  for (const r of rankingRows ?? []) {
    const nombre = String(r?.Jugador ?? '').trim();
    const key = normalizarNombre(nombre);
    if (!key) continue;
    const actual = porNombre.get(key) ?? { nombre, tops: 0, campeonatos: 0, pos: null };
    actual.nombre = nombre;
    actual.pos = Number(r.Pos) || null;
    porNombre.set(key, actual);
  }

  return [...porNombre.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

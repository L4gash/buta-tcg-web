// Temporadas de la liga: los resultados se agrupan por la columna `temporada`
// de la hoja Resultados. Las filas sin valor (todas las anteriores a esta
// feature) caen en la temporada por defecto, así el organizador no tiene que
// rellenar el histórico a mano. La temporada "actual" es la última que
// aparece en el CSV (las filas se cargan de más vieja a más nueva).
// Funciones puras: sin DOM ni fetch.
import { deckVisible } from './data.js';
import { normalizarNombre } from './buscar.js';

export const TEMPORADA_DEFECTO = 'Temporada 1';

export function temporadaDe(row) {
  const t = String(row?.temporada ?? '').trim();
  return t || TEMPORADA_DEFECTO;
}

// Temporadas en orden de primera aparición en el CSV (vieja → nueva).
export function listaTemporadas(rows) {
  const vistas = [];
  for (const r of rows ?? []) {
    const t = temporadaDe(r);
    if (!vistas.includes(t)) vistas.push(t);
  }
  return vistas;
}

export function filasDeTemporada(rows, temporada) {
  return (rows ?? []).filter((r) => temporadaDe(r) === temporada);
}

// Los números de una temporada (para el panel de resumen/cierre):
// fechas jugadas, jugadores únicos en los tops, quién ganó más veces y el
// deck con más presencia en los tops.
export function resumenTemporada(rows) {
  const filas = rows ?? [];
  const torneos = new Set();
  const jugadores = new Set();
  const campeonatos = new Map(); // nombre normalizado -> { nombre, cantidad }
  const decks = new Map();       // deck -> cantidad

  for (const r of filas) {
    torneos.add(r.torneo);
    const nombre = String(r.nombre ?? '').trim();
    if (nombre) jugadores.add(normalizarNombre(nombre));
    if (Number(r.puesto) === 1 && nombre) {
      const key = normalizarNombre(nombre);
      const actual = campeonatos.get(key) ?? { nombre, cantidad: 0 };
      actual.cantidad += 1;
      campeonatos.set(key, actual);
    }
    if (deckVisible(r.deck)) {
      const deck = String(r.deck).trim();
      decks.set(deck, (decks.get(deck) ?? 0) + 1);
    }
  }

  const masCampeonatos = [...campeonatos.values()].sort((a, b) => b.cantidad - a.cantidad)[0] ?? null;
  const deckTop = [...decks.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    fechas: torneos.size,
    jugadores: jugadores.size,
    masCampeonatos,
    deckDominante: deckTop ? { deck: deckTop[0], cantidad: deckTop[1] } : null,
  };
}

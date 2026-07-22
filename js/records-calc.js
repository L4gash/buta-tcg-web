// Récords históricos de la liga a partir de las filas de Resultados (todas las
// temporadas). Función pura: sin DOM ni fetch. La usa records.js y la testean en Node.
import { normalizarNombre } from './buscar.js';

// Agrega por jugador (agrupado por nombre normalizado) sobre todas las filas.
function agregarJugadores(rows) {
  const map = new Map(); // clave normalizada -> agregado
  (rows ?? []).forEach((r, i) => {
    const nombre = String(r?.nombre ?? '').trim();
    if (!nombre) return;
    const clave = normalizarNombre(nombre);
    const puesto = Number(r.puesto);
    let a = map.get(clave);
    if (!a) {
      a = { campeonatos: 0, top8: 0, podios: 0, suma: 0, conPuesto: 0, variantes: new Map() };
      map.set(clave, a);
    }
    a.top8 += 1;
    if (puesto === 1) a.campeonatos += 1;
    if (puesto >= 1 && puesto <= 3) a.podios += 1;
    if (puesto >= 1) { a.suma += puesto; a.conPuesto += 1; }
    const v = a.variantes.get(nombre) ?? { cantidad: 0, ultimo: -1 };
    v.cantidad += 1; v.ultimo = i;
    a.variantes.set(nombre, v);
  });
  for (const a of map.values()) {
    // Nombre canónico: la variante más frecuente (desempate: la más reciente).
    a.nombre = [...a.variantes.entries()]
      .sort((x, y) => y[1].cantidad - x[1].cantidad || y[1].ultimo - x[1].ultimo)[0][0];
    a.promedio = a.conPuesto ? a.suma / a.conPuesto : null;
  }
  return [...map.values()];
}

const alfabetico = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
const redondear1 = (n) => Math.round(n * 10) / 10;

export function calcularRecords(rows, opciones = {}) {
  const minPromedio = opciones.minPromedio ?? 5;
  const jugadores = agregarJugadores(rows);

  const top3 = (filtrados, comparador, valorDe) =>
    filtrados.slice().sort(comparador).slice(0, 3).map((j) => ({ nombre: j.nombre, valor: valorDe(j) }));

  return {
    campeonatos: top3(
      jugadores.filter((j) => j.campeonatos > 0),
      (a, b) => b.campeonatos - a.campeonatos || b.top8 - a.top8 || alfabetico(a, b),
      (j) => j.campeonatos),
    top8: top3(
      jugadores.filter((j) => j.top8 > 0),
      (a, b) => b.top8 - a.top8 || b.campeonatos - a.campeonatos || alfabetico(a, b),
      (j) => j.top8),
    podios: top3(
      jugadores.filter((j) => j.podios > 0),
      (a, b) => b.podios - a.podios || b.campeonatos - a.campeonatos || alfabetico(a, b),
      (j) => j.podios),
    mejorPromedio: top3(
      jugadores.filter((j) => j.top8 >= minPromedio && j.promedio != null),
      (a, b) => a.promedio - b.promedio || b.top8 - a.top8 || alfabetico(a, b),
      (j) => redondear1(j.promedio)),
  };
}

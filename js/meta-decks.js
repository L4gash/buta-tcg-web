// Conteo de decks en los tops de la temporada ("el meta de Córdoba").
// Función pura: recibe las filas crudas de resultados y devuelve la lista
// ordenada para el gráfico de barras.
import { deckVisible } from './data.js';

// Filas -> [{ deck, cantidad, pct }] ordenado de mayor a menor.
// Los decks sin dato ('' o '—') no cuentan. Más de `max` decks se pliegan en
// "Otros" (una serie única: nunca inventamos colores por deck).
export function contarDecks(rows, max = 8) {
  const conteo = new Map();
  for (const r of rows ?? []) {
    if (!deckVisible(r?.deck)) continue;
    const deck = String(r.deck).trim();
    conteo.set(deck, (conteo.get(deck) ?? 0) + 1);
  }
  const total = [...conteo.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];

  const orden = [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const visibles = orden.slice(0, max);
  const resto = orden.slice(max).reduce((a, [, n]) => a + n, 0);
  if (resto) visibles.push(['Otros', resto]);

  return visibles.map(([deck, cantidad]) => ({
    deck,
    cantidad,
    pct: Math.round((cantidad / total) * 100),
  }));
}

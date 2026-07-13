import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contarDecks, anchoBarra } from '../js/meta-decks.js';

const fila = (deck) => ({ deck });

test('contarDecks: cuenta, ordena y calcula porcentajes', () => {
  const rows = [fila('Maliss'), fila('Maliss'), fila('Branded'), fila('Kewl Tune'), fila('Maliss')];
  const out = contarDecks(rows);
  assert.equal(out[0].deck, 'Maliss');
  assert.equal(out[0].cantidad, 3);
  assert.equal(out[0].pct, 60);
  assert.equal(out.length, 3);
});

test('contarDecks: ignora decks vacíos o "—"', () => {
  const rows = [fila('Maliss'), fila('—'), fila(''), fila('  '), fila(undefined)];
  const out = contarDecks(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].pct, 100);
});

test('contarDecks: pliega el excedente en "Otros"', () => {
  const rows = ['A', 'A', 'B', 'C', 'D'].map(fila);
  const out = contarDecks(rows, 2);
  assert.equal(out.length, 3);
  assert.equal(out.at(-1).deck, 'Otros');
  assert.equal(out.at(-1).cantidad, 2); // C + D
});

test('contarDecks: sin datos => vacío', () => {
  assert.deepEqual(contarDecks([]), []);
  assert.deepEqual(contarDecks([fila('—')]), []);
});

test('anchoBarra: "Otros" puede ser el máximo real (bug: desbordaba más de 100%)', () => {
  // Caso real reproducido: Kewl Tune 9/16%, Otros 16/29% (suma de varios decks
  // minoritarios que superan al deck individual más jugado).
  const decks = [
    { deck: 'Kewl Tune', cantidad: 9, pct: 16 },
    { deck: 'Sky Striker', cantidad: 6, pct: 11 },
    { deck: 'Otros', cantidad: 16, pct: 29 },
  ];
  assert.equal(anchoBarra(29, decks), 100); // el más largo SIEMPRE ocupa el 100%
  assert.equal(anchoBarra(16, decks), Math.round((16 / 29) * 100));
  assert.equal(anchoBarra(11, decks), Math.round((11 / 29) * 100));
});

test('anchoBarra: caso normal, el primero (mayor) ocupa el 100%', () => {
  const decks = [{ deck: 'A', cantidad: 10, pct: 60 }, { deck: 'B', cantidad: 6, pct: 40 }];
  assert.equal(anchoBarra(60, decks), 100);
  assert.equal(anchoBarra(40, decks), Math.round((40 / 60) * 100));
});

test('anchoBarra: nunca por debajo del mínimo visible (2%)', () => {
  const decks = [{ deck: 'A', cantidad: 100, pct: 95 }, { deck: 'B', cantidad: 1, pct: 1 }];
  assert.equal(anchoBarra(1, decks), 2);
});

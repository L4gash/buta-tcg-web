import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contarDecks } from '../js/meta-decks.js';

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

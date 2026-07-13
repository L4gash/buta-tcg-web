import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPORADA_DEFECTO, temporadaDe, listaTemporadas, filasDeTemporada, resumenTemporada } from '../js/temporadas.js';

const fila = (torneo, puesto, nombre, deck = '', temporada = '') => ({ torneo, puesto, nombre, deck, temporada });

test('temporadaDe: usa la columna o cae a la temporada por defecto', () => {
  assert.equal(temporadaDe(fila('A', '1', 'Ana', '', 'Temporada 2')), 'Temporada 2');
  assert.equal(temporadaDe(fila('A', '1', 'Ana', '', '  Temporada 2  ')), 'Temporada 2');
  assert.equal(temporadaDe(fila('A', '1', 'Ana')), TEMPORADA_DEFECTO);
  assert.equal(temporadaDe({}), TEMPORADA_DEFECTO);
});

const FILAS = [
  fila('Fecha vieja 1', '1', 'Ana'),                       // sin columna => Temporada 1
  fila('Fecha vieja 2', '1', 'Bruno', '', 'Temporada 1'),
  fila('Fecha nueva 1', '1', 'Ana', '', 'Temporada 2'),
  fila('Fecha nueva 2', '1', 'Zoe', '', 'Temporada 2'),
];

test('listaTemporadas: orden de primera aparición en el CSV (vieja → nueva)', () => {
  assert.deepEqual(listaTemporadas(FILAS), ['Temporada 1', 'Temporada 2']);
  assert.deepEqual(listaTemporadas([]), []);
});

test('filasDeTemporada: filtra las filas de esa temporada (incluye las sin columna en la default)', () => {
  assert.deepEqual(filasDeTemporada(FILAS, 'Temporada 1').map((r) => r.torneo), ['Fecha vieja 1', 'Fecha vieja 2']);
  assert.deepEqual(filasDeTemporada(FILAS, 'Temporada 2').map((r) => r.torneo), ['Fecha nueva 1', 'Fecha nueva 2']);
  assert.deepEqual(filasDeTemporada(FILAS, 'Temporada 9'), []);
});

test('resumenTemporada: fechas, jugadores únicos, más campeonatos y deck dominante', () => {
  const rows = [
    fila('F1', '1', 'Ana', 'Maliss'),
    fila('F1', '2', 'Bruno', 'Branded'),
    fila('F2', '1', 'Ana', 'Maliss'),
    fila('F2', '2', 'Zoe', 'Maliss'),
    fila('F3', '1', 'Bruno', 'Branded'),
  ];
  const r = resumenTemporada(rows);
  assert.equal(r.fechas, 3);
  assert.equal(r.jugadores, 3);
  assert.deepEqual(r.masCampeonatos, { nombre: 'Ana', cantidad: 2 });
  assert.deepEqual(r.deckDominante, { deck: 'Maliss', cantidad: 3 });
});

test('resumenTemporada: sin decks cargados ("—" o vacío) => deckDominante null', () => {
  const r = resumenTemporada([fila('F1', '1', 'Ana', '—'), fila('F1', '2', 'Bruno')]);
  assert.equal(r.deckDominante, null);
  assert.equal(r.fechas, 1);
});

test('resumenTemporada: vacía => todo en cero/null', () => {
  assert.deepEqual(resumenTemporada([]), { fechas: 0, jugadores: 0, masCampeonatos: null, deckDominante: null });
});

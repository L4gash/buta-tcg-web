import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaJugadores } from '../js/directorio-jugadores.js';

test('listaJugadores: une resultados y ranking sin duplicar (distinta grafía)', () => {
  const resultados = [{ torneo: 'A', puesto: '2', nombre: 'JUANNY GORDILLO', deck: '' }];
  const ranking = [{ Jugador: 'Juanny Gordillo', Pos: '1' }];
  const lista = listaJugadores(resultados, ranking);
  assert.equal(lista.length, 1);
  // El ranking manda en la grafía visible
  assert.equal(lista[0].nombre, 'Juanny Gordillo');
  assert.equal(lista[0].tops, 1);
  assert.equal(lista[0].pos, 1);
});

test('listaJugadores: jugador solo en resultados (nunca rankeado)', () => {
  const resultados = [{ torneo: 'A', puesto: '3', nombre: 'Alguien Viejo', deck: '' }];
  const lista = listaJugadores(resultados, []);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nombre, 'Alguien Viejo');
  assert.equal(lista[0].pos, null);
  assert.equal(lista[0].tops, 1);
});

test('listaJugadores: jugador solo en ranking (nunca hizo top)', () => {
  const ranking = [{ Jugador: 'Sin Tops', Pos: '30' }];
  const lista = listaJugadores([], ranking);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].tops, 0);
  assert.equal(lista[0].campeonatos, 0);
  assert.equal(lista[0].pos, 30);
});

test('listaJugadores: cuenta tops y campeonatos a través de varias fechas', () => {
  const resultados = [
    { torneo: 'A', puesto: '1', nombre: 'Ana' },
    { torneo: 'B', puesto: '4', nombre: 'Ana' },
    { torneo: 'C', puesto: '1', nombre: 'Ana' },
  ];
  const lista = listaJugadores(resultados, []);
  assert.equal(lista[0].tops, 3);
  assert.equal(lista[0].campeonatos, 2);
});

test('listaJugadores: ordena alfabéticamente', () => {
  const ranking = [{ Jugador: 'Zoe' }, { Jugador: 'Ana' }, { Jugador: 'Bruno' }];
  const lista = listaJugadores([], ranking);
  assert.deepEqual(lista.map((j) => j.nombre), ['Ana', 'Bruno', 'Zoe']);
});

test('listaJugadores: filas sin nombre se ignoran, entradas vacías no rompen', () => {
  assert.deepEqual(listaJugadores([], []), []);
  assert.deepEqual(listaJugadores(undefined, undefined), []);
  const lista = listaJugadores([{ nombre: '', puesto: '1' }], [{ Jugador: '' }]);
  assert.deepEqual(lista, []);
});

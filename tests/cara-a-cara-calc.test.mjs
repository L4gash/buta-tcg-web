import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caraACara } from '../js/cara-a-cara-calc.js';

// Ana: puestos 1,3,5 (T1,T2,T3). Beto: puestos 2,4 (T1,T2).
const RES = [
  { torneo: 'T1', puesto: '1', nombre: 'Ana' },
  { torneo: 'T1', puesto: '2', nombre: 'Beto' },
  { torneo: 'T2', puesto: '3', nombre: 'ana' },  // misma persona (normaliza)
  { torneo: 'T2', puesto: '4', nombre: 'Beto' },
  { torneo: 'T3', puesto: '5', nombre: 'Ana' },
];
const RANK = [
  { Pos: '1', Jugador: 'Ana', 'PL Totales': '50' },
  { Pos: '3', Jugador: 'Beto', 'PL Totales': '40' },
];

test('stats por jugador', () => {
  const { a, b } = caraACara(RES, RANK, 'Ana', 'Beto');
  assert.deepEqual(
    { c: a.campeonatos, t: a.top8, p: a.podios, mp: a.mejorPuesto, prom: a.promedio, pos: a.pos, pl: a.pl },
    { c: 1, t: 3, p: 2, mp: 1, prom: 3, pos: 1, pl: '50' });
  assert.deepEqual(
    { c: b.campeonatos, t: b.top8, p: b.podios, mp: b.mejorPuesto, prom: b.promedio, pos: b.pos, pl: b.pl },
    { c: 0, t: 2, p: 1, mp: 2, prom: 3, pos: 3, pl: '40' });
});

test('coincidencias: total, aArriba/bArriba y lista reciente-primero', () => {
  const { coincidencias: c } = caraACara(RES, RANK, 'Ana', 'Beto');
  assert.equal(c.total, 2);          // T1 y T2
  assert.equal(c.aArriba, 2);        // Ana quedó arriba en ambos (1<2, 3<4)
  assert.equal(c.bArriba, 0);
  assert.deepEqual(c.torneos.map((x) => x.torneo), ['T2', 'T1']); // reciente primero
  assert.deepEqual(c.torneos[0], { torneo: 'T2', puestoA: 3, puestoB: 4 });
});

test('jugador inexistente => stats vacías', () => {
  const { a, coincidencias } = caraACara(RES, RANK, 'Nadie', 'Beto');
  assert.deepEqual(
    { c: a.campeonatos, t: a.top8, mp: a.mejorPuesto, prom: a.promedio, pos: a.pos, pl: a.pl },
    { c: 0, t: 0, mp: null, prom: null, pos: null, pl: null });
  assert.equal(coincidencias.total, 0);
});

test('sin coincidencias => total 0', () => {
  const res = [
    { torneo: 'T1', puesto: '1', nombre: 'Ana' },
    { torneo: 'T2', puesto: '1', nombre: 'Beto' },
  ];
  const { coincidencias } = caraACara(res, [], 'Ana', 'Beto');
  assert.equal(coincidencias.total, 0);
  assert.deepEqual(coincidencias.torneos, []);
});

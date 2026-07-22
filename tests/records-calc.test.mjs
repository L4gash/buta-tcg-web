import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRecords } from '../js/records-calc.js';

const ROWS = [
  // Ana: 3 tops, 2 campeonatos, 3 podios, puestos 1,2,1
  { torneo: 'T1', puesto: '1', nombre: 'Ana' },
  { torneo: 'T2', puesto: '2', nombre: 'ana' },       // misma persona (normaliza)
  { torneo: 'T3', puesto: '1', nombre: 'Ana' },
  // Beto: 2 tops, 1 campeonato, 1 podio, puestos 1,5
  { torneo: 'T1', puesto: '5', nombre: 'Beto' },
  { torneo: 'T2', puesto: '1', nombre: 'Beto' },
  // Caro: 1 top, 0 campeonatos, 0 podios, puesto 8
  { torneo: 'T3', puesto: '8', nombre: 'Caro' },
  { torneo: 'T1', puesto: '', nombre: '' },           // fila basura: se ignora
];

test('campeonatos: cuenta puesto 1 y ordena desc', () => {
  const r = calcularRecords(ROWS);
  assert.deepEqual(r.campeonatos, [
    { nombre: 'Ana', valor: 2 },
    { nombre: 'Beto', valor: 1 },
  ]);
});

test('top8: cuenta apariciones', () => {
  const r = calcularRecords(ROWS);
  assert.deepEqual(r.top8.map((x) => [x.nombre, x.valor]), [['Ana', 3], ['Beto', 2], ['Caro', 1]]);
});

test('podios: cuenta puesto <= 3', () => {
  const r = calcularRecords(ROWS);
  assert.deepEqual(r.podios.map((x) => [x.nombre, x.valor]), [['Ana', 3], ['Beto', 1]]);
});

test('mejorPromedio: filtra por mínimo de tops', () => {
  // Con mínimo 5, nadie califica (todos tienen < 5 tops).
  assert.deepEqual(calcularRecords(ROWS).mejorPromedio, []);
  // Con mínimo 2: Ana (prom (1+2+1)/3 = 1.3) mejor que Beto ((1+5)/2 = 3.0).
  const r2 = calcularRecords(ROWS, { minPromedio: 2 });
  assert.deepEqual(r2.mejorPromedio, [
    { nombre: 'Ana', valor: 1.3 },
    { nombre: 'Beto', valor: 3 },
  ]);
});

test('top 3 como máximo y nombre canónico = variante más frecuente', () => {
  const rows = [
    { torneo: 'A', puesto: '1', nombre: 'Juanny Gordillo' },
    { torneo: 'B', puesto: '1', nombre: 'Juanny Gordillo' },
    { torneo: 'C', puesto: '1', nombre: 'juanny gordillo' },
    { torneo: 'A', puesto: '1', nombre: 'Beto' },
    { torneo: 'B', puesto: '1', nombre: 'Caro' },
    { torneo: 'C', puesto: '1', nombre: 'Dani' },
  ];
  const r = calcularRecords(rows);
  assert.equal(r.campeonatos.length, 3);            // no más de 3
  assert.equal(r.campeonatos[0].nombre, 'Juanny Gordillo'); // variante más frecuente
});

test('sin datos => arrays vacíos', () => {
  const r = calcularRecords([]);
  assert.deepEqual(r, { campeonatos: [], top8: [], podios: [], mejorPromedio: [] });
});

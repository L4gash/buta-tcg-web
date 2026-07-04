import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreDesdeParams, historialDe, estadisticasDe } from '../js/historial.js';

test('nombreDesdeParams: lee y decodifica el parámetro', () => {
  assert.equal(nombreDesdeParams('?nombre=Juanny%20Gordillo'), 'Juanny Gordillo');
  assert.equal(nombreDesdeParams('?nombre=+Ram%C3%B3n+'), 'Ramón');
  assert.equal(nombreDesdeParams(''), '');
  assert.equal(nombreDesdeParams('?otra=x'), '');
});

const GRUPOS = {
  'Fecha 1': [
    { torneo: 'Fecha 1', puesto: '1', nombre: 'Juanny Gordillo', deck: 'Maliss' },
    { torneo: 'Fecha 1', puesto: '2', nombre: 'Alex Herrera', deck: 'Branded' },
  ],
  'Fecha 2': [
    { torneo: 'Fecha 2', puesto: '5', nombre: 'juanny gordillo', deck: 'Kewl Tune' },
  ],
  'Fecha 3': [
    { torneo: 'Fecha 3', puesto: '3', nombre: 'Alex Herrera', deck: 'Branded' },
  ],
};

test('historialDe: junta las participaciones del jugador (ignora mayúsculas/tildes)', () => {
  const h = historialDe('Juanny Gordillo', GRUPOS);
  assert.equal(h.length, 2);
  assert.deepEqual(h[0], { torneo: 'Fecha 1', puesto: '1', deck: 'Maliss' });
  assert.deepEqual(h[1], { torneo: 'Fecha 2', puesto: '5', deck: 'Kewl Tune' });
});

test('historialDe: jugador desconocido => vacío', () => {
  assert.deepEqual(historialDe('Nadie', GRUPOS), []);
  assert.deepEqual(historialDe('', GRUPOS), []);
});

test('estadisticasDe: cuenta fechas, campeonatos, podios, mejor puesto y promedio', () => {
  const stats = estadisticasDe([
    { torneo: 'A', puesto: '1', deck: '' },
    { torneo: 'B', puesto: '5', deck: '' },
    { torneo: 'C', puesto: '3', deck: '' },
  ]);
  assert.deepEqual(stats, { fechas: 3, campeonatos: 1, podios: 2, mejorPuesto: 1, promedioPuesto: 3 });
});

test('estadisticasDe: el promedio no redondea (queda con decimales)', () => {
  const stats = estadisticasDe([
    { torneo: 'A', puesto: '1', deck: '' },
    { torneo: 'B', puesto: '2', deck: '' },
  ]);
  assert.equal(stats.promedioPuesto, 1.5);
});

test('estadisticasDe: historial vacío', () => {
  assert.deepEqual(estadisticasDe([]), { fechas: 0, campeonatos: 0, podios: 0, mejorPuesto: null, promedioPuesto: null });
});

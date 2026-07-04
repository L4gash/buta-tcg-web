import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraerFechaCorta } from '../js/fecha-torneo.js';

test('extraerFechaCorta: dd/mm y año presentes', () => {
  assert.deepEqual(extraerFechaCorta('Buta Córdoba 27/06 Avanzado 2026'), { corta: '27/06', anio: '2026' });
  assert.deepEqual(extraerFechaCorta('YACS Córdoba 06/12 2025'), { corta: '06/12', anio: '2025' });
});

test('extraerFechaCorta: día o mes de un dígito se completa con cero', () => {
  assert.deepEqual(extraerFechaCorta('Buta Córdoba 6/6 Avanzado 2026'), { corta: '06/06', anio: '2026' });
});

test('extraerFechaCorta: sin año en el nombre', () => {
  assert.deepEqual(extraerFechaCorta('Torneo 15/03'), { corta: '15/03', anio: '' });
});

test('extraerFechaCorta: sin fecha reconocible => guion', () => {
  assert.deepEqual(extraerFechaCorta('Torneo especial'), { corta: '—', anio: '' });
  assert.deepEqual(extraerFechaCorta(''), { corta: '—', anio: '' });
  assert.deepEqual(extraerFechaCorta(undefined), { corta: '—', anio: '' });
});

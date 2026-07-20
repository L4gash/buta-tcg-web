import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonaDe, CORTE_CLASIFICA, CORTE_REPECHAJE } from '../js/ranking-zonas.js';

test('zonaDe: constantes de corte de la liga', () => {
  assert.equal(CORTE_CLASIFICA, 8);
  assert.equal(CORTE_REPECHAJE, 16);
});

test('zonaDe: puestos 1 a 8 clasifican al torneo de campeones', () => {
  for (let pos = 1; pos <= 8; pos++) assert.equal(zonaDe(pos), 'clasifica', `puesto ${pos}`);
});

test('zonaDe: puestos 9 a 16 quedan en repechaje', () => {
  for (let pos = 9; pos <= 16; pos++) assert.equal(zonaDe(pos), 'repechaje', `puesto ${pos}`);
});

test('zonaDe: puesto 17 en adelante, sin zona', () => {
  assert.equal(zonaDe(17), null);
  assert.equal(zonaDe(44), null);
});

test('zonaDe: entradas inválidas no rompen (sin zona)', () => {
  assert.equal(zonaDe(0), null);
  assert.equal(zonaDe(-1), null);
  assert.equal(zonaDe(NaN), null);
  assert.equal(zonaDe(undefined), null);
});

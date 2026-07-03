import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarNombre, coincideJugador, filtrarPorNombre } from '../js/buscar.js';

test('normalizarNombre: minúsculas, sin tildes, sin espacios sobrantes', () => {
  assert.equal(normalizarNombre('  Juanny GORDILLO '), 'juanny gordillo');
  assert.equal(normalizarNombre('Ramón Pérez'), 'ramon perez');
  assert.equal(normalizarNombre(null), '');
});

test('coincideJugador: compara ignorando mayúsculas y tildes', () => {
  assert.ok(coincideJugador('Juanny Gordillo', 'juanny gordillo'));
  assert.ok(coincideJugador('Ramón', 'RAMON'));
  assert.ok(!coincideJugador('Juanny', 'Juan'));
  assert.ok(!coincideJugador('', ''));
  assert.ok(!coincideJugador(null, null));
});

const FILAS = [
  { Jugador: 'Juanny Gordillo' },
  { Jugador: 'Alex Herrera' },
  { Jugador: 'Mariano Castro' },
];

test('filtrarPorNombre: busca por subcadena normalizada', () => {
  assert.equal(filtrarPorNombre(FILAS, 'gordi').length, 1);
  assert.equal(filtrarPorNombre(FILAS, 'GORDI')[0].Jugador, 'Juanny Gordillo');
  assert.equal(filtrarPorNombre(FILAS, 'zzz').length, 0);
});

test('filtrarPorNombre: consulta vacía devuelve todas las filas', () => {
  assert.equal(filtrarPorNombre(FILAS, '').length, 3);
  assert.equal(filtrarPorNombre(FILAS, '   ').length, 3);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierDeRating, winRate, construirLeaderboard } from '../js/omega-calc.js';

test('tierDeRating: cada borde de la escalera', () => {
  const nombre = (r) => tierDeRating(r).nombre;
  assert.equal(nombre(49), 'Iron');
  assert.equal(nombre(50), 'Bronze');
  assert.equal(nombre(199), 'Bronze');
  assert.equal(nombre(200), 'Silver');
  assert.equal(nombre(350), 'Gold');
  assert.equal(nombre(600), 'Platinum');
  assert.equal(nombre(999), 'Platinum');
  assert.equal(nombre(1000), 'Diamond');
  assert.equal(nombre(1450), 'Master');
  assert.equal(nombre(2000), 'Omega');
  assert.match(tierDeRating(1200).clase, /\S/); // trae una clase de color no vacía
  // Nunca devuelve undefined: cualquier rating cae en algún tier (incl. 0 y negativos).
  assert.equal(nombre(0), 'Iron');
  assert.equal(nombre(-50), 'Iron');
});

test('winRate: porcentaje con 1 decimal, null si no jugó', () => {
  assert.equal(winRate(90, 74), 54.9);
  assert.equal(winRate(1, 0), 100);
  assert.equal(winRate(0, 0), null);
  assert.equal(winRate('3', '1'), 75); // tolera strings del CSV
});

test('construirLeaderboard: filtra, ordena por rating y numera', () => {
  const rows = [
    { id: '1', nombre: 'A', nombre_buta: 'Ana Liga', rating: '1233', wins: '90', loses: '74', draws: '0', estado: 'ok' },
    { id: '2', nombre: 'B', nombre_buta: '', rating: '1620', wins: '210', loses: '120', draws: '2', estado: 'ok' },
    { id: '3', nombre: 'Pendiente', rating: '', wins: '', loses: '', draws: '', estado: 'link inválido' }, // se descarta
  ];
  const lb = construirLeaderboard(rows);
  assert.equal(lb.length, 2);
  assert.deepEqual(lb.map((p) => p.nombre), ['B', 'A']);        // 1620 antes que 1233
  assert.deepEqual(lb.map((p) => p.puesto), [1, 2]);
  assert.equal(lb[1].matches, 90 + 74 + 0);                     // wins+loses+draws
  assert.equal(lb[1].winRate, 54.9);
  assert.equal(lb[1].tier.nombre, 'Diamond');
  assert.equal(lb[0].tier.nombre, 'Master');
  assert.equal(lb[1].nombreButa, 'Ana Liga');                   // se preserva
  assert.equal(lb[0].nombreButa, '');
});

test('construirLeaderboard: descarta estado "ok" con rating en blanco (fila sin refrescar aún)', () => {
  const rows = [
    { id: '1', nombre: 'Cargado', rating: '900', wins: '10', loses: '5', draws: '0', estado: 'ok' },
    { id: '2', nombre: 'SinRating', rating: '', wins: '', loses: '', draws: '', estado: 'ok' }, // se descarta
    { id: '3', nombre: 'EspaciosRating', rating: '   ', estado: 'ok' },                          // se descarta
  ];
  const lb = construirLeaderboard(rows);
  assert.deepEqual(lb.map((p) => p.nombre), ['Cargado']);
});

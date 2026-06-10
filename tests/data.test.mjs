import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickProximo, groupResultados, FALLBACK_TORNEOS, FALLBACK_RESULTADOS, esc } from '../js/data.js';

test('pickProximo returns first torneo with estado proximo, else null', () => {
  assert.equal(pickProximo([{ estado: 'finalizado' }]), null);
  const t = [{ nombre: 'A', estado: 'finalizado' }, { nombre: 'B', estado: 'proximo' }];
  assert.equal(pickProximo(t).nombre, 'B');
  assert.equal(pickProximo([]), null);
});

test('groupResultados groups by torneo and sorts by puesto numerically', () => {
  const rows = [
    { torneo: 'YACS', puesto: '10', nombre: 'X' },
    { torneo: 'YACS', puesto: '2', nombre: 'Y' },
    { torneo: 'Otro', puesto: '1', nombre: 'Z' },
  ];
  const g = groupResultados(rows);
  assert.deepEqual(Object.keys(g), ['YACS', 'Otro']);
  assert.deepEqual(g.YACS.map((r) => r.puesto), ['2', '10']);
});

test('fallback data: YACS tournament and 8 results present', () => {
  assert.equal(FALLBACK_TORNEOS[0].nombre, 'YACS Córdoba');
  assert.equal(FALLBACK_RESULTADOS.length, 8);
  assert.equal(FALLBACK_RESULTADOS[0].nombre, 'Mariano Castro');
});

test('esc neutraliza HTML y atributos', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(esc('a"b&c'), 'a&quot;b&amp;c');
  assert.equal(esc(null), '');
});

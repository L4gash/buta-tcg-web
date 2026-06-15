import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickProximos, groupResultados, FALLBACK_TORNEOS, FALLBACK_RESULTADOS, esc, tieneFoto, deckVisible } from '../js/data.js';

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

test('pickProximos returns all torneos with estado proximo, in sheet order', () => {
  const t = [
    { nombre: 'A', estado: 'finalizado' },
    { nombre: 'B', estado: 'proximo' },
    { nombre: 'C', estado: 'Próximo ' },
    { nombre: 'D', estado: 'proximo' },
  ];
  assert.deepEqual(pickProximos(t).map((x) => x.nombre), ['B', 'C', 'D']);
  assert.deepEqual(pickProximos([{ estado: 'finalizado' }]), []);
  assert.deepEqual(pickProximos([]), []);
});

test('fallback torneo has alias field', () => {
  assert.equal('alias' in FALLBACK_TORNEOS[0], true);
});

test('tieneFoto: true solo con valor no vacío tras trim', () => {
  assert.equal(tieneFoto({ foto: 'mariano.jpg' }), true);
  assert.equal(tieneFoto({ foto: '  x.jpg ' }), true);
  assert.equal(tieneFoto({ foto: '' }), false);
  assert.equal(tieneFoto({ foto: '   ' }), false);
  assert.equal(tieneFoto({}), false);
});

test('deckVisible: true salvo vacío o guion', () => {
  assert.equal(deckVisible('Snake-Eye'), true);
  assert.equal(deckVisible('  Branded '), true);
  assert.equal(deckVisible(''), false);
  assert.equal(deckVisible('   '), false);
  assert.equal(deckVisible('—'), false);
  assert.equal(deckVisible(' — '), false);
  assert.equal(deckVisible(undefined), false);
  assert.equal(deckVisible(null), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerInscripciones } from '../js/perfil.js';

test('leerInscripciones: null/basura => objeto vacío', () => {
  assert.deepEqual(leerInscripciones(null), {});
  assert.deepEqual(leerInscripciones(''), {});
  assert.deepEqual(leerInscripciones('no es json'), {});
  assert.deepEqual(leerInscripciones('[1,2]'), {});
  assert.deepEqual(leerInscripciones('"texto"'), {});
});

test('leerInscripciones: objeto válido pasa tal cual', () => {
  const raw = JSON.stringify({ 'Buta Córdoba 04/07': true });
  assert.deepEqual(leerInscripciones(raw), { 'Buta Córdoba 04/07': true });
});

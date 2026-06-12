import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarImagen, MAX_LADO, CALIDAD, MAX_CRUDO_BYTES } from '../js/imagen.js';

test('validarImagen: vacío es válido (opcional)', () => {
  assert.deepEqual(validarImagen(null), { ok: true, vacio: true });
  assert.deepEqual(validarImagen(undefined), { ok: true, vacio: true });
});

test('validarImagen: acepta imágenes, rechaza otros tipos', () => {
  assert.equal(validarImagen({ type: 'image/jpeg', size: 1000 }).ok, true);
  assert.equal(validarImagen({ type: 'image/png', size: 1000 }).ok, true);
  assert.equal(validarImagen({ type: 'image/webp', size: 1000 }).ok, true);
  assert.equal(validarImagen({ type: 'application/pdf', size: 1000 }).motivo, 'tipo');
  assert.equal(validarImagen({ type: '', size: 1000 }).motivo, 'tipo');
});

test('validarImagen: rechaza archivos crudos enormes', () => {
  assert.equal(validarImagen({ type: 'image/jpeg', size: MAX_CRUDO_BYTES + 1 }).motivo, 'tamano');
  assert.equal(validarImagen({ type: 'image/jpeg', size: MAX_CRUDO_BYTES }).ok, true);
});

test('constantes de compresión razonables', () => {
  assert.ok(MAX_LADO >= 800 && MAX_LADO <= 2000);
  assert.ok(CALIDAD > 0 && CALIDAD <= 1);
  assert.ok(MAX_CRUDO_BYTES >= 1024 * 1024);
});

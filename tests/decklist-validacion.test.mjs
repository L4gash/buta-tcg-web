import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarArchivoDecklist, MAX_PDF_BYTES } from '../js/decklist-validacion.js';

const archivo = (type, size) => ({ type, size });

test('validarArchivoDecklist: requiere archivo (a diferencia del comprobante, acá no es opcional)', () => {
  assert.deepEqual(validarArchivoDecklist(null), { ok: false, motivo: 'requerido' });
  assert.deepEqual(validarArchivoDecklist(undefined), { ok: false, motivo: 'requerido' });
});

test('validarArchivoDecklist: acepta imagen jpg/png/webp dentro del tamaño', () => {
  assert.deepEqual(validarArchivoDecklist(archivo('image/jpeg', 1000)), { ok: true, tipo: 'imagen' });
  assert.deepEqual(validarArchivoDecklist(archivo('image/png', 1000)), { ok: true, tipo: 'imagen' });
  assert.deepEqual(validarArchivoDecklist(archivo('image/webp', 1000)), { ok: true, tipo: 'imagen' });
});

test('validarArchivoDecklist: acepta PDF dentro del tamaño', () => {
  assert.deepEqual(validarArchivoDecklist(archivo('application/pdf', 1000)), { ok: true, tipo: 'pdf' });
});

test('validarArchivoDecklist: PDF sin comprimir tiene un tope propio de tamaño', () => {
  const limite = archivo('application/pdf', MAX_PDF_BYTES);
  const pasado = archivo('application/pdf', MAX_PDF_BYTES + 1);
  assert.equal(validarArchivoDecklist(limite).ok, true);
  assert.deepEqual(validarArchivoDecklist(pasado), { ok: false, motivo: 'tamano' });
});

test('validarArchivoDecklist: rechaza tipo no soportado', () => {
  assert.deepEqual(validarArchivoDecklist(archivo('text/plain', 100)), { ok: false, motivo: 'tipo' });
  assert.deepEqual(validarArchivoDecklist(archivo('video/mp4', 100)), { ok: false, motivo: 'tipo' });
});

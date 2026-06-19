import { test } from 'node:test';
import assert from 'node:assert/strict';

// Función pura a extraer de inscripcion.js — la importamos para testearla.
// leerPerfilGuardado(raw) recibe el string crudo de localStorage.getItem('buta_jugador')
// y devuelve { nombre, konami_id } o null si el valor es inválido/ausente.
import { leerPerfilGuardado } from '../js/inscripcion.js';

test('null cuando el storage está vacío', () => {
  assert.equal(leerPerfilGuardado(null), null);
});

test('null cuando el JSON es inválido', () => {
  assert.equal(leerPerfilGuardado('no-json'), null);
});

test('null cuando faltan ambos campos', () => {
  assert.equal(leerPerfilGuardado(JSON.stringify({})), null);
});

test('devuelve objeto con nombre y konami_id válidos', () => {
  const raw = JSON.stringify({ nombre: 'Juan Pérez', konami_id: '0123456789' });
  assert.deepEqual(leerPerfilGuardado(raw), { nombre: 'Juan Pérez', konami_id: '0123456789' });
});

test('devuelve objeto aunque falte konami_id (pre-llenado parcial)', () => {
  const raw = JSON.stringify({ nombre: 'Juan Pérez' });
  assert.deepEqual(leerPerfilGuardado(raw), { nombre: 'Juan Pérez', konami_id: '' });
});

test('devuelve objeto aunque falte nombre (pre-llenado parcial)', () => {
  const raw = JSON.stringify({ konami_id: '0123456789' });
  assert.deepEqual(leerPerfilGuardado(raw), { nombre: '', konami_id: '0123456789' });
});

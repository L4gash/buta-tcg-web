import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarNombre, validarKonamiId, validarComentario } from '../js/validation.js';

test('nombre: requires at least 3 chars after trim', () => {
  assert.equal(validarNombre('  Juan Pérez  '), true);
  assert.equal(validarNombre('Jo'), false);
  assert.equal(validarNombre('   '), false);
  assert.equal(validarNombre(''), false);
});

test('konami id: exactly 10 digits', () => {
  assert.equal(validarKonamiId('0123456789'), true);
  assert.equal(validarKonamiId(' 0123456789 '), true); // tolerates padding
  assert.equal(validarKonamiId('123456789'), false);   // 9 digits
  assert.equal(validarKonamiId('12345678901'), false); // 11 digits
  assert.equal(validarKonamiId('12345abcde'), false);
  assert.equal(validarKonamiId(''), false);
});

test('comentario: opcional, máx 100 tras trim', () => {
  assert.equal(validarComentario(''), true);
  assert.equal(validarComentario(undefined), true);
  assert.equal(validarComentario(null), true);
  assert.equal(validarComentario('ya transferí'), true);
  assert.equal(validarComentario('x'.repeat(100)), true);
  assert.equal(validarComentario('x'.repeat(101)), false);
  assert.equal(validarComentario('  ' + 'x'.repeat(100) + '  '), true); // trim antes de contar
});

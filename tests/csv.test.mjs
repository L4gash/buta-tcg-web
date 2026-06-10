import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../js/csv.js';

test('parses header + rows into objects', () => {
  const rows = parseCsv('nombre,puesto\nMariano Castro,1\nJuan Gordillo,2');
  assert.deepEqual(rows, [
    { nombre: 'Mariano Castro', puesto: '1' },
    { nombre: 'Juan Gordillo', puesto: '2' },
  ]);
});

test('handles quoted fields with commas and escaped quotes', () => {
  const rows = parseCsv('lugar,nota\n"Cinerama, Córdoba","dijo ""topeé"" ayer"');
  assert.deepEqual(rows, [{ lugar: 'Cinerama, Córdoba', nota: 'dijo "topeé" ayer' }]);
});

test('handles CRLF and skips blank trailing lines', () => {
  const rows = parseCsv('a,b\r\n1,2\r\n\r\n');
  assert.deepEqual(rows, [{ a: '1', b: '2' }]);
});

test('handles newlines inside quoted fields', () => {
  const rows = parseCsv('a,b\n"línea 1\nlínea 2",x');
  assert.deepEqual(rows, [{ a: 'línea 1\nlínea 2', b: 'x' }]);
});

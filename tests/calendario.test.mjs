import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etiquetaCuentaRegresiva, urlGoogleCalendar } from '../js/calendario.js';

const AHORA = new Date(2026, 6, 1, 12, 0); // 1 de julio 2026, mediodía

test('cuenta regresiva: torneo en el futuro', () => {
  assert.equal(etiquetaCuentaRegresiva('2026-07-04', AHORA), 'Faltan 3 días');
});

test('cuenta regresiva: mañana y hoy', () => {
  assert.equal(etiquetaCuentaRegresiva('2026-07-02', AHORA), '¡Es mañana!');
  assert.equal(etiquetaCuentaRegresiva('2026-07-01', AHORA), '¡Es hoy!');
});

test('cuenta regresiva: pasado o fecha inválida => vacío', () => {
  assert.equal(etiquetaCuentaRegresiva('2026-06-28', AHORA), '');
  assert.equal(etiquetaCuentaRegresiva('', AHORA), '');
  assert.equal(etiquetaCuentaRegresiva(undefined, AHORA), '');
});

test('urlGoogleCalendar: arma el link con fecha, hora y lugar', () => {
  const url = urlGoogleCalendar({
    nombre: 'Buta Córdoba 04/07', fecha: '2026-07-04', hora: '16:00',
    lugar: 'Córdoba, Argentina', formato: 'Avanzado TCG · Suizo',
  });
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
  assert.ok(url.includes('20260704T160000%2F20260704T220000'), 'evento de 6 horas'); // dates= va URL-encodeado
  // URLSearchParams codifica espacios como '+'
  assert.ok(url.includes('text=Buta+C%C3%B3rdoba+04%2F07'));
  assert.ok(url.includes('location=C%C3%B3rdoba%2C+Argentina'));
  assert.ok(url.includes('America%2FArgentina%2FCordoba'));
});

test('urlGoogleCalendar: sin hora válida cae a evento de día completo', () => {
  const url = urlGoogleCalendar({ nombre: 'Torneo', fecha: '2026-07-04', hora: 'a confirmar', lugar: '' });
  assert.ok(url.includes('20260704%2F20260705'), 'día completo: fecha/fecha+1');
});

test('urlGoogleCalendar: fecha inválida => null', () => {
  assert.equal(urlGoogleCalendar({ nombre: 'X', fecha: '', hora: '16:00' }), null);
});

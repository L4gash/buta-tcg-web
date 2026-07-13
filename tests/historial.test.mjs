import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreDesdeParams, historialDe, estadisticasDe, historialPorTemporada, deckFavorito } from '../js/historial.js';

test('nombreDesdeParams: lee y decodifica el parámetro', () => {
  assert.equal(nombreDesdeParams('?nombre=Juanny%20Gordillo'), 'Juanny Gordillo');
  assert.equal(nombreDesdeParams('?nombre=+Ram%C3%B3n+'), 'Ramón');
  assert.equal(nombreDesdeParams(''), '');
  assert.equal(nombreDesdeParams('?otra=x'), '');
});

const GRUPOS = {
  'Fecha 1': [
    { torneo: 'Fecha 1', puesto: '1', nombre: 'Juanny Gordillo', deck: 'Maliss' },
    { torneo: 'Fecha 1', puesto: '2', nombre: 'Alex Herrera', deck: 'Branded' },
  ],
  'Fecha 2': [
    { torneo: 'Fecha 2', puesto: '5', nombre: 'juanny gordillo', deck: 'Kewl Tune' },
  ],
  'Fecha 3': [
    { torneo: 'Fecha 3', puesto: '3', nombre: 'Alex Herrera', deck: 'Branded' },
  ],
};

test('historialDe: junta las participaciones del jugador (ignora mayúsculas/tildes)', () => {
  const h = historialDe('Juanny Gordillo', GRUPOS);
  assert.equal(h.length, 2);
  assert.deepEqual(h[0], { torneo: 'Fecha 1', puesto: '1', deck: 'Maliss' });
  assert.deepEqual(h[1], { torneo: 'Fecha 2', puesto: '5', deck: 'Kewl Tune' });
});

test('historialDe: jugador desconocido => vacío', () => {
  assert.deepEqual(historialDe('Nadie', GRUPOS), []);
  assert.deepEqual(historialDe('', GRUPOS), []);
});

test('estadisticasDe: cuenta fechas, campeonatos, podios, mejor puesto y promedio', () => {
  const stats = estadisticasDe([
    { torneo: 'A', puesto: '1', deck: '' },
    { torneo: 'B', puesto: '5', deck: '' },
    { torneo: 'C', puesto: '3', deck: '' },
  ]);
  assert.deepEqual(stats, { fechas: 3, campeonatos: 1, podios: 2, mejorPuesto: 1, promedioPuesto: 3 });
});

test('estadisticasDe: el promedio no redondea (queda con decimales)', () => {
  const stats = estadisticasDe([
    { torneo: 'A', puesto: '1', deck: '' },
    { torneo: 'B', puesto: '2', deck: '' },
  ]);
  assert.equal(stats.promedioPuesto, 1.5);
});

test('estadisticasDe: historial vacío', () => {
  assert.deepEqual(estadisticasDe([]), { fechas: 0, campeonatos: 0, podios: 0, mejorPuesto: null, promedioPuesto: null });
});

const FILAS_TEMPORADAS = [
  { torneo: 'Vieja 1', puesto: '1', nombre: 'Ana', deck: 'Maliss' },                            // sin columna => Temporada 1
  { torneo: 'Vieja 2', puesto: '3', nombre: 'Ana', deck: 'Maliss', temporada: 'Temporada 1' },
  { torneo: 'Nueva 1', puesto: '2', nombre: 'Ana', deck: 'Branded', temporada: 'Temporada 2' },
  { torneo: 'Nueva 2', puesto: '1', nombre: 'Bruno', deck: 'RDA', temporada: 'Temporada 2' },
];

test('historialPorTemporada: segmenta y solo devuelve temporadas donde el jugador jugó', () => {
  const segmentos = historialPorTemporada('Ana', FILAS_TEMPORADAS);
  assert.deepEqual(segmentos.map((s) => s.temporada), ['Temporada 1', 'Temporada 2']);
  assert.deepEqual(segmentos[0].items.map((h) => h.torneo), ['Vieja 1', 'Vieja 2']);
  assert.deepEqual(segmentos[1].items.map((h) => h.torneo), ['Nueva 1']);
  // Bruno solo jugó la Temporada 2
  assert.deepEqual(historialPorTemporada('Bruno', FILAS_TEMPORADAS).map((s) => s.temporada), ['Temporada 2']);
  assert.deepEqual(historialPorTemporada('Nadie', FILAS_TEMPORADAS), []);
});

test('deckFavorito: el deck con más tops del historial', () => {
  const historial = [
    { torneo: 'A', puesto: '1', deck: 'Maliss' },
    { torneo: 'B', puesto: '2', deck: 'Branded' },
    { torneo: 'C', puesto: '1', deck: 'Maliss' },
  ];
  assert.deepEqual(deckFavorito(historial), { deck: 'Maliss', veces: 2 });
});

test('deckFavorito: ignora decks vacíos o "—"; sin datos => null', () => {
  assert.equal(deckFavorito([{ torneo: 'A', puesto: '1', deck: '—' }, { torneo: 'B', puesto: '2', deck: '' }]), null);
  assert.equal(deckFavorito([]), null);
});

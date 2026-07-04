import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navHtml, footerHtml, paginaActiva, PAGINAS } from '../js/layout.js';

test('PAGINAS incluye las 5 páginas del sitio', () => {
  assert.deepEqual(PAGINAS.map((p) => p.archivo), [
    'index.html', 'torneos.html', 'resultados.html', 'ranking.html', 'nosotros.html',
  ]);
});

test('paginaActiva: resuelve el archivo desde el pathname', () => {
  assert.equal(paginaActiva('/torneos.html'), 'torneos.html');
  assert.equal(paginaActiva('/buta-tcg-web/ranking.html'), 'ranking.html');
});

test('paginaActiva: jugador.html marca Ranking como sección activa', () => {
  assert.equal(paginaActiva('/jugador.html'), 'ranking.html');
  assert.equal(paginaActiva('/buta-tcg-web/jugador.html'), 'ranking.html');
});

test('paginaActiva: la raíz y rutas desconocidas mapean a index.html', () => {
  assert.equal(paginaActiva('/'), 'index.html');
  assert.equal(paginaActiva('/buta-tcg-web/'), 'index.html');
  assert.equal(paginaActiva('/algo-raro.html'), 'index.html');
});

test('navHtml: marca la página activa con aria-current', () => {
  const html = navHtml('ranking.html');
  assert.match(html, /href="ranking\.html"[^>]*aria-current="page"/);
  // Las demás no llevan aria-current
  assert.equal(html.match(/aria-current/g).length, 1);
});

test('navHtml: contiene los 5 links', () => {
  const html = navHtml('index.html');
  for (const p of PAGINAS) assert.ok(html.includes(`href="${p.archivo}"`), `falta link a ${p.archivo}`);
});

test('footerHtml: contiene Instagram y el aviso de Konami', () => {
  const html = footerHtml();
  assert.ok(html.includes('instagram.com/butatcg'));
  assert.ok(html.includes('Konami'));
});

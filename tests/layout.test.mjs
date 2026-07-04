import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navHtml, footerHtml, paginaActiva, flechaVolverHtml, PAGINAS } from '../js/layout.js';

test('PAGINAS incluye las 6 páginas del sitio', () => {
  assert.deepEqual(PAGINAS.map((p) => p.archivo), [
    'index.html', 'torneos.html', 'resultados.html', 'ranking.html', 'jugadores.html', 'nosotros.html',
  ]);
});

test('paginaActiva: resuelve el archivo desde el pathname', () => {
  assert.equal(paginaActiva('/torneos.html'), 'torneos.html');
  assert.equal(paginaActiva('/buta-tcg-web/ranking.html'), 'ranking.html');
});

test('paginaActiva: jugador.html marca Jugadores como sección activa', () => {
  assert.equal(paginaActiva('/jugador.html'), 'jugadores.html');
  assert.equal(paginaActiva('/buta-tcg-web/jugador.html'), 'jugadores.html');
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

test('navHtml: contiene los 6 links de página', () => {
  const html = navHtml('index.html');
  for (const p of PAGINAS) assert.ok(html.includes(`href="${p.archivo}"`), `falta link a ${p.archivo}`);
});

test('navHtml: link externo "Pedidos" apunta al sitio de pedidos y abre en pestaña nueva', () => {
  const html = navHtml('index.html');
  assert.match(html, /<a href="https:\/\/marianocbt\.github\.io\/butatcg\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>Pedidos<\/a>/);
});

test('navHtml: "Pedidos" nunca lleva aria-current (no es una página del sitio)', () => {
  const html = navHtml('ranking.html');
  const enlacePedidos = html.match(/<a href="https:\/\/marianocbt\.github\.io\/butatcg\/"[^>]*>Pedidos<\/a>/)[0];
  assert.ok(!enlacePedidos.includes('aria-current'));
});

test('navHtml: "Pedidos" queda entre Jugadores y Nosotros', () => {
  const html = navHtml('index.html');
  const posJugadores = html.indexOf('>Jugadores<');
  const posPedidos = html.indexOf('>Pedidos<');
  const posNosotros = html.indexOf('>Nosotros<');
  assert.ok(posJugadores < posPedidos && posPedidos < posNosotros);
});

test('navHtml: el orden final es Ranking, Jugadores, Pedidos, Nosotros', () => {
  const html = navHtml('index.html');
  const posRanking = html.indexOf('>Ranking<');
  const posJugadores = html.indexOf('>Jugadores<');
  const posPedidos = html.indexOf('>Pedidos<');
  const posNosotros = html.indexOf('>Nosotros<');
  assert.ok(posRanking < posJugadores && posJugadores < posPedidos && posPedidos < posNosotros);
});

test('flechaVolverHtml: vacía en index.html (ya está en el inicio)', () => {
  assert.equal(flechaVolverHtml('index.html'), '');
});

test('flechaVolverHtml: jugador.html vuelve a Jugadores, no a Inicio', () => {
  const html = flechaVolverHtml('jugador.html');
  assert.match(html, /href="jugadores\.html"/);
  assert.ok(html.includes('Jugadores'));
});

test('flechaVolverHtml: el resto de las páginas vuelve a Inicio', () => {
  for (const archivo of ['torneos.html', 'resultados.html', 'ranking.html', 'jugadores.html', 'nosotros.html']) {
    const html = flechaVolverHtml(archivo);
    assert.match(html, /href="index\.html"/, `${archivo} no vuelve a index.html`);
    assert.ok(html.includes('Inicio'), `${archivo} no dice "Inicio"`);
  }
});

test('footerHtml: contiene Instagram y el aviso de Konami', () => {
  const html = footerHtml();
  assert.ok(html.includes('instagram.com/butatcg'));
  assert.ok(html.includes('Konami'));
});

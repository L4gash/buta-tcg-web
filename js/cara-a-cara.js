import { loadResultados, loadRanking, esc } from './data.js';
import { listaJugadores } from './directorio-jugadores.js';
import { coincideJugador } from './buscar.js';
import { medallaOPuesto } from './historial.js';
import { caraACara } from './cara-a-cara-calc.js';

const $ = (id) => document.getElementById(id);

const [resultados, rankingRows] = await Promise.all([loadResultados(), loadRanking()]);
const jugadores = listaJugadores(resultados, rankingRows);
$('lista-jugadores').innerHTML = jugadores.map((j) => `<option value="${esc(j.nombre)}"></option>`).join('');

// Texto tipeado -> nombre canónico de la lista (o '' si no matchea a nadie).
const resolver = (texto) => (jugadores.find((j) => coincideJugador(j.nombre, texto))?.nombre ?? '');

// Fila comparativa. disp* = lo que se muestra; cmp* = número para decidir el mejor.
function filaStat(label, dispA, dispB, cmpA, cmpB, mejor) {
  const na = cmpA == null ? null : Number(cmpA);
  const nb = cmpB == null ? null : Number(cmpB);
  let ganaA = false;
  let ganaB = false;
  if (na != null && nb != null && na !== nb) {
    ganaA = mejor === 'mayor' ? na > nb : na < nb;
    ganaB = !ganaA;
  } else if (na != null && nb == null) ganaA = true;
  else if (nb != null && na == null) ganaB = true;
  const cel = (v, gana) => `<span class="font-display text-lg font-bold ${gana ? 'text-primario-glow' : 'text-white'}">${v == null ? '—' : esc(String(v))}</span>`;
  return `
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-borde px-4 py-2.5">
      <div class="text-right">${cel(dispA, ganaA)}</div>
      <div class="text-center font-body text-[0.7rem] uppercase tracking-wider text-humo">${label}</div>
      <div class="text-left">${cel(dispB, ganaB)}</div>
    </div>`;
}

function bloqueCoincidencias(a, b, c) {
  if (!c.total) return '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-6 text-center font-body text-humo shadow-card">Todavía no coincidieron en un top.</p>';
  const lista = c.torneos.map((t) => {
    const aArriba = t.puestoA < t.puestoB;
    return `
      <a href="resultados.html?torneo=${encodeURIComponent(t.torneo)}" class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-borde px-4 py-3 hover:bg-primario/5">
        <span class="font-display text-base font-bold ${aArriba ? 'text-primario-glow' : 'text-humo'}"><span class="sr-only">${esc(a.nombre)}: puesto ${t.puestoA}</span><span aria-hidden="true">${medallaOPuesto(t.puestoA)}</span></span>
        <span class="min-w-0 truncate text-center font-body text-sm text-white">${esc(t.torneo)}</span>
        <span class="text-right font-display text-base font-bold ${!aArriba ? 'text-primario-glow' : 'text-humo'}"><span class="sr-only">${esc(b.nombre)}: puesto ${t.puestoB}</span><span aria-hidden="true">${medallaOPuesto(t.puestoB)}</span></span>
      </a>`;
  }).join('');
  return `
    <div class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      <div class="px-4 py-4 text-center">
        <p class="font-body text-sm text-humo">Se cruzaron en <strong class="text-white">${c.total}</strong> ${c.total === 1 ? 'torneo' : 'torneos'}</p>
        <p class="mt-1 font-display text-lg font-bold italic text-white">${esc(a.nombre)} arriba <span class="text-primario-glow">${c.aArriba}</span> · ${esc(b.nombre)} arriba <span class="text-primario-glow">${c.bArriba}</span></p>
      </div>
      ${lista}
    </div>`;
}

function aviso(texto) {
  return `<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-10 text-center font-body text-humo shadow-card">${texto}</p>`;
}

function render() {
  const nA = resolver($('jugador-a').value);
  const nB = resolver($('jugador-b').value);
  const cont = $('comparacion');
  if (!nA || !nB) { cont.innerHTML = aviso('Elegí dos jugadores para compararlos.'); return; }
  if (coincideJugador(nA, nB)) { cont.innerHTML = aviso('Elegí dos jugadores distintos.'); return; }

  const { a, b, coincidencias } = caraACara(resultados, rankingRows, nA, nB);
  const prom = (v) => (v == null ? null : v.toFixed(1));
  cont.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-center">
      <a href="jugador.html?nombre=${encodeURIComponent(a.nombre)}" class="truncate font-display text-xl font-bold italic text-white hover:text-primario-glow">${esc(a.nombre)}</a>
      <a href="jugador.html?nombre=${encodeURIComponent(b.nombre)}" class="truncate font-display text-xl font-bold italic text-white hover:text-primario-glow">${esc(b.nombre)}</a>
    </div>
    <div class="mt-4 overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      ${filaStat('Campeonatos', a.campeonatos, b.campeonatos, a.campeonatos, b.campeonatos, 'mayor')}
      ${filaStat('Top 8', a.top8, b.top8, a.top8, b.top8, 'mayor')}
      ${filaStat('Podios', a.podios, b.podios, a.podios, b.podios, 'mayor')}
      ${filaStat('Mejor puesto', a.mejorPuesto, b.mejorPuesto, a.mejorPuesto, b.mejorPuesto, 'menor')}
      ${filaStat('Promedio', prom(a.promedio), prom(b.promedio), a.promedio, b.promedio, 'menor')}
      ${filaStat('Ranking', a.pos, b.pos, a.pos, b.pos, 'menor')}
      ${filaStat('Puntos de liga', a.pl, b.pl, a.pl, b.pl, 'mayor')}
    </div>
    <div class="mt-6">${bloqueCoincidencias(a, b, coincidencias)}</div>`;

  const url = new URL(location.href);
  url.searchParams.set('a', a.nombre);
  url.searchParams.set('b', b.nombre);
  history.replaceState(null, '', url);
}

// Precarga desde ?a=&b= (deja el texto crudo si no resuelve, para que se vea).
const params = new URLSearchParams(location.search);
if (params.get('a')) $('jugador-a').value = resolver(params.get('a')) || params.get('a');
if (params.get('b')) $('jugador-b').value = resolver(params.get('b')) || params.get('b');
$('jugador-a').addEventListener('input', render);
$('jugador-b').addEventListener('input', render);
render();

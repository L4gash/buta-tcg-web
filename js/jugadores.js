// Directorio de jugadores: todos los que jugaron alguna vez, con link al
// perfil de cada uno.
import { loadResultados, loadRanking, filtrarRanking, esc } from './data.js';
import { listaJugadores } from './directorio-jugadores.js';
import { coincideTexto } from './buscar.js';

const $ = (id) => document.getElementById(id);

function filaJugador(j) {
  const sub = [
    j.pos ? `#${j.pos} en ranking` : null,
    `${j.tops} ${j.tops === 1 ? 'top' : 'tops'}`,
    j.campeonatos ? `${j.campeonatos} 🏆` : null,
  ].filter(Boolean).join(' · ');
  return `
    <li>
      <a href="jugador.html?nombre=${encodeURIComponent(j.nombre)}" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-primario/10">
        <span class="min-w-0 truncate font-display font-bold italic text-white">${esc(j.nombre)}</span>
        <span class="shrink-0 font-body text-xs text-humo">${esc(sub)}</span>
      </a>
    </li>`;
}

function render(lista) {
  $('lista-jugadores').innerHTML = lista.length
    ? `<ul class="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">${lista.map(filaJugador).join('')}</ul>`
    : '<p class="text-center font-body text-humo">No encontramos ese nombre.</p>';
}

const [resultados, rankingRows] = await Promise.all([loadResultados(), loadRanking()]);
const todos = listaJugadores(resultados, filtrarRanking(rankingRows));

$('cantidad-jugadores').textContent = todos.length
  ? `${todos.length} ${todos.length === 1 ? 'jugador' : 'jugadores'}`
  : '';
render(todos);

$('buscar-jugadores').addEventListener('input', (e) => {
  render(todos.filter((j) => coincideTexto(j.nombre, e.target.value)));
});

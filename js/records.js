import { loadResultados, esc } from './data.js';
import { calcularRecords } from './records-calc.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = ['🥇', '🥈', '🥉'];
const fmt = (v) => (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : String(v));

function podio(items) {
  if (!items.length) return '<p class="border-t border-borde px-4 py-6 text-center font-body text-humo">Todavía no hay suficientes datos.</p>';
  return items.map((it, i) => `
    <div class="flex items-center gap-3 border-t border-borde px-4 py-3 ${i === 0 ? 'bg-gradient-to-r from-oro/10 to-transparent' : ''}">
      <span class="w-8 shrink-0 text-center font-display text-lg">${MEDALLAS[i]}</span>
      <a href="jugador.html?nombre=${encodeURIComponent(it.nombre)}" class="min-w-0 flex-1 truncate font-display font-bold italic text-white hover:text-primario-glow">${esc(it.nombre)}</a>
      <span class="shrink-0 font-display text-xl font-bold text-primario-glow">${esc(fmt(it.valor))}</span>
    </div>`).join('');
}

function bloque(emoji, titulo, items, sufijo = '') {
  return `
    <section class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      <h2 class="flex items-center gap-2 px-4 py-3 font-display text-lg font-bold italic text-white"><span aria-hidden="true">${emoji}</span>${titulo}${sufijo}</h2>
      ${podio(items)}
    </section>`;
}

const r = calcularRecords(await loadResultados());
$('records').innerHTML = `
  <div class="grid gap-5 md:grid-cols-2">
    ${bloque('🥇', 'Más campeonatos', r.campeonatos)}
    ${bloque('🎖️', 'Más Top 8', r.top8)}
    ${bloque('🏅', 'Más podios', r.podios)}
    ${bloque('📊', 'Mejor promedio', r.mejorPromedio, ' <span class="ml-1 font-body text-xs font-normal text-humo">(mín. 5 tops)</span>')}
  </div>`;

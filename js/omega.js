import { loadOmega, esc } from './data.js';
import { construirLeaderboard } from './omega-calc.js';

const perfilOmega = (id) => `https://tournament.duelistsunite.org/#/profile/${encodeURIComponent(id)}`;

function nombreHtml(p) {
  const nombre = esc(p.nombre || '—');
  return p.nombreButa
    ? `<a href="jugador.html?nombre=${encodeURIComponent(p.nombreButa)}" class="truncate font-display font-bold italic text-white hover:text-primario-glow">${nombre}</a>`
    : `<span class="block truncate font-display font-bold italic text-white">${nombre}</span>`;
}

function filaHtml(p) {
  return `
    <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-borde px-4 py-3 first:border-t-0">
      <span class="w-6 shrink-0 text-center font-display text-sm font-bold text-humo">${p.puesto}</span>
      <div class="min-w-0">
        ${nombreHtml(p)}
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs text-humo">
          <span class="rounded-full px-2 py-0.5 font-semibold ${p.tier.clase}">${p.tier.nombre}</span>
          ${p.winRate == null ? '' : `<span>${p.winRate}% WR</span>`}
          <span>${p.wins}–${p.loses}${p.draws ? `–${p.draws}` : ''}</span>
          <a href="${perfilOmega(p.id)}" target="_blank" rel="noopener noreferrer" class="text-primario-glow hover:underline">Omega ↗</a>
        </div>
      </div>
      <span class="shrink-0 font-display text-xl font-bold text-primario-glow">${p.rating}</span>
    </div>`;
}

const cont = document.getElementById('leaderboard');
try {
  const jugadores = construirLeaderboard(await loadOmega());
  cont.innerHTML = jugadores.length
    ? `<div class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">${jugadores.map(filaHtml).join('')}</div>`
    : '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-10 text-center font-body text-humo shadow-card">Todavía no hay jugadores cargados.</p>';
} catch {
  cont.innerHTML = '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-10 text-center font-body text-humo shadow-card">No se pudieron cargar los datos. Probá recargar.</p>';
}

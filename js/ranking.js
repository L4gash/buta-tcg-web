import { loadRanking, filtrarRanking, esc } from './data.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const colorPos = { 1: 'text-oro', 2: 'text-[#c0c4d8]', 3: 'text-[#cd7f32]' };

function fila(r) {
  const pos = Number(r.Pos);
  const medalla = MEDALLAS[pos] ?? '';
  const colPos = colorPos[pos] ?? 'text-humo';
  const oro = pos === 1 ? 'border-oro/50 bg-gradient-to-r from-oro/10 to-transparent' : 'border-borde';
  const pl = esc(r['PL Totales'] ?? '0');
  const torneos = esc(r['Torneos Jugados'] ?? '');
  const fecha = esc(r['Ultima fecha'] ?? '');
  const nombre = esc(r.Jugador ?? '');
  const subline = `${torneos ? `${torneos} torneos` : ''}${torneos && fecha ? ' · ' : ''}${fecha ? `últ. ${fecha}` : ''}`;

  // Escritorio: fila en grilla de 5 columnas. Celular: tarjeta (las columnas TORN./FECHA se ocultan).
  return `
    <div role="row" class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 border-t ${oro} px-3 py-3 sm:grid-cols-[3rem_1fr_5rem_6rem_7rem]">
      <span role="cell" class="font-display text-lg font-bold ${colPos}">${medalla}${pos || ''}</span>
      <span role="cell" class="min-w-0 truncate font-display font-bold italic text-white">${nombre}</span>
      <span role="cell" class="text-right font-display text-xl font-bold text-primario-glow sm:text-center sm:text-base">${pl}<span class="ml-1 font-body text-[0.6rem] font-normal text-humo sm:hidden">PL</span></span>
      <span role="cell" class="hidden text-center font-body text-sm text-humo sm:block">${torneos}</span>
      <span role="cell" class="hidden text-right font-body text-sm text-humo sm:block">${fecha}</span>
      ${subline ? `<span role="cell" class="col-span-2 -mt-1 font-body text-[0.7rem] text-humo sm:hidden">${subline}</span>` : ''}
    </div>`;
}

function render(rows) {
  const cont = $('tabla-ranking');
  if (!cont) return;
  if (!rows.length) {
    cont.innerHTML = '<p class="text-center font-body text-humo">Todavía no hay puntos cargados.</p>';
    return;
  }
  cont.innerHTML = `
    <div role="table" aria-label="Tabla de posiciones de la liga" class="overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">
      <div role="row" class="grid grid-cols-[2.5rem_1fr_auto] gap-x-3 bg-noche/60 px-3 py-2 font-body text-[0.65rem] uppercase tracking-widest text-humo sm:grid-cols-[3rem_1fr_5rem_6rem_7rem]">
        <span role="columnheader">#</span>
        <span role="columnheader">Jugador</span>
        <span role="columnheader" class="text-right sm:text-center">PL</span>
        <span role="columnheader" class="hidden text-center sm:block">Torn.</span>
        <span role="columnheader" class="hidden text-right sm:block">Últ. fecha</span>
      </div>
      ${rows.map(fila).join('')}
    </div>`;
}

render(filtrarRanking(await loadRanking()));

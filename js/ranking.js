import { loadRanking, filtrarRanking, esc } from './data.js';
import { coincideJugador, filtrarPorNombre } from './buscar.js';
import { leerPerfilGuardado } from './perfil.js';
import { zonaDe } from './ranking-zonas.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const colorPos = { 1: 'text-oro', 2: 'text-[#c0c4d8]', 3: 'text-[#cd7f32]' };

const BORDE_ZONA = {
  clasifica: 'border-oro/50 bg-gradient-to-r from-oro/10 to-transparent',
  repechaje: 'border-violeta/50 bg-gradient-to-r from-violeta/10 to-transparent',
};

// Nombre guardado tras una inscripción exitosa (para resaltar "tu" fila).
let nombrePerfil = '';

function fila(r) {
  const pos = Number(r.Pos);
  const medalla = MEDALLAS[pos] ?? '';
  const colPos = colorPos[pos] ?? 'text-humo';
  const esVos = coincideJugador(r.Jugador, nombrePerfil);
  const zona = BORDE_ZONA[zonaDe(pos)] ?? 'border-borde';
  const borde = esVos ? 'border-primario/60 bg-gradient-to-r from-primario/15 to-transparent' : zona;
  const pl = esc(r['PL Totales'] || '0');
  const torneos = esc(r['Torneos Jugados'] ?? '');
  const fecha = esc(r['Ultima fecha'] ?? '');
  const nombre = esc(r.Jugador ?? '');
  const chipVos = esVos ? ' <span class="ml-1 rounded-full bg-primario/20 px-2 py-0.5 font-body text-[0.6rem] font-bold uppercase tracking-wider text-primario-glow">vos</span>' : '';
  const subline = `${torneos ? `${torneos} torneos` : ''}${torneos && fecha ? ' · ' : ''}${fecha ? `últ. ${fecha}` : ''}`;

  // Escritorio: fila en grilla de 5 columnas. Celular: tarjeta (las columnas TORN./FECHA se ocultan).
  return `
    <div role="row" ${esVos ? 'id="fila-vos"' : ''} class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 border-t ${borde} px-3 py-3 sm:grid-cols-[3rem_1fr_5rem_6rem_7rem]">
      <span role="cell" class="font-display text-lg font-bold ${colPos}">${medalla}${pos || ''}</span>
      <span role="cell" class="min-w-0 truncate font-display font-bold italic"><a href="jugador.html?nombre=${encodeURIComponent(r.Jugador ?? '')}" class="text-white hover:text-primario-glow">${nombre}</a>${chipVos}</span>
      <span role="cell" class="text-right font-display text-xl font-bold text-primario-glow sm:text-center sm:text-base">${pl}<span class="ml-1 font-body text-[0.6rem] font-normal text-humo sm:hidden">PL</span></span>
      <span role="cell" class="hidden text-center font-body text-sm text-humo sm:block">${torneos}</span>
      <span role="cell" class="hidden text-right font-body text-sm text-humo sm:block">${fecha}</span>
      ${subline ? `<span role="cell" class="col-span-2 -mt-1 font-body text-[0.7rem] text-humo sm:hidden">${subline}</span>` : ''}
    </div>`;
}

function tablaHtml(rows) {
  if (!rows.length) {
    return '<p class="rounded-2xl border border-borde bg-tinta/70 px-4 py-8 text-center font-body text-humo shadow-card">No encontramos ese nombre en el ranking.</p>';
  }
  return `
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

function init(rows) {
  const cont = $('tabla-ranking');
  if (!cont) return;
  if (!rows.length) {
    cont.innerHTML = '<p class="text-center font-body text-humo">Todavía no hay puntos cargados.</p>';
    return;
  }

  nombrePerfil = leerPerfilGuardado(localStorage.getItem('buta_jugador'))?.nombre ?? '';
  const estasEnLaTabla = rows.some((r) => coincideJugador(r.Jugador, nombrePerfil));

  // El buscador vive fuera de la tabla: al filtrar solo se re-renderiza el
  // cuerpo, así el input no pierde el foco mientras el jugador escribe.
  cont.innerHTML = `
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <label for="buscar-jugador" class="sr-only">Buscar jugador</label>
      <input id="buscar-jugador" type="search" placeholder="🔍 Buscá tu nombre…" autocomplete="off"
        class="min-w-0 flex-1 rounded-lg border border-borde bg-tinta px-4 py-2.5 font-body text-sm text-white placeholder-humo/80 focus:border-primario" />
      ${estasEnLaTabla ? '<button type="button" id="ir-a-vos" class="shrink-0 rounded-full border border-primario/50 px-4 py-2 font-body text-sm font-semibold text-primario-glow hover:bg-primario/10">Mi posición ↓</button>' : ''}
    </div>
    <div id="cuerpo-ranking">${tablaHtml(rows)}</div>`;

  $('buscar-jugador').addEventListener('input', (e) => {
    $('cuerpo-ranking').innerHTML = tablaHtml(filtrarPorNombre(rows, e.target.value));
  });
  $('ir-a-vos')?.addEventListener('click', () => {
    document.getElementById('fila-vos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

init(filtrarRanking(await loadRanking()));

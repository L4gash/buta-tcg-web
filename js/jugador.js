// Página de perfil: historial de torneos y puntos de un jugador.
// Se llega con jugador.html?nombre=... (desde el ranking) o, sin parámetro,
// con el perfil guardado tras una inscripción.
import { loadResultados, loadRanking, groupResultados, filtrarRanking, esc } from './data.js';
import { nombreDesdeParams, historialDe, estadisticasDe } from './historial.js';
import { coincideJugador } from './buscar.js';
import { leerPerfilGuardado } from './perfil.js';

const $ = (id) => document.getElementById(id);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function sinJugador() {
  $('perfil-jugador').innerHTML = `
    <div class="rounded-2xl border border-borde bg-tinta/70 p-8 text-center shadow-card">
      <p class="font-display text-xl font-bold italic text-white">¿De quién es este perfil?</p>
      <p class="mt-3 font-body leading-[1.7] text-humo">Entrá desde el <a href="ranking.html" class="text-primario-glow underline hover:opacity-80">ranking</a> tocando tu nombre, o inscribite a un torneo para que el sitio te recuerde.</p>
    </div>`;
}

function chip(valor, etiqueta) {
  return `
    <div class="rounded-2xl border border-borde bg-tinta/70 px-4 py-3 text-center shadow-card">
      <p class="font-display text-2xl font-bold text-primario-glow">${valor}</p>
      <p class="mt-1 font-body text-xs uppercase tracking-widest text-humo">${etiqueta}</p>
    </div>`;
}

function filaFecha(h) {
  const pos = Number(h.puesto);
  const medalla = MEDALLAS[pos] ?? `#${esc(h.puesto)}`;
  const deck = String(h.deck ?? '').trim();
  const conDeck = deck && deck !== '—';
  return `
    <div class="flex items-center gap-3 border-t border-borde px-4 py-3">
      <span class="w-10 shrink-0 text-center font-display text-lg font-bold ${pos === 1 ? 'text-oro' : 'text-white'}">${medalla}</span>
      <span class="min-w-0 flex-1 truncate font-body text-sm text-white">${esc(h.torneo)}</span>
      ${conDeck ? `<span class="shrink-0 rounded-full bg-primario/15 px-3 py-1 font-body text-xs font-semibold text-primario-glow">${esc(deck)}</span>` : ''}
    </div>`;
}

async function compartir(nombre) {
  const url = location.href;
  const texto = `Mirá el historial de ${nombre} en la liga de BUTA TCG`;
  try {
    if (navigator.share) await navigator.share({ title: texto, url });
    else {
      await navigator.clipboard.writeText(url);
      const btn = $('btn-compartir');
      const original = btn.textContent;
      btn.textContent = '✓ Link copiado';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }
  } catch { /* compartir cancelado: nada que hacer */ }
}

const nombre = nombreDesdeParams(location.search)
  || leerPerfilGuardado(localStorage.getItem('buta_jugador'))?.nombre
  || '';

if (!nombre) {
  sinJugador();
} else {
  document.title = `${nombre} — BUTA TCG`;
  try {
    const [resultados, rankingRows] = await Promise.all([loadResultados(), loadRanking()]);
    const historial = historialDe(nombre, groupResultados(resultados));
    const stats = estadisticasDe(historial);
    const ranking = filtrarRanking(rankingRows);
    const filaRanking = ranking.find((r) => coincideJugador(r.Jugador, nombre));
    // El nombre "oficial" es el del ranking si existe (lo escribe la organización).
    const nombreMostrar = filaRanking?.Jugador ?? nombre;

    if (!historial.length && !filaRanking) {
      $('perfil-jugador').innerHTML = `
        <div class="rounded-2xl border border-borde bg-tinta/70 p-8 text-center shadow-card">
          <p class="font-display text-xl font-bold italic text-white">Todavía no hay datos de ${esc(nombreMostrar)}</p>
          <p class="mt-3 font-body leading-[1.7] text-humo">Cuando juegue una fecha de la liga, su historial va a aparecer acá. Mirá el <a href="ranking.html" class="text-primario-glow underline hover:opacity-80">ranking completo</a>.</p>
        </div>`;
    } else {
      const chips = [
        filaRanking ? chip(`#${esc(filaRanking.Pos)}`, 'Ranking') : '',
        filaRanking ? chip(esc(filaRanking['PL Totales'] ?? '0'), 'Puntos de liga') : '',
        chip(stats.campeonatos, stats.campeonatos === 1 ? 'Campeonato' : 'Campeonatos'),
        chip(stats.podios, 'Podios'),
      ].filter(Boolean).join('');

      $('perfil-jugador').innerHTML = `
        <div class="text-center">
          <p class="font-display text-xs font-semibold uppercase tracking-[0.3em] text-violeta-glow">Perfil de jugador</p>
          <h1 class="texto-neon mt-3 font-display text-3xl font-bold italic text-white sm:text-5xl" style="letter-spacing:-0.03em;">${esc(nombreMostrar)}</h1>
          <button type="button" id="btn-compartir" class="mt-5 rounded-full border border-primario/50 px-5 py-2 font-body text-sm font-semibold text-primario-glow hover:bg-primario/10">Compartir perfil</button>
        </div>
        <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">${chips}</div>
        <section aria-label="Historial de tops" class="mt-8">
          <h2 class="font-display text-xl font-bold italic text-white" style="letter-spacing:-0.03em;">Tops en la liga</h2>
          ${historial.length
            ? `<div class="mt-4 overflow-hidden rounded-2xl border border-borde bg-tinta/70 shadow-card">${[...historial].reverse().map(filaFecha).join('')}</div>`
            : '<p class="mt-4 font-body text-humo">Todavía sin tops registrados — los puntos de liga también suman jugando.</p>'}
        </section>`;
      $('btn-compartir').addEventListener('click', () => compartir(nombreMostrar));
    }
  } catch {
    $('perfil-jugador').innerHTML = '<p class="text-center font-body text-humo">No se pudieron cargar los datos. Probá de nuevo en unos segundos.</p>';
  }
}

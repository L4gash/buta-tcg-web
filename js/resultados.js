import { loadResultados, groupResultados, esc, tieneFoto, deckVisible } from './data.js';
import { contarDecks } from './meta-decks.js';
import { extraerFechaCorta } from './fecha-torneo.js';
import { coincideTexto } from './buscar.js';

const $ = (id) => document.getElementById(id);
const src = (foto) => {
  const f = String(foto ?? '').trim();
  return f.includes('/') ? f : `assets/results/${f}`;
};
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function tarjeta(r, destacada = false) {
  const medalla = MEDALLAS[Number(r.puesto)] ?? `#${esc(r.puesto)}`;
  const esCampeon = Number(r.puesto) === 1;
  const borde = esCampeon ? 'border-oro/60 shadow-glow-violeta' : 'border-borde shadow-card';
  const lineaDeck = deckVisible(r.deck)
    ? `<p class="font-body text-sm text-humo">Top ${esc(r.puesto)} · Deck: ${esc(r.deck)}</p>`
    : `<p class="font-body text-sm text-humo">Top ${esc(r.puesto)}</p>`;
  const nombreLinea = `<p class="font-display ${destacada ? 'text-xl' : 'text-base'} font-bold italic text-white">${medalla} ${esc(r.nombre)}</p>`;
  // En la tarjeta compacta la medalla ya va grande arriba, así que el nombre no la repite.
  const nombreSolo = `<p class="font-display ${destacada ? 'text-xl' : 'text-base'} font-bold italic text-white">${esc(r.nombre)}</p>`;

  // Con foto: tarjeta interactiva con imagen + lightbox (igual que hoy).
  if (tieneFoto(r)) {
    const altText = `Decklist de ${esc(r.nombre)} (Top ${esc(r.puesto)})`;
    return `
      <button type="button" data-foto="${esc(src(r.foto))}" data-alt="${altText}"
        class="tarjeta-resultado group block w-full rounded-2xl border ${borde} bg-tinta/70 p-3 text-left hover:border-primario">
        <div class="foto-marco ${destacada ? 'h-72 sm:h-96' : 'h-56'} rounded-xl">
          <img src="${esc(src(r.foto))}" alt="${altText}" loading="${destacada ? 'eager' : 'lazy'}"${destacada ? ' fetchpriority="high"' : ''} class="h-full w-full rounded-xl object-cover object-top" />
        </div>
        <div class="px-2 pb-1 pt-3">
          ${nombreLinea}
          ${lineaDeck}
        </div>
      </button>`;
  }

  // Sin foto: tarjeta compacta NO interactiva (sin imagen, sin lightbox).
  return `
    <div class="rounded-2xl border ${borde} bg-tinta/70 ${destacada ? 'p-6' : 'p-4'} text-center">
      <p class="font-display ${destacada ? 'text-3xl' : 'text-2xl'} leading-none">${medalla}</p>
      <div class="mt-2">
        ${nombreSolo}
        ${lineaDeck}
      </div>
    </div>`;
}

function render(resultados) {
  const podio = resultados.filter((r) => Number(r.puesto) <= 3);
  const resto = resultados.filter((r) => Number(r.puesto) > 3);
  $('podio').innerHTML = `
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div class="sm:col-span-2 lg:col-span-1 lg:order-2">${podio[0] ? tarjeta(podio[0], true) : ''}</div>
      <div class="lg:order-1 lg:self-center">${podio[1] ? tarjeta(podio[1]) : ''}</div>
      <div class="lg:order-3 lg:self-center">${podio[2] ? tarjeta(podio[2]) : ''}</div>
    </div>`;
  $('grilla-top').innerHTML = resto.length
    ? `<h2 class="font-display text-xl font-bold italic text-white" style="letter-spacing:-0.03em;">Top ${podio.length + 1}–${resultados.length}</h2>
       <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">${resto.map((r) => tarjeta(r)).join('')}</div>`
    : '';
}

// Barras del meta: una sola serie (cantidad de tops por deck), un solo tono de
// marca — la magnitud la lleva el largo de la barra, no el color. Cada valor va
// etiquetado directo (nombre a la izquierda, cantidad y % a la derecha).
function renderMeta(todas) {
  const decks = contarDecks(todas);
  if (!decks.length) return; // sin datos de deck: la sección queda oculta
  const maxPct = decks[0].pct || 1;
  $('meta-barras').innerHTML = decks.map((d) => `
    <div class="flex items-center gap-3 py-1.5" title="${esc(d.deck)}: ${d.cantidad} ${d.cantidad === 1 ? 'top' : 'tops'} (${d.pct}%)">
      <span class="w-28 shrink-0 truncate text-right font-body text-sm ${d.deck === 'Otros' ? 'text-humo' : 'text-white'} sm:w-44">${esc(d.deck)}</span>
      <span class="min-w-0 flex-1"><span class="block h-2.5 min-w-[4px] rounded-full ${d.deck === 'Otros' ? 'bg-primario/30' : 'bg-primario'}" style="width:${Math.max(2, Math.round((d.pct / maxPct) * 100))}%"></span></span>
      <span class="w-16 shrink-0 text-right font-body text-sm tabular-nums text-humo"><strong class="font-semibold text-white">${d.cantidad}</strong> · ${d.pct}%</span>
    </div>`).join('');
  $('meta-decks').hidden = false;
}

const CLASE_TARJETA_BASE = 'carta-fecha shrink-0 snap-center rounded-2xl border px-4 py-2.5 text-center';
const CLASE_NO_SELECCIONADA = 'border-borde bg-tinta/70 shadow-card';
const CLASE_SELECCIONADA = 'border-primario/60 bg-primario/10 shadow-glow-azul';

function tarjetaFecha(nombreTorneo) {
  const { corta, anio } = extraerFechaCorta(nombreTorneo);
  return `
    <button type="button" class="${CLASE_TARJETA_BASE} ${CLASE_NO_SELECCIONADA}" data-torneo="${esc(nombreTorneo)}" aria-current="false" title="${esc(nombreTorneo)}">
      <span class="block font-display text-lg font-bold italic text-white">${esc(corta)}</span>
      ${anio ? `<span class="block font-body text-[0.65rem] text-humo">${esc(anio)}</span>` : ''}
    </button>`;
}

const todas = await loadResultados();
const grupos = groupResultados(todas);
const nombres = Object.keys(grupos);

if (!nombres.length) {
  $('podio').innerHTML = '<p class="text-center font-body text-humo">Todavía no hay resultados cargados.</p>';
} else {
  const carrusel = $('carrusel-fechas');
  // Más reciente primero (a la izquierda): es la fecha que el jugador quiere
  // ver sin tener que scrollear. `nombres` viene viejo→nuevo del CSV.
  const recienteAViejo = nombres.slice().reverse();
  carrusel.innerHTML = recienteAViejo.map(tarjetaFecha).join('');

  let actual = nombres.at(-1); // la más reciente, igual que el comportamiento anterior

  function marcarSeleccion(nombreTorneo) {
    carrusel.querySelectorAll('.carta-fecha').forEach((c) => {
      const seleccionada = c.dataset.torneo === nombreTorneo;
      c.setAttribute('aria-current', seleccionada ? 'true' : 'false');
      c.className = `${CLASE_TARJETA_BASE} ${seleccionada ? CLASE_SELECCIONADA : CLASE_NO_SELECCIONADA}`;
    });
  }

  function seleccionar(nombreTorneo) {
    actual = nombreTorneo;
    render(grupos[nombreTorneo]);
    marcarSeleccion(nombreTorneo);
  }

  seleccionar(actual);

  // Delegado: las tarjetas nunca se re-renderizan tras el build inicial (así
  // el buscador solo oculta/muestra sin resetear el scroll horizontal).
  carrusel.addEventListener('click', (e) => {
    const btn = e.target.closest('.carta-fecha');
    if (btn) seleccionar(btn.dataset.torneo);
  });

  $('carrusel-izq').addEventListener('click', () => carrusel.scrollBy({ left: -220, behavior: 'smooth' }));
  $('carrusel-der').addEventListener('click', () => carrusel.scrollBy({ left: 220, behavior: 'smooth' }));

  $('buscar-fecha').addEventListener('input', (e) => {
    const consulta = e.target.value;
    let algunaVisible = false;
    let seleccionVisible = false;
    carrusel.querySelectorAll('.carta-fecha').forEach((c) => {
      const visible = coincideTexto(c.dataset.torneo, consulta);
      c.hidden = !visible;
      if (visible) {
        algunaVisible = true;
        if (c.dataset.torneo === actual) seleccionVisible = true;
      }
    });
    $('sin-fechas').classList.toggle('hidden', algunaVisible);
    if (algunaVisible && !seleccionVisible) {
      const primeraVisible = carrusel.querySelector('.carta-fecha:not([hidden])');
      if (primeraVisible) seleccionar(primeraVisible.dataset.torneo);
    }
  });

  renderMeta(todas);
}

let ultimaTarjeta = null;
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.tarjeta-resultado');
  if (!btn) return;
  ultimaTarjeta = btn;
  $('lightbox-img').src = btn.dataset.foto;
  $('lightbox-img').alt = btn.dataset.alt || '';
  $('lightbox').classList.replace('hidden', 'flex');
  $('cerrar-lightbox').focus();
});

const cerrar = () => {
  $('lightbox').classList.replace('flex', 'hidden');
  ultimaTarjeta?.focus();
};
$('cerrar-lightbox').addEventListener('click', cerrar);
$('lightbox').addEventListener('click', (e) => { if (e.target === $('lightbox')) cerrar(); });
document.addEventListener('keydown', (e) => {
  if ($('lightbox').classList.contains('hidden')) return;
  if (e.key === 'Escape') cerrar();
  // Trampa de foco: el único elemento enfocable del diálogo es el botón cerrar;
  // sin esto, Tab se escapa a la página de fondo con el modal abierto.
  if (e.key === 'Tab') { e.preventDefault(); $('cerrar-lightbox').focus(); }
});

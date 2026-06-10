import { loadResultados, groupResultados, esc } from './data.js';

const $ = (id) => document.getElementById(id);
const src = (foto) => (foto.includes('/') ? foto : `assets/results/${foto}`);
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function tarjeta(r, destacada = false) {
  const medalla = MEDALLAS[Number(r.puesto)] ?? `#${esc(r.puesto)}`;
  const borde = Number(r.puesto) === 1 ? 'border-oro/60 shadow-glow-violeta' : 'border-borde shadow-card';
  return `
    <button type="button" data-foto="${esc(src(r.foto))}" data-nombre="${esc(r.nombre)}"
      class="tarjeta-resultado group block w-full rounded-2xl border ${borde} bg-tinta/70 p-3 text-left hover:border-primario">
      <div class="foto-marco ${destacada ? 'h-72 sm:h-96' : 'h-56'} rounded-xl">
        <img src="${esc(src(r.foto))}" alt="Decklist de ${esc(r.nombre)}" loading="lazy" class="h-full w-full rounded-xl object-cover object-top" />
      </div>
      <div class="px-2 pb-1 pt-3">
        <p class="font-display ${destacada ? 'text-xl' : 'text-base'} font-bold italic text-white">${medalla} ${esc(r.nombre)}</p>
        <p class="font-body text-sm text-humo">Top ${esc(r.puesto)} · Deck: ${esc(r.deck)}</p>
      </div>
    </button>`;
}

function render(resultados) {
  const podio = resultados.filter((r) => Number(r.puesto) <= 3);
  const resto = resultados.filter((r) => Number(r.puesto) > 3);
  $('podio').innerHTML = `
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div class="sm:col-span-2 lg:col-span-1 lg:order-2">${podio[0] ? tarjeta(podio[0], true) : ''}</div>
      <div class="lg:order-1 lg:self-end">${podio[1] ? tarjeta(podio[1]) : ''}</div>
      <div class="lg:order-3 lg:self-end">${podio[2] ? tarjeta(podio[2]) : ''}</div>
    </div>`;
  $('grilla-top').innerHTML = resto.length
    ? `<h2 class="font-display text-xl font-bold italic text-white" style="letter-spacing:-0.03em;">Top ${podio.length + 1}–${resultados.length}</h2>
       <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">${resto.map((r) => tarjeta(r)).join('')}</div>`
    : '';
  for (const btn of document.querySelectorAll('.tarjeta-resultado')) {
    btn.addEventListener('click', () => {
      $('lightbox-img').src = btn.dataset.foto;
      $('lightbox-img').alt = `Decklist de ${btn.dataset.nombre}`;
      $('lightbox').classList.replace('hidden', 'flex');
    });
  }
}

const grupos = groupResultados(await loadResultados());
const nombres = Object.keys(grupos);
const sel = $('selector-torneo');

if (!nombres.length) {
  $('podio').innerHTML = '<p class="text-center font-body text-humo">Todavía no hay resultados cargados.</p>';
} else {
  sel.innerHTML = nombres.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  sel.value = nombres.at(-1);
  render(grupos[sel.value]);
  sel.addEventListener('change', () => render(grupos[sel.value]));
}

const cerrar = () => $('lightbox').classList.replace('flex', 'hidden');
$('cerrar-lightbox').addEventListener('click', cerrar);
$('lightbox').addEventListener('click', (e) => { if (e.target === $('lightbox')) cerrar(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });

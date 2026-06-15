import { loadResultados, groupResultados, esc, tieneFoto, deckVisible } from './data.js';

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
  if (e.key === 'Escape' && !$('lightbox').classList.contains('hidden')) cerrar();
});

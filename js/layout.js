// Header y footer compartidos por las 5 páginas. Una sola fuente de verdad:
// evita que el nav o el footer diverjan entre archivos (ya pasó con HTML viejo cacheado).
// Las páginas traen <header id="site-header"> y <footer id="site-footer"> vacíos
// (con sus clases de estilo) y este módulo los rellena al cargar.

export const PAGINAS = [
  { archivo: 'index.html', etiqueta: 'Inicio' },
  { archivo: 'torneos.html', etiqueta: 'Torneos' },
  { archivo: 'resultados.html', etiqueta: 'Resultados' },
  { archivo: 'ranking.html', etiqueta: 'Ranking' },
  { archivo: 'jugadores.html', etiqueta: 'Jugadores' },
  { archivo: 'nosotros.html', etiqueta: 'Nosotros' },
];

// Páginas que no están en el nav pero "pertenecen" a una sección de él.
const ALIAS = { 'jugador.html': 'jugadores.html' };

// Link externo del nav: la web de pedidos de cartas la administra otra
// persona (Mariano), fuera de este repo. No es una página del sitio, así
// que nunca lleva aria-current y abre en pestaña nueva.
const ENLACE_PEDIDOS = { href: 'https://marianocbt.github.io/butatcg/', etiqueta: 'Pedidos' };

// Nombre de archivo literal a partir del pathname (sin resolver alias).
// Funciona en local y en GitHub Pages con prefijo /buta-tcg-web/.
function archivoDesdePath(pathname) {
  return String(pathname ?? '').split('/').pop() || 'index.html';
}

// Resuelve qué página está activa a partir del pathname. Desconocido o raíz => index.
export function paginaActiva(pathname) {
  const archivo = archivoDesdePath(pathname);
  if (ALIAS[archivo]) return ALIAS[archivo];
  return PAGINAS.some((p) => p.archivo === archivo) ? archivo : 'index.html';
}

// A dónde vuelve la flecha "atrás" de cada página (siempre el archivo literal,
// nunca el alias): jugador.html es el perfil individual, así que vuelve al
// directorio de Jugadores en vez de al inicio. index.html no lleva flecha
// porque ya es el inicio.
const VOLVER = { 'jugador.html': { href: 'jugadores.html', etiqueta: 'Jugadores' } };
const VOLVER_POR_DEFECTO = { href: 'index.html', etiqueta: 'Inicio' };

export function flechaVolverHtml(archivo) {
  if (archivo === 'index.html') return '';
  const { href, etiqueta } = VOLVER[archivo] ?? VOLVER_POR_DEFECTO;
  return `<a href="${href}" class="inline-flex items-center gap-1.5 font-body text-sm text-humo hover:text-primario-glow">← ${etiqueta}</a>`;
}

// Las 7 entradas del nav (6 páginas + Pedidos) en orden final, marcando cuál
// está activa. Pedidos va justo después de Jugadores y nunca es "activa"
// (no es una página del sitio: la administra Mariano, fuera de este repo).
function itemsNav(activa) {
  return PAGINAS.flatMap(({ archivo, etiqueta }) => {
    const item = { href: archivo, etiqueta, esActiva: archivo === activa, externo: false };
    return archivo === 'jugadores.html'
      ? [item, { href: ENLACE_PEDIDOS.href, etiqueta: ENLACE_PEDIDOS.etiqueta, esActiva: false, externo: true }]
      : [item];
  });
}

function linkHtml({ href, etiqueta, esActiva, externo }, clase) {
  const atributos = externo ? ' target="_blank" rel="noopener noreferrer"' : (esActiva ? ' aria-current="page"' : '');
  return `<a href="${href}"${atributos} class="${clase(esActiva)}">${etiqueta}</a>`;
}

// Nav de escritorio (fila horizontal, sm+) y menú de celular (botón
// hamburguesa + panel desplegable a pantalla completa, debajo de sm). Con 7
// entradas ya no entran en una fila en celular sin desbordar ni achicar los
// botones por debajo del tamaño táctil mínimo — de ahí el menú aparte.
export function navHtml(activa) {
  const items = itemsNav(activa);

  const linksEscritorio = items
    .map((item) => linkHtml(item, (esActiva) => `rounded-md px-2 py-2.5 ${esActiva ? 'text-white' : 'text-humo'} hover:text-primario-glow sm:px-3`))
    .join('');

  const linksMovil = items
    .map((item) => linkHtml(item, (esActiva) => `block border-t border-borde/60 px-4 py-3.5 font-body text-base ${esActiva ? 'text-white' : 'text-humo'} hover:bg-noche/60`))
    .join('');

  return `
    <nav class="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Principal">
      <a href="index.html" class="flex shrink-0 items-center gap-2 hover:opacity-80">
        <img src="assets/logo-butatcg.png" alt="Logo BUTA TCG" class="h-9 w-9 object-contain" />
        <span class="whitespace-nowrap font-display text-lg font-bold italic tracking-tight text-white">BUTA <span class="text-primario-glow">TCG</span></span>
      </a>

      <div class="hidden items-center font-body text-sm sm:flex sm:gap-2">${linksEscritorio}</div>

      <button type="button" id="btn-menu-movil" aria-expanded="false" aria-controls="menu-movil" aria-label="Abrir menú"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-2xl leading-none text-white hover:text-primario-glow sm:hidden">
        <span id="icono-menu-movil" aria-hidden="true">☰</span>
      </button>

      <div id="menu-movil" class="absolute inset-x-0 top-full hidden flex-col border-b border-borde/60 bg-noche/95 shadow-card backdrop-blur-md sm:hidden" role="menu">${linksMovil}</div>
    </nav>`;
}

export function footerHtml() {
  return `
    <div class="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center font-body text-sm text-humo">
      <a href="https://www.instagram.com/butatcg/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-full border border-borde bg-tinta px-5 py-2.5 font-semibold text-white shadow-card hover:border-primario hover:shadow-glow-azul">
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.3-.1-1.2-.1-1.6-.1-4.8s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.3-.4 1.2-.1 1.6-.1 4.8-.1zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.4-.6.7-.8 1.2-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.4.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.4.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm6.2-8.2a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z"/></svg>
        @butatcg
      </a>
      <p class="inline-flex flex-wrap items-center justify-center gap-2">
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
        <span>Comunidad en WhatsApp y Discord — pedí tu acceso por <a href="https://www.instagram.com/butatcg/" target="_blank" rel="noopener noreferrer" class="text-primario-glow underline hover:opacity-80">Instagram</a></span>
      </p>
      <p>© 2026 BUTA TCG · Torneos de Yu-Gi-Oh! Trading Card Game · Córdoba, Argentina</p>
      <p class="text-xs text-humo">Yu-Gi-Oh! es marca registrada de Konami. Este sitio no está afiliado a Konami.</p>
    </div>`;
}

// Inyección en el DOM (solo navegador; los tests importan las funciones puras).
if (typeof document !== 'undefined') {
  const archivo = archivoDesdePath(location.pathname);
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  const volver = document.getElementById('volver');
  if (header) header.innerHTML = navHtml(paginaActiva(location.pathname));
  if (footer) footer.innerHTML = footerHtml();
  if (volver) volver.innerHTML = flechaVolverHtml(archivo);

  // Menú de celular: botón hamburguesa que despliega el panel de links.
  const btnMenu = document.getElementById('btn-menu-movil');
  const menuMovil = document.getElementById('menu-movil');
  if (btnMenu && menuMovil) {
    const iconoMenu = document.getElementById('icono-menu-movil');
    const alternarMenu = (abrir) => {
      btnMenu.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      btnMenu.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
      if (iconoMenu) iconoMenu.textContent = abrir ? '✕' : '☰';
      menuMovil.classList.toggle('hidden', !abrir);
      menuMovil.classList.toggle('flex', abrir);
    };
    btnMenu.addEventListener('click', () => alternarMenu(menuMovil.classList.contains('hidden')));
    menuMovil.addEventListener('click', (e) => { if (e.target.closest('a')) alternarMenu(false); });
    document.addEventListener('click', (e) => {
      if (!menuMovil.classList.contains('hidden') && !menuMovil.contains(e.target) && e.target !== btnMenu && !btnMenu.contains(e.target)) {
        alternarMenu(false);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menuMovil.classList.contains('hidden')) alternarMenu(false);
    });
  }

  // PWA: el service worker da respaldo offline (network-first, ver sw.js).
  // Se registra al terminar la carga para no competir con el arranque.
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin SW se navega igual */ });
    });
  }
}

// Service worker de BUTA TCG — estrategia network-first con respaldo en caché.
//
// Por qué network-first para TODO: el sitio ya sufrió problemas de HTML/JS viejo
// cacheado durante deploys; con red disponible siempre se sirve lo último y la
// caché solo entra cuando no hay señal (el jugador camino al torneo). Los datos
// (CSV de la planilla) también quedan como "lo último que viste".
//
// Al deployar cambios del SW, subí la versión de CACHE para limpiar lo viejo.

const CACHE = 'buta-tcg-v1';

// Núcleo precacheado en la instalación: alcanza para abrir el sitio sin red.
const NUCLEO = [
  './',
  'index.html',
  'torneos.html',
  'resultados.html',
  'ranking.html',
  'nosotros.html',
  'jugador.html',
  '404.html',
  'css/tailwind.css',
  'css/custom.css',
  'assets/logo-butatcg.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return; // inscripciones (POST) van siempre a la red

  e.respondWith(
    fetch(request)
      .then((res) => {
        // Guardamos las respuestas buenas (incluye los CSV de la planilla, que
        // llegan con CORS) para tenerlas de respaldo sin señal.
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return res;
      })
      .catch(async () => {
        const cacheada = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
        if (cacheada) return cacheada;
        // Navegación sin red y sin caché de esa página: mejor el inicio que un error.
        if (request.mode === 'navigate') {
          const inicio = await caches.match('index.html');
          if (inicio) return inicio;
        }
        return Response.error();
      }),
  );
});

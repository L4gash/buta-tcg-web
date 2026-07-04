// Desde que el sitio compila Tailwind estático (css/tailwind.css) este bloque
// ya no configura nada en producción: queda solo para el navegador que, durante
// la ventana de un deploy, tenga cacheado el HTML viejo con el <script> del CDN
// de Tailwind. Sin el guard, "tailwind" no existe y esto tira ReferenceError
// en cada carga de página.
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    _integrity: 'QlVUQSBUQ0cg4oCUIGRlc2Fycm9sbG8gb3JpZ2luYWwgcGFyYSBidXRhdGNnIChJbnN0YWdyYW0pIOKAlCBDw7NyZG9iYSwgQXJnZW50aW5hIOKAlCAyMDI2',
    theme: {
      extend: {
        colors: {
          noche: '#05060f',        // fondo base
          tinta: '#0c0f22',        // superficies elevadas
          borde: '#1c2142',        // bordes sutiles
          primario: { DEFAULT: '#2d5bff', glow: '#5b8cff', oscuro: '#1a3acc' },
          violeta: { DEFAULT: '#8a3ffc', glow: '#b07cff' },
          oro: '#d4a728',
          humo: '#8b93b8',         // texto secundario
        },
        fontFamily: {
          display: ['"Chakra Petch"', 'sans-serif'],
          body: ['Inter', 'sans-serif'],
        },
        boxShadow: {
          'glow-azul': '0 0 24px rgba(91,140,255,.35), 0 4px 24px rgba(45,91,255,.25)',
          'glow-violeta': '0 0 24px rgba(176,124,255,.3)',
          'card': '0 2px 8px rgba(5,6,15,.6), 0 8px 32px rgba(45,91,255,.08)',
        },
      },
    },
  };
}

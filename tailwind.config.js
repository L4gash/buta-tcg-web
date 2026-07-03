// Config de Tailwind para el build estático (npm run build:css).
// Fuente de verdad del tema. js/theme.js conserva una copia legacy que usaba
// el CDN: sirve a navegadores con HTML viejo cacheado durante la ventana de
// deploy y no hace falta mantenerla al día.
export default {
  content: ['./*.html', './js/*.js'],
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

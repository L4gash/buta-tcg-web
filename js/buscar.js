// Normalización y búsqueda de nombres de jugador (ranking). Funciones puras.

// Minúsculas, sin tildes/diacríticos y sin espacios en los bordes.
export const normalizarNombre = (s) => String(s ?? '')
  .trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ¿Son la misma persona? (mejor esfuerzo: el nombre del ranking lo escribe la
// organización y puede diferir del que cargó el jugador al inscribirse).
export const coincideJugador = (a, b) => {
  const na = normalizarNombre(a);
  return na !== '' && na === normalizarNombre(b);
};

// Filtra filas del ranking por subcadena del nombre. Consulta vacía = todas.
export const filtrarPorNombre = (rows, consulta) => {
  const n = normalizarNombre(consulta);
  return n ? rows.filter((r) => normalizarNombre(r?.Jugador).includes(n)) : rows;
};

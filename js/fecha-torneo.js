// Extrae una fecha corta (dd/mm) y el año de un nombre de torneo en texto libre,
// para mostrarla en la tarjeta compacta del carrusel de fechas en Resultados.
// Los resultados no guardan una fecha estructurada por torneo — solo el nombre,
// que casi siempre la incluye como texto (ej. "Buta Córdoba 27/06 Avanzado 2026").
export function extraerFechaCorta(nombreTorneo) {
  const texto = String(nombreTorneo ?? '');
  const dm = texto.match(/(\d{1,2})\/(\d{1,2})/);
  const anio = texto.match(/(20\d{2})/);
  return {
    corta: dm ? `${dm[1].padStart(2, '0')}/${dm[2].padStart(2, '0')}` : '—',
    anio: anio ? anio[1] : '',
  };
}

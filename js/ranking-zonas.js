// Corte de fin de temporada: Top 8 clasifica directo al torneo de campeones;
// 9° a 16° quedan en zona de repechaje. Regla de la liga, no de la planilla.
// Función pura (sin DOM): la usa ranking.js y la testean en Node.
export const CORTE_CLASIFICA = 8;
export const CORTE_REPECHAJE = 16;

export function zonaDe(pos) {
  if (pos >= 1 && pos <= CORTE_CLASIFICA) return 'clasifica';
  if (pos > CORTE_CLASIFICA && pos <= CORTE_REPECHAJE) return 'repechaje';
  return null;
}

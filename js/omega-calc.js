// Cálculo puro del leaderboard de Omega (sin DOM ni fetch).
// Los datos vienen de la planilla "Omega" (la refresca el backend desde la API de Omega).

// Escalera de tiers por rating (tomada del cliente de YGO Omega). `clase` = color
// temático por tier; se escriben como strings literales para que el scanner de
// Tailwind los incluya al compilar css/tailwind.css.
const TIERS = [
  { min: 2000, nombre: 'Omega', clase: 'text-fuchsia-400 bg-fuchsia-400/10' },
  { min: 1450, nombre: 'Master', clase: 'text-violeta-glow bg-violeta/15' },
  { min: 1000, nombre: 'Diamond', clase: 'text-primario-glow bg-primario/15' },
  { min: 600, nombre: 'Platinum', clase: 'text-teal-300 bg-teal-300/10' },
  { min: 350, nombre: 'Gold', clase: 'text-oro bg-oro/15' },
  { min: 200, nombre: 'Silver', clase: 'text-slate-300 bg-slate-300/10' },
  { min: 50, nombre: 'Bronze', clase: 'text-amber-600 bg-amber-600/10' },
  { min: 0, nombre: 'Iron', clase: 'text-zinc-400 bg-zinc-400/10' },
];

export function tierDeRating(rating) {
  const r = Number(rating) || 0;
  return TIERS.find((t) => r >= t.min);
}

export function winRate(wins, loses) {
  const w = Number(wins) || 0;
  const l = Number(loses) || 0;
  if (w + l === 0) return null;
  return Math.round((w / (w + l)) * 1000) / 10; // 1 decimal
}

export function construirLeaderboard(rows) {
  return (rows ?? [])
    .filter((r) => String(r?.estado ?? '').trim().toLowerCase() === 'ok' && Number.isFinite(Number(r?.rating)))
    .map((r) => {
      const wins = Number(r.wins) || 0;
      const loses = Number(r.loses) || 0;
      const draws = Number(r.draws) || 0;
      const rating = Math.round(Number(r.rating));
      return {
        id: String(r.id ?? '').trim(),
        nombre: String(r.nombre ?? '').trim(),
        nombreButa: String(r.nombre_buta ?? '').trim(),
        rating,
        tier: tierDeRating(rating),
        winRate: winRate(wins, loses),
        wins,
        loses,
        draws,
        matches: wins + loses + draws,
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .map((p, i) => ({ ...p, puesto: i + 1 }));
}
